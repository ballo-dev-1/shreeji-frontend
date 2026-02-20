'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, MapPin, CreditCard, Truck, Download } from 'lucide-react'
import Image from 'next/image'
import clientApi from '@/app/lib/client/api'
import { getMainProductImage, normalizeImageUrl } from '@/app/lib/admin/image-mapping'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'
import { OrderDetailsSkeleton } from '@/app/components/ui/Skeletons'

function processImageUrl(url: string): string {
  if (!url) return url
  url = normalizeImageUrl(url)
  if (url.startsWith('http')) return url
  if (!url.startsWith('/')) url = `/${url}`
  url = url.replace(/^\/\//, '/')
  if (url.includes(' ') && !url.includes('%20')) {
    const urlParts = url.split('/')
    const filename = urlParts[urlParts.length - 1]
    if (filename?.includes(' ')) {
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
      return 'bg-yellow-100 text-yellow-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
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
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-yellow-100 text-yellow-800'
  }
}

function GuestOrderContent() {
  const searchParams = useSearchParams()
  const orderNumberParam = searchParams.get('orderNumber') ?? ''
  const emailParam = searchParams.get('email') ?? ''

  const [orderNumber, setOrderNumber] = useState(orderNumberParam)
  const [email, setEmail] = useState(emailParam)
  const [order, setOrder] = useState<any>(null)
  const hasParams = !!(orderNumberParam && emailParam)
  const [loading, setLoading] = useState(hasParams)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(!hasParams)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const orderCardRef = useRef<HTMLDivElement>(null)

  const fetchOrder = async (num: string, em: string) => {
    if (!num.trim() || !em.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await clientApi.getOrderByGuestLookup(num.trim(), em.trim())
      setOrder(res.data)
      setShowForm(false)
    } catch (e: any) {
      setError(e?.message || 'Order not found')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orderNumberParam && emailParam) {
      fetchOrder(orderNumberParam, emailParam)
    }
  }, [orderNumberParam, emailParam])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchOrder(orderNumber, email)
  }

  const handleDownloadOrderDetails = async () => {
    if (!order || !orderCardRef.current) return
    setDownloadingPdf(true)
    try {
      const [html2canvasMod, jsPDFMod] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const html2canvas = html2canvasMod.default
      const { jsPDF } = jsPDFMod
      const el = orderCardRef.current
      const downloadBtn = el.querySelector('[data-download-order-btn]') as HTMLElement | null
      if (downloadBtn) downloadBtn.style.visibility = 'hidden'
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc, clonedElement) => {
          clonedElement.id = 'pdf-capture-root'
          clonedDoc.documentElement.style.setProperty('background-color', '#ffffff', 'important')
          if (clonedDoc.body) clonedDoc.body.style.setProperty('background-color', '#ffffff', 'important')
          const replaceOklch = (css: string) =>
            css.replace(/oklch\([^)]*\)/g, '#6b7280').replace(/oklab\([^)]*\)/g, '#6b7280')
          clonedDoc.querySelectorAll('style').forEach((styleEl) => {
            if (styleEl.textContent) styleEl.textContent = replaceOklch(styleEl.textContent)
          })
          try {
            const sheets = Array.from(clonedDoc.styleSheets || [])
            sheets.forEach((sheet) => {
              try {
                const rules = Array.from((sheet as CSSStyleSheet).cssRules || [])
                rules.forEach((rule) => {
                  if (rule instanceof CSSStyleRule && rule.style && rule.style.cssText) {
                    rule.style.cssText = replaceOklch(rule.style.cssText)
                  }
                })
              } catch (_) { /* cross-origin or disabled */ }
            })
          } catch (_) { /* ignore */ }
          const style = clonedDoc.createElement('style')
          style.textContent = `
            #pdf-capture-root .bg-white, #pdf-capture-root.bg-white { background-color: #ffffff !important; }
            #pdf-capture-root .bg-gray-100 { background-color: #f3f4f6 !important; }
            #pdf-capture-root .bg-gray-200 { background-color: #e5e7eb !important; }
            #pdf-capture-root .bg-green-100 { background-color: #dcfce7 !important; }
            #pdf-capture-root .bg-yellow-100 { background-color: #fef9c3 !important; }
            #pdf-capture-root .bg-blue-50 { background-color: #eff6ff !important; }
            #pdf-capture-root .bg-red-100 { background-color: #fee2e2 !important; }
            #pdf-capture-root .bg-orange-100 { background-color: #ffedd5 !important; }
            #pdf-capture-root .text-gray-400 { color: #9ca3af !important; }
            #pdf-capture-root .text-gray-500 { color: #6b7280 !important; }
            #pdf-capture-root .text-gray-600 { color: #4b5563 !important; }
            #pdf-capture-root .text-gray-700 { color: #374151 !important; }
            #pdf-capture-root .text-gray-800 { color: #1f2937 !important; }
            #pdf-capture-root .text-gray-900 { color: #111827 !important; }
            #pdf-capture-root .text-green-800 { color: #166534 !important; }
            #pdf-capture-root .text-yellow-800 { color: #854d0e !important; }
            #pdf-capture-root .text-blue-900 { color: #1e3a8a !important; }
            #pdf-capture-root .text-red-800 { color: #991b1b !important; }
            #pdf-capture-root .text-orange-800 { color: #9a3412 !important; }
            #pdf-capture-root .text-green-600 { color: #16a34a !important; }
            #pdf-capture-root .border-gray-200 { border-color: #e5e7eb !important; }
            #pdf-capture-root [class*="shreeji-primary"], #pdf-capture-root svg { color: #807045 !important; fill: #807045 !important; }
            #pdf-capture-root .bg-\\#f5f1e8, #pdf-capture-root [class*="f5f1e8"] { background-color: #f5f1e8 !important; }
            #pdf-capture-root [data-pdf-status] { background-color: transparent !important; }
            #pdf-capture-root [data-pdf-hide-image] { display: none !important; }
            #pdf-capture-root [data-pdf-icon-align] { transform: translateY(4px) !important; }
            #pdf-capture-root [data-pdf-table-head] { background-color: #f3f4f6 !important; }
          `
          clonedDoc.head.appendChild(style)
          const walk = (node: Element) => {
            const el = node as HTMLElement
            try {
              const computed = clonedDoc.defaultView?.getComputedStyle(el)
              if (computed) {
                const bg = computed.backgroundColor
                const col = computed.color
                const borderColor = computed.borderColor
                if (typeof bg === 'string' && bg.includes('oklch')) el.style.setProperty('background-color', '#ffffff', 'important')
                if (typeof col === 'string' && col.includes('oklch')) el.style.setProperty('color', '#111827', 'important')
                if (typeof borderColor === 'string' && borderColor.includes('oklch')) el.style.setProperty('border-color', '#e5e7eb', 'important')
              }
            } catch (_) { /* ignore */ }
            node.childNodes.forEach((child) => { if (child.nodeType === 1) walk(child as Element) })
          }
          walk(clonedDoc.documentElement)
        },
      })
      if (downloadBtn) downloadBtn.style.visibility = ''
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(`order-${order.orderNumber || order.id}.pdf`)
    } catch (err) {
      console.error('PDF download failed:', err)
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (showForm && !order) {
    return (
      <div className="min-h-screen bg-[#f5f1e8] pt-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-2">View your order</h1>
            <p className="text-sm text-gray-600 mb-6">
              Enter your order number and email to see order details.
            </p>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Order number
                </label>
                <input
                  id="orderNumber"
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. ORD-12345"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[var(--shreeji-primary)] text-white font-medium rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Looking up...' : 'View order'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-[#f5f1e8] pt-24 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <OrderDetailsSkeleton />
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f5f1e8] pt-24 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Order not found. Check your order number and email.</p>
          <Link
            href="/checkout/order-status"
            className="text-[var(--shreeji-primary)] hover:underline"
          >
            Try again
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f1e8] pt-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div
          ref={orderCardRef}
          className="bg-white rounded-lg shadow-[0_0_20px_0_rgba(0,0,0,0.1)] mb-6"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-start gap-4">
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
              <div data-pdf-header-right className="flex items-center gap-2 flex-shrink-0">
                <span data-pdf-status data-pdf-header-status className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.orderStatus)}`}>
                  {order.orderStatus || 'pending'}
                </span>
                <button
                  type="button"
                  data-download-order-btn
                  onClick={handleDownloadOrderDetails}
                  disabled={downloadingPdf}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50"
                  title="Download order details (PDF)"
                  aria-label="Download order details (PDF)"
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <div className="mb-4 flex items-center gap-3">
                <Package className="h-5 w-5 shrink-0 text-[var(--shreeji-primary)]" data-pdf-icon-align />
                <h2 className="text-xl font-semibold leading-tight text-gray-900">Order Items</h2>
              </div>
              <div data-pdf-table-head className="hidden sm:flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3 mb-4">
                <div className="w-16 flex-shrink-0" />
                <div className="flex-1 text-left"><span className="text-sm font-medium text-gray-700">Product</span></div>
                <div className="text-center min-w-[100px]"><span className="text-sm font-medium text-gray-700">Unit Price</span></div>
                <div className="text-center min-w-[60px]"><span className="text-sm font-medium text-gray-700">Qty</span></div>
                <div className="text-right min-w-[100px]"><span className="text-sm font-medium text-gray-700">Total</span></div>
              </div>
              <div className="space-y-4">
                {order.orderItems?.length > 0 ? (
                  order.orderItems.map((item: any, index: number) => {
                    const product = item.product || item.productSnapshot || {}
                    let imageUrl: string | null = null
                    if (product.name) {
                      const mapped = getMainProductImage(product.name)
                      if (mapped && mapped !== '/public/products/placeholder.png') imageUrl = mapped
                    }
                    if (!imageUrl && (product.images?.length || product.imageUrl)) {
                      const main = product.images?.find((i: any) => i?.isMain) || product.images?.[0]
                      imageUrl = typeof main === 'string' ? main : main?.url || product.imageUrl || null
                    }
                    if (imageUrl) imageUrl = processImageUrl(imageUrl)
                    const unitPrice = item.unitPrice ?? item.price ?? 0
                    const totalPrice = (item.quantity || 1) * unitPrice
                    const name = product.name || 'Product'
                    return (
                      <div key={index} className="flex items-center gap-4 px-4 py-5 bg-white">
                        <div data-pdf-hide-image className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {imageUrl ? (
                            <Image src={imageUrl} alt={name} fill className="object-cover" unoptimized sizes="64px" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-xs text-gray-400">No Image</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900">{name}</h3>
                          <p className="text-sm text-gray-500">{product.sku || 'Shreeji'}</p>
                        </div>
                        <div className="text-center min-w-[100px] text-sm font-semibold text-gray-900">
                          {currencyFormatter(unitPrice, order.currency || 'ZMW')}
                        </div>
                        <div className="flex justify-center min-w-[60px] text-sm font-medium">{item.quantity}</div>
                        <div className="text-right font-bold text-gray-900">
                          {currencyFormatter(totalPrice, order.currency || 'ZMW')}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-gray-500">No items found</p>
                )}
              </div>
            </div>

            {order.shippingAddress && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold leading-tight text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 shrink-0" data-pdf-icon-align />
                  Shipping Address
                </h2>
                <div className="p-4 bg-[#f5f1e8] rounded-lg">
                  <p className="text-gray-900">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                  <p className="text-gray-600">{order.shippingAddress.addressLine1}{order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}</p>
                  <p className="text-gray-600">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                  <p className="text-gray-600">{order.shippingAddress.country}</p>
                </div>
              </div>
            )}

            {order.trackingNumber && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold leading-tight text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="h-5 w-5 shrink-0" data-pdf-icon-align />
                  Tracking
                </h2>
                <div className="p-4 bg-[#f5f1e8] rounded-lg">
                  <p className="text-gray-900"><span className="font-medium">Tracking Number:</span> {order.trackingNumber}</p>
                  {order.estimatedDelivery && (
                    <p className="text-gray-600 mt-2">Estimated delivery: {new Date(order.estimatedDelivery).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  )}
                </div>
              </div>
            )}

            {order.payments?.length > 0 && (
              <div className="mb-6 border-t border-gray-200 pt-6">
                <h2 className="text-lg font-semibold leading-tight text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 shrink-0" data-pdf-icon-align />
                  Payment
                </h2>
                <div className="space-y-4">
                  {order.payments.map((payment: any, idx: number) => (
                    <div key={payment.id || idx} className="p-4 bg-[#f5f1e8] rounded-lg">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-gray-900">{payment.paymentMethod || 'Payment'}</p>
                        <span data-pdf-status className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(payment.paymentStatus)}`}>
                          {payment.paymentStatus || 'pending'}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        Amount: {currencyFormatter(Number(payment.amount || 0), payment.currency || 'ZMW')}
                        {payment.transactionId && <span className="block mt-1">Transaction: {payment.transactionId}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{currencyFormatter(Number(order.subtotal || 0), order.currency || 'ZMW')}</span></div>
                {(order.shippingAmount ?? 0) > 0 && <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{currencyFormatter(Number(order.shippingAmount || 0), order.currency || 'ZMW')}</span></div>}
                {(order.taxAmount ?? 0) > 0 && <div className="flex justify-between text-gray-600"><span>Tax</span><span>{currencyFormatter(Number(order.taxAmount || 0), order.currency || 'ZMW')}</span></div>}
                {(order.discountAmount ?? 0) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{currencyFormatter(Number(order.discountAmount || 0), order.currency || 'ZMW')}</span></div>}
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>{currencyFormatter(Number(order.totalAmount || 0), order.currency || 'ZMW')}</span>
                </div>
                <div className="mt-4">
                  <span data-pdf-status className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                    Payment: {order.paymentStatus || 'pending'}
                  </span>
                </div>
              </div>
            </div>

            {order.notes && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900"><span className="font-medium">Notes:</span> {order.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GuestOrderStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f1e8] pt-24 flex items-center justify-center"><OrderDetailsSkeleton /></div>}>
      <GuestOrderContent />
    </Suspense>
  )
}
