'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Package, MapPin, CreditCard, Truck, FileText, XCircle } from 'lucide-react'
import ProtectedRoute from '@/app/components/admin/ProtectedRoute'
import Layout from '@/app/components/admin/Layout'
import api from '@/app/lib/admin/api'
import { getMainProductImage, normalizeImageUrl } from '@/app/lib/admin/image-mapping'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'
import { getEnabledOrderStatusOptions } from '@/app/lib/order-statuses'
import CancelOrderModal from '@/app/components/admin/CancelOrderModal'
import { OrderDetailsSkeleton } from '@/app/components/ui/Skeletons'
import toast from 'react-hot-toast'

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially-paid', label: 'Partially Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partially-refunded', label: 'Partially Refunded' },
]

function processImageUrl(url: string): string {
  if (!url) return url
  url = normalizeImageUrl(url)
  if (url.startsWith('http')) return url
  if (!url.startsWith('/')) {
    url = `/${url}`
  }
  url = url.replace(/^\/\//, '/')
  if (url.includes(' ') && !url.includes('%20')) {
    const urlParts = url.split('/')
    const filename = urlParts[urlParts.length - 1]
    if (filename && filename.includes(' ')) {
      urlParts[urlParts.length - 1] = encodeURIComponent(filename)
      url = urlParts.join('/')
    }
  }
  return url
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'delivered':
    case 'fulfilled':
      return 'bg-green-100 text-green-800'
    case 'shipped':
      return 'bg-blue-100 text-blue-800'
    case 'processing':
    case 'confirmed':
      return 'bg-yellow-100 text-yellow-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    case 'refunded':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getPaymentStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'paid':
      return 'bg-green-100 text-green-800'
    case 'failed':
      return 'bg-red-100 text-red-800'
    case 'refunded':
    case 'partially-refunded':
      return 'bg-orange-100 text-orange-800'
    case 'partially-paid':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-yellow-100 text-yellow-800'
  }
}

function AdminOrderDetailsContent() {
  const { id } = useParams()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [enabledOrderStatuses, setEnabledOrderStatuses] = useState<string[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    orderStatus: '',
    paymentStatus: '',
    trackingNumber: '',
    estimatedDelivery: '',
    shippedAt: '',
    deliveredAt: '',
    notes: '',
    internalNotes: '',
  })

  const rawStatusOptions = getEnabledOrderStatusOptions(enabledOrderStatuses ?? undefined)
  const currentStatusValue = formData.orderStatus?.toLowerCase() || ''
  const hasCurrentInOptions = !!currentStatusValue && rawStatusOptions.some((o) => o.value === currentStatusValue)
  const orderStatusOptions = !currentStatusValue || hasCurrentInOptions
    ? rawStatusOptions
    : [...rawStatusOptions, { value: currentStatusValue, label: currentStatusValue.charAt(0).toUpperCase() + currentStatusValue.slice(1) }]

  const isPickupOrder = !!(
    order?.paymentMethod === 'cash_on_pickup' ||
    order?.payments?.[0]?.paymentMethod === 'cash_on_pickup' ||
    order?.preferredPickupDate
  )

  useEffect(() => {
    if (!order) return
    const orderStatus = order.orderStatus || order.status || ''
    const estimatedDelivery = order.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString().split('T')[0] : ''
    const shippedAt = order.shippedAt ? new Date(order.shippedAt).toISOString().split('T')[0] : ''
    const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt).toISOString().split('T')[0] : ''
    setFormData({
      orderStatus,
      paymentStatus: order.paymentStatus || '',
      trackingNumber: order.trackingNumber || '',
      estimatedDelivery,
      shippedAt,
      deliveredAt,
      notes: order.notes || '',
      internalNotes: order.internalNotes || '',
    })
  }, [order])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (formData.trackingNumber && formData.trackingNumber.length > 100) {
      newErrors.trackingNumber = 'Tracking number must be 100 characters or less'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !order) return
    try {
      setSaving(true)
      const orderId = order.id
      const updateData: any = {}
      if (formData.orderStatus && formData.orderStatus !== (order.orderStatus || order.status)) {
        updateData.orderStatus = formData.orderStatus
      }
      if (formData.paymentStatus && formData.paymentStatus !== order.paymentStatus) {
        updateData.paymentStatus = formData.paymentStatus
      }
      if (formData.trackingNumber !== (order.trackingNumber || '')) {
        updateData.trackingNumber = formData.trackingNumber || null
      }
      if (formData.estimatedDelivery) {
        const d = new Date(formData.estimatedDelivery)
        if (!isNaN(d.getTime())) updateData.estimatedDelivery = d.toISOString()
      } else if (order.estimatedDelivery && !formData.estimatedDelivery) updateData.estimatedDelivery = null
      if (formData.shippedAt) {
        const d = new Date(formData.shippedAt)
        if (!isNaN(d.getTime())) updateData.shippedAt = d.toISOString()
      } else if (order.shippedAt && !formData.shippedAt) updateData.shippedAt = null
      if (formData.deliveredAt) {
        const d = new Date(formData.deliveredAt)
        if (!isNaN(d.getTime())) updateData.deliveredAt = d.toISOString()
      } else if (order.deliveredAt && !formData.deliveredAt) updateData.deliveredAt = null
      if (formData.notes !== (order.notes || '')) updateData.notes = formData.notes || null
      if (formData.internalNotes !== (order.internalNotes || '')) updateData.internalNotes = formData.internalNotes || null
      if (Object.keys(updateData).length === 0) {
        toast.error('No changes to save')
        return
      }
      await api.updateOrder(orderId, updateData)
      toast.success('Order updated successfully')
      fetchOrder()
    } catch (err: any) {
      console.error('Error updating order:', err)
      toast.error(err.message || 'Failed to update order')
    } finally {
      setSaving(false)
    }
  }

  const fetchOrder = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const response = await api.getOrder(id as string)
      setOrder(response.data)
    } catch (error: any) {
      console.error('Error fetching order:', error)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      fetchOrder()
    }
  }, [id, fetchOrder])

  useEffect(() => {
    let mounted = true
    const loadStatusSettings = async () => {
      try {
        const settingsResponse = await api.getSettingsByCategory('general')
        if (!mounted) return
        const general = settingsResponse?.data || settingsResponse
        if (general && Array.isArray(general.enabledOrderStatuses)) {
          setEnabledOrderStatuses(general.enabledOrderStatuses)
        } else {
          setEnabledOrderStatuses(null)
        }
      } catch (error) {
        if (mounted) setEnabledOrderStatuses(null)
      }
    }
    loadStatusSettings()
    return () => { mounted = false }
  }, [])

  const canCancelOrder = () => {
    if (!order) return false
    if (['cancelled', 'shipped', 'delivered', 'fulfilled'].includes((order.orderStatus || order.status || '').toLowerCase())) {
      return false
    }
    return true
  }

  if (loading && !order) {
    return (
      <Layout currentPage="Orders" pageTitle="Order Details">
        <div className="p-4 sm:p-6">
          <OrderDetailsSkeleton />
        </div>
      </Layout>
    )
  }

  if (!order) {
    return (
      <Layout currentPage="Orders" pageTitle="Order Not Found">
        <div className="p-4 sm:p-6 flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Order not found</p>
            <Link
              href="/admin/orders"
              className="text-primary-600 hover:text-primary-700"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPage="Orders" pageTitle={`Order #${order.orderNumber || order.id}`}>
      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>

          <div className="bg-white rounded-lg shadow-[0_0_20px_0_rgba(0,0,0,0.1)] mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Order #{order.orderNumber || order.id}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.orderStatus || order.status || '')}`}>
                    {order.orderStatus || order.status || 'pending'}
                  </span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus || '')}`}>
                    {order.paymentStatus || 'pending'}
                  </span>
                  {canCancelOrder() && (
                    <button
                      onClick={() => setIsCancelModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel order
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Order Items */}
              <div className="mb-6">
                <div className="mb-4">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-[var(--shreeji-primary)]" />
                    <h2 className="text-xl font-semibold text-gray-900">Order Items</h2>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3 mb-4">
                  <div className="w-16 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700">Product</span>
                  </div>
                  <div className="text-center min-w-[100px]">
                    <span className="text-sm font-medium text-gray-700">Unit Price</span>
                  </div>
                  <div className="text-center min-w-[60px]">
                    <span className="text-sm font-medium text-gray-700">Quantity</span>
                  </div>
                  <div className="text-right min-w-[100px]">
                    <span className="text-sm font-medium text-gray-700">Total Price</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {order.orderItems && order.orderItems.length > 0 ? (
                    order.orderItems.map((item: any, index: number) => {
                      const product = item.product || item.productSnapshot || {}
                      let imageUrl: string | null = null
                      if (product.name) {
                        const mappedImageUrl = getMainProductImage(product.name)
                        if (mappedImageUrl && mappedImageUrl !== '/public/products/placeholder.png') {
                          imageUrl = mappedImageUrl
                        }
                      }
                      if (!imageUrl) {
                        const productImages = product.images || []
                        const mainImage = productImages.find((img: any) => img?.isMain) || productImages[0]
                        if (mainImage) {
                          if (typeof mainImage === 'string') imageUrl = mainImage
                          else if (mainImage?.url) imageUrl = mainImage.url
                        }
                      }
                      if (!imageUrl) imageUrl = product.imageUrl || null
                      if (imageUrl) imageUrl = processImageUrl(imageUrl)
                      const unitPrice = item.unitPrice || item.price || 0
                      const totalPrice = (item.quantity || 1) * unitPrice
                      const variantId = item.variantId || product.variantId
                      const variantAttributes = product.variantAttributes || product.attributes || item.variantAttributes || {}
                      const isVariant = !!variantId || Object.keys(variantAttributes).length > 0
                      const variantAttributesText = Object.entries(variantAttributes)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ') || null
                      const productSubtitle = variantAttributesText || (product.sku || 'Shreeji')
                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-4 px-4 py-5 ${isVariant ? 'bg-gray-50 pl-12 border-l-4 border-gray-300' : 'bg-white'}`}
                        >
                          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={product.name || 'Product'}
                                fill
                                className="object-cover"
                                unoptimized={imageUrl.startsWith('http') || imageUrl.startsWith('/products/')}
                                sizes="64px"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gray-200 text-xs text-gray-400">
                                No Image
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-base leading-tight">
                              {product.name || 'Product'}
                            </h3>
                            {isVariant && <p className="text-xs text-gray-400 mt-0.5 font-medium">Variant</p>}
                            <p className="text-sm text-gray-500 mt-0.5">{productSubtitle}</p>
                          </div>
                          <div className="text-center min-w-[100px]">
                            <p className="text-sm font-semibold text-gray-900">
                              {currencyFormatter(unitPrice, order.currency || 'ZMW')}
                            </p>
                          </div>
                          <div className="flex items-center justify-center min-w-[60px]">
                            <span className="text-sm font-medium text-gray-900">{item.quantity}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 text-base">
                              {currencyFormatter(totalPrice, order.currency || 'ZMW')}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-gray-500">No items found</p>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              {order.shippingAddress && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Address
                  </h2>
                  <div className="p-4 bg-[#f5f1e8] rounded-lg">
                    <p className="text-gray-900">
                      {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    </p>
                    <p className="text-gray-600">
                      {order.shippingAddress.addressLine1}
                      {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
                    </p>
                    <p className="text-gray-600">
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                    <p className="text-gray-600">{order.shippingAddress.country}</p>
                    {order.shippingAddress.phone && (
                      <p className="text-gray-600 mt-2">Phone: {order.shippingAddress.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tracking Information */}
              {order.trackingNumber && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Tracking Information
                  </h2>
                  <div className="p-4 bg-[#f5f1e8] rounded-lg">
                    <p className="text-gray-900">
                      <span className="font-medium">Tracking Number:</span> {order.trackingNumber}
                    </p>
                    {order.estimatedDelivery && (
                      <p className="text-gray-600 mt-2">
                        <span className="font-medium">Estimated Delivery:</span>{' '}
                        {new Date(order.estimatedDelivery).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                    {order.shippedAt && (
                      <p className="text-gray-600 mt-2">
                        <span className="font-medium">Shipped on:</span>{' '}
                        {new Date(order.shippedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                    {order.deliveredAt && (
                      <p className="text-green-600 mt-2">
                        <span className="font-medium">Delivered on:</span>{' '}
                        {new Date(order.deliveredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Details */}
              {order.payments && order.payments.length > 0 && (
                <div className="mb-6 border-t border-gray-200 pt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Details
                  </h2>
                  <div className="space-y-4">
                    {order.payments.map((payment: any, index: number) => {
                      const paymentMethodLabels: Record<string, string> = {
                        credit_card: 'Credit Card',
                        debit_card: 'Debit Card',
                        bank_transfer: 'Bank Transfer',
                        mobile_money: 'Mobile Money',
                        cash_on_delivery: 'Cash on Pickup',
                        cash_on_pickup: 'Cash on Pickup',
                      }
                      const paymentMethod = paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod || 'Unknown'
                      return (
                        <div key={payment.id || index} className="p-4 bg-[#f5f1e8] rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-gray-900">Payment {order.payments.length > 1 ? `#${index + 1}` : ''}</p>
                              <p className="text-sm text-gray-600 mt-1">Method: <span className="font-medium">{paymentMethod}</span></p>
                            </div>
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(payment.paymentStatus)}`}>
                              {payment.paymentStatus || 'pending'}
                            </span>
                          </div>
                          <div className="mt-3 space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Amount:</span>
                              <span className="font-medium text-gray-900">
                                {currencyFormatter(Number(payment.amount || 0), payment.currency || 'ZMW')}
                              </span>
                            </div>
                            {payment.transactionId && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Transaction ID:</span>
                                <span className="font-mono text-gray-900">{payment.transactionId}</span>
                              </div>
                            )}
                            {payment.processedAt && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Processed on:</span>
                                <span className="text-gray-900">
                                  {new Date(payment.processedAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {(!order.payments || order.payments.length === 0) && order.paymentStatus && (
                <div className="mb-6 border-t border-gray-200 pt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Information
                  </h2>
                  <div className="p-4 bg-[#f5f1e8] rounded-lg">
                    <p className="text-gray-600">
                      Payment status: <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 ${getPaymentStatusColor(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 mt-2">Payment details will be available once payment is processed.</p>
                  </div>
                </div>
              )}

              {/* Pickup Collection Details */}
              {order.preferredPickupDate && (
                <div className="mb-6 border-t border-gray-200 pt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Pickup Collection Details
                  </h2>
                  <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Preferred Pickup Date</p>
                        <p className="text-sm text-gray-900 font-semibold mt-1">
                          {new Date(order.preferredPickupDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Preferred Pickup Time</p>
                        <p className="text-sm text-gray-900 font-semibold mt-1">{order.preferredPickupTime || 'N/A'}</p>
                      </div>
                    </div>
                    {(order.collectingPersonName || order.collectingPersonPhone) && (
                      <div className="border-t border-amber-200 pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Person Collecting</p>
                        <div className="space-y-1">
                          {order.collectingPersonName && (
                            <p className="text-sm text-gray-900"><span className="font-medium">Name:</span> {order.collectingPersonName}</p>
                          )}
                          {order.collectingPersonPhone && (
                            <p className="text-sm text-gray-900"><span className="font-medium">Phone:</span> {order.collectingPersonPhone}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="border-t border-amber-200 pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">ID Verification Required</p>
                      <div className="space-y-1">
                        {order.idType && (
                          <p className="text-sm text-gray-900"><span className="font-medium">ID Type:</span> {order.idType.toUpperCase().replace('_', ' ')}</p>
                        )}
                        {order.idNumber && (
                          <p className="text-sm text-gray-900"><span className="font-medium">ID Number:</span> {order.idNumber}</p>
                        )}
                      </div>
                      <p className="text-xs text-amber-700 mt-2">Please bring a valid ID matching the details above when collecting.</p>
                    </div>
                    {order.vehicleInfo && (
                      <div className="border-t border-amber-200 pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">Vehicle Information</p>
                        <p className="text-sm text-gray-900">{order.vehicleInfo}</p>
                      </div>
                    )}
                    {order.pickupSpecialInstructions && (
                      <div className="border-t border-amber-200 pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">Special Instructions</p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{order.pickupSpecialInstructions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Order Summary
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{currencyFormatter(Number(order.subtotal || 0))}</span>
                  </div>
                  {Number(order.shippingAmount || 0) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping</span>
                      <span>{currencyFormatter(Number(order.shippingAmount || 0))}</span>
                    </div>
                  )}
                  {Number(order.taxAmount || 0) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tax</span>
                      <span>{currencyFormatter(Number(order.taxAmount || 0))}</span>
                    </div>
                  )}
                  {Number(order.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{currencyFormatter(Number(order.discountAmount || 0))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>{currencyFormatter(Number(order.totalAmount || order.total_amount || 0))}</span>
                  </div>
                  <div className="mt-4">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus || '')}`}>
                      Payment: {order.paymentStatus || 'pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit order form */}
              <form onSubmit={handleSubmit} className="mt-6 border-t border-gray-200 pt-6 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="h-5 w-5 text-[var(--shreeji-primary)]" />
                  <h2 className="text-xl font-semibold text-gray-900">Order Status</h2>
                </div>
                <div className="p-4 bg-[#f5f1e8] rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="orderStatus" className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
                      <select
                        id="orderStatus"
                        name="orderStatus"
                        value={formData.orderStatus}
                        onChange={handleChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                      >
                        <option value="">Select Status</option>
                        {orderStatusOptions.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="paymentStatus" className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                      <select
                        id="paymentStatus"
                        name="paymentStatus"
                        value={formData.paymentStatus}
                        onChange={handleChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                      >
                        <option value="">Select Payment Status</option>
                        {PAYMENT_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {!isPickupOrder && (
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Truck className="h-5 w-5 text-[var(--shreeji-primary)]" />
                      <h2 className="text-xl font-semibold text-gray-900">Shipping & Tracking</h2>
                    </div>
                    <div className="p-4 bg-[#f5f1e8] rounded-lg space-y-4">
                      <div>
                        <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                        <input
                          type="text"
                          id="trackingNumber"
                          name="trackingNumber"
                          value={formData.trackingNumber}
                          onChange={handleChange}
                          maxLength={100}
                          placeholder="Enter tracking number"
                          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white ${errors.trackingNumber ? 'border-red-300' : 'border-gray-300'}`}
                        />
                        {errors.trackingNumber && <p className="mt-1 text-sm text-red-600">{errors.trackingNumber}</p>}
                        <p className="mt-1 text-xs text-gray-500">Adding a tracking number can set status to Shipped and set shipped date.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-200 pt-4">
                        <div>
                          <label htmlFor="estimatedDelivery" className="block text-sm font-medium text-gray-700 mb-1">Estimated Delivery</label>
                          <input
                            type="date"
                            id="estimatedDelivery"
                            name="estimatedDelivery"
                            value={formData.estimatedDelivery}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label htmlFor="shippedAt" className="block text-sm font-medium text-gray-700 mb-1">Shipped Date</label>
                          <input
                            type="date"
                            id="shippedAt"
                            name="shippedAt"
                            value={formData.shippedAt}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label htmlFor="deliveredAt" className="block text-sm font-medium text-gray-700 mb-1">Delivered Date</label>
                          <input
                            type="date"
                            id="deliveredAt"
                            name="deliveredAt"
                            value={formData.deliveredAt}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-5 w-5 text-[var(--shreeji-primary)]" />
                    <h2 className="text-xl font-semibold text-gray-900">Notes</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Customer Notes</label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Notes visible to customer"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                      />
                      <p className="mt-1 text-xs text-blue-600">These notes will be visible to the customer.</p>
                    </div>
                    <div className="p-4 bg-[#f5f1e8] rounded-lg">
                      <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                      <textarea
                        id="internalNotes"
                        name="internalNotes"
                        value={formData.internalNotes}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Internal notes (not visible to customer)"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                      />
                      <p className="mt-1 text-xs text-gray-500">Internal use only - not visible to customer.</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {order && (
        <CancelOrderModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          orderId={order.id}
          orderNumber={order.orderNumber || order.id}
          onSuccess={() => {
            fetchOrder()
            setIsCancelModalOpen(false)
          }}
        />
      )}
    </Layout>
  )
}

export default function AdminOrderDetailsPage() {
  return (
    <ProtectedRoute>
      <AdminOrderDetailsContent />
    </ProtectedRoute>
  )
}
