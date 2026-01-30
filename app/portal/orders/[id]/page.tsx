'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'
import { ArrowLeft, Package, MapPin, CreditCard, Truck, XCircle, RotateCcw } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getMainProductImage } from '@/app/lib/admin/image-mapping'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'
import CancelOrderModal from '@/app/components/portal/CancelOrderModal'
import ReturnRequestModal from '@/app/components/portal/ReturnRequestModal'

// Process image URL to ensure it's properly formatted for Next.js Image component
// Handles filenames with spaces by encoding them properly
function processImageUrl(url: string): string {
  if (!url) return url
  
  // Convert HTTP to HTTPS for mixed content security
  // For image server that doesn't support HTTPS, proxy through Next.js
  if (url.startsWith('http://164.92.249.220:9000/')) {
    // Extract the path after the base URL
    const imagePath = url.replace('http://164.92.249.220:9000/', '');
    url = `/api/images/${imagePath}`;
  } else if (url.startsWith('http://')) {
    // For other HTTP URLs, try to convert to HTTPS
    url = url.replace('http://', 'https://');
  }
  
  // If it's already an absolute URL, return as-is
  if (url.startsWith('http')) return url
  
  // Handle relative paths
  if (!url.startsWith('/')) {
    url = `/${url}`
  }
  
  // Remove leading double slashes
  url = url.replace(/^\/\//, '/')
  
  // If filename contains spaces, encode them properly (%20)
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

export default function OrderDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { loading: authLoading, isAuthenticated } = useClientAuth()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/portal/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && id) {
      fetchOrder()
    }
  }, [isAuthenticated, id])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await clientApi.getOrder(id as string)
      setOrder(response.data)
    } catch (error: any) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const canCancelOrder = () => {
    if (!order) return false
    
    // Can't cancel if already cancelled, shipped, or delivered
    if (['cancelled', 'shipped', 'delivered'].includes(order.orderStatus?.toLowerCase())) {
      return false
    }

    // Check time limit (24 hours)
    if (order.createdAt) {
      const orderDate = new Date(order.createdAt)
      const hoursSinceOrder = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60)
      return hoursSinceOrder <= 24
    }

    return true
  }

  const canRequestReturn = () => {
    if (!order) return false
    // Can only request return for delivered orders
    return order.orderStatus?.toLowerCase() === 'delivered'
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'shipped':
        return 'bg-blue-100 text-blue-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'refunded':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8]">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Order not found</p>
          <Link
            href="/portal/orders"
            className="text-primary-600 hover:text-primary-700"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/portal/orders"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>

        <div className="bg-white rounded-lg shadow-[0_0_20px_0_rgba(0,0,0,0.1)] mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
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
              <div className="flex items-center gap-3">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.orderStatus)}`}>
                  {order.orderStatus || 'pending'}
                </span>
                {canCancelOrder() && (
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Order
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

              {/* Column Headers */}
              <div className="hidden sm:flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3 mb-4">
                <div className="w-16 flex-shrink-0"></div>
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
                    
                    // Get image URL with proper handling
                    let imageUrl: string | null = null
                    
                    // Try to get image from mapping first
                    if (product.name) {
                      const mappedImageUrl = getMainProductImage(product.name)
                      if (mappedImageUrl && mappedImageUrl !== '/public/products/placeholder.png') {
                        imageUrl = mappedImageUrl
                      }
                    }
                    
                    // Fallback to product images if mapping doesn't have it
                    if (!imageUrl) {
                      const productImages = product.images || []
                      const mainImage = productImages.find((img: any) => img?.isMain) || productImages[0]
                      
                      // Handle different image formats - could be object with url property or string
                      if (mainImage) {
                        if (typeof mainImage === 'string') {
                          imageUrl = mainImage
                        } else if (mainImage?.url) {
                          imageUrl = mainImage.url
                        }
                      }
                    }
                    
                    // Fallback to product.imageUrl if still no image
                    if (!imageUrl) {
                      imageUrl = product.imageUrl || null
                    }
                    
                    // Process and format the image URL for Next.js Image component
                    if (imageUrl) {
                      imageUrl = processImageUrl(imageUrl)
                    }
                    
                    const unitPrice = item.unitPrice || item.price || 0
                    const totalPrice = (item.quantity || 1) * unitPrice
                    
                    // Check if this is a variant (check for variantId or variantAttributes)
                    const variantId = item.variantId || product.variantId
                    const variantAttributes = product.variantAttributes || product.attributes || item.variantAttributes || {}
                    const isVariant = !!variantId || Object.keys(variantAttributes).length > 0
                    
                    // Format variant attributes as text (similar to inventory page)
                    const variantAttributesText = Object.entries(variantAttributes)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(', ') || null
                    
                    const productSubtitle = variantAttributesText 
                      ? variantAttributesText 
                      : (product.sku || 'Shreeji')
                    
                    return (
                      <div 
                        key={index} 
                        className={`flex items-center gap-4 px-4 py-5 ${
                          isVariant 
                            ? 'bg-gray-50 pl-12 border-l-4 border-gray-300' 
                            : 'bg-white'
                        }`}
                      >
                        {/* Product Image - Small thumbnail */}
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

                        {/* Product Information - Left Side */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-base leading-tight">
                            {product.name || 'Product'}
                          </h3>
                          {isVariant && (
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">Variant</p>
                          )}
                          <p className="text-sm text-gray-500 mt-0.5">
                            {productSubtitle}
                          </p>
                        </div>

                        {/* Unit Price - Middle */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-sm font-semibold text-gray-900">
                            {currencyFormatter(unitPrice, order.currency || 'ZMW')}
                          </p>
                        </div>

                        {/* Quantity - Middle */}
                        <div className="flex items-center justify-center min-w-[60px]">
                          <span className="text-sm font-medium text-gray-900">
                            {item.quantity}
                          </span>
                        </div>

                        {/* Total Price - Right Side */}
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
                      {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                  {order.shippedAt && (
                    <p className="text-gray-600 mt-2">
                      <span className="font-medium">Shipped on:</span>{' '}
                      {new Date(order.shippedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                  {order.deliveredAt && (
                    <p className="text-green-600 mt-2">
                      <span className="font-medium">Delivered on:</span>{' '}
                      {new Date(order.deliveredAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
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
                      cash_on_delivery: 'Cash on Pick Up', // Backward compatibility
                      cash_on_pickup: 'Cash on Pick Up',
                    };

                    const paymentMethod = paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod || 'Unknown';

                    return (
                      <div key={payment.id || index} className="p-4 bg-[#f5f1e8] rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">Payment {order.payments.length > 1 ? `#${index + 1}` : ''}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Method: <span className="font-medium">{paymentMethod}</span>
                            </p>
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
                    );
                  })}
                </div>
              </div>
            )}

            {/* Show message if no payments found but payment status exists */}
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
                  <p className="text-sm text-gray-500 mt-2">
                    Payment details will be available once payment is processed.
                  </p>
                </div>
              </div>
            )}

            {/* Pickup Details Section */}
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
                      <p className="text-sm text-gray-900 font-semibold mt-1">
                        {order.preferredPickupTime || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {(order.collectingPersonName || order.collectingPersonPhone) && (
                    <div className="border-t border-amber-200 pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Person Collecting</p>
                      <div className="space-y-1">
                        {order.collectingPersonName && (
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">Name:</span> {order.collectingPersonName}
                          </p>
                        )}
                        {order.collectingPersonPhone && (
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">Phone:</span> {order.collectingPersonPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-amber-200 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">ID Verification Required</p>
                    <div className="space-y-1">
                      {order.idType && (
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">ID Type:</span> {order.idType.toUpperCase().replace('_', ' ')}
                        </p>
                      )}
                      {order.idNumber && (
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">ID Number:</span> {order.idNumber}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-amber-700 mt-2">
                      ⚠️ Please bring a valid ID matching the details above when collecting your order.
                    </p>
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

                  <div className="border-t border-amber-200 pt-4 bg-amber-100 p-3 rounded">
                    <p className="text-sm font-semibold text-amber-900 mb-2">Important Reminders:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-amber-800">
                      <li>Please bring a valid ID matching the details above</li>
                      <li>Have the exact cash amount ready (we may not have change)</li>
                      <li>Arrive during your selected time slot</li>
                      <li>We'll notify you when your order is ready for pickup</li>
                    </ul>
                  </div>
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
                {order.shippingAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>{currencyFormatter(Number(order.shippingAmount || 0))}</span>
                  </div>
                )}
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{currencyFormatter(Number(order.taxAmount || 0))}</span>
                  </div>
                )}
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{currencyFormatter(Number(order.discountAmount || 0))}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>{currencyFormatter(Number(order.totalAmount || 0))}</span>
                </div>
                <div className="mt-4">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                    Payment: {order.paymentStatus || 'pending'}
                  </span>
                </div>
              </div>
            </div>

            {order.notes && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Order Notes:</span> {order.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {order && (
        <>
          <CancelOrderModal
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            orderId={order.id}
            orderNumber={order.orderNumber || order.id}
            onSuccess={() => {
              fetchOrder()
            }}
          />
          <ReturnRequestModal
            isOpen={isReturnModalOpen}
            onClose={() => setIsReturnModalOpen(false)}
            order={order}
            onSuccess={() => {
              fetchOrder()
            }}
          />
        </>
      )}
    </div>
  )
}

