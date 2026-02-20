'use client'

import { useState } from 'react'
import { useCart } from '@/app/contexts/CartContext'
import { currencyFormatter } from './currency-formatter'
import { generateQuotePDF } from '@/utils/quoteGenerator'
import { Download, Tag, X } from 'lucide-react'
import clientApi from '@/app/lib/client/api'

interface OrderDetailsSidebarProps {
  fulfillmentType?: 'pickup' | 'delivery'
  currentStep?: number
  couponCode?: string | null
  onCouponChange?: (code: string | null) => void
}

export default function OrderDetailsSidebar({ fulfillmentType = 'pickup', currentStep = 1, couponCode, onCouponChange }: OrderDetailsSidebarProps) {
  const { cart } = useCart()
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponValidating, setCouponValidating] = useState(false)
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null)
  const [showCouponSection, setShowCouponSection] = useState(false)

  if (!cart) {
    return (
      <div className='rounded-lg border-t-4 border-[var(--shreeji-primary)] bg-white p-6 shadow-sm'>
        <h2 className='mb-4 text-xl font-semibold text-gray-900'>Order Details</h2>
        <p className='text-sm text-gray-500'>Cart totals will appear here.</p>
      </div>
    )
  }

  const originalTotal = cart.items.reduce(
    (sum, item) => {
      const originalPrice = item.productSnapshot.price ?? 0
      return sum + originalPrice * item.quantity
    },
    0,
  )
  const discountedTotal = cart.items.reduce(
    (sum, item) => {
      const originalPrice = item.productSnapshot.price ?? 0
      // Treat 0, null, or undefined as "no discount" - use original price
      const discountedPrice = (item.productSnapshot.discountedPrice && item.productSnapshot.discountedPrice > 0)
        ? item.productSnapshot.discountedPrice
        : originalPrice
      return sum + discountedPrice * item.quantity
    },
    0,
  )
  const discountAmount = originalTotal - discountedTotal
  const deliveryCharges = 0 // Free delivery
  const subtotal = cart.subtotal || discountedTotal
  const totalAmount = cart.total || subtotal

  // #region agent log
  const itemsSubtotalSum = cart.items.reduce((s, i) => s + (i.subtotal ?? 0), 0)
  fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrderDetailsSidebar.tsx:OrderDetails',message:'Order details totals',data:{cartSubtotal:cart.subtotal,cartTaxTotal:cart.taxTotal,cartTotal:cart.total,subtotalUsed:subtotal,totalAmountUsed:totalAmount,usedTotalFallback:!(cart.total),itemsSubtotalSum,subtotalMatchesItems:Math.abs((cart.subtotal||0)-itemsSubtotalSum)<0.01,vatRatio:cart.subtotal?((cart.taxTotal||0)/cart.subtotal)*100:null},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
  fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrderDetailsSidebar.tsx:Order details',message:'VAT and fallback check',data:{hasTaxTotal:typeof cart.taxTotal==='number',taxTotal:cart.taxTotal,totalEqualsSubtotalPlusTax:Math.abs((cart.subtotal||0)+(cart.taxTotal||0)-(cart.total||0))<0.01},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
  if (cart.subtotal && cart.subtotal > 0 && cart.taxTotal != null) {
    fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrderDetailsSidebar.tsx:VAT rate',message:'VAT ratio check',data:{subtotal:cart.subtotal,taxTotal:cart.taxTotal,vatPercent:(cart.taxTotal/cart.subtotal)*100},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
  }
  // #endregion

  const handleDownloadQuote = () => {
    if (!cart || cart.items.length === 0) {
      return
    }
    generateQuotePDF(cart, fulfillmentType)
  }

  const subtotalForCoupon = cart?.subtotal ?? discountedTotal
  const productIds = cart?.items?.map((item) => item.productId).filter((id): id is number => typeof id === 'number') ?? []

  const handleApplyCoupon = async () => {
    const code = couponInput.trim()
    if (!code) return
    setCouponError(null)
    setCouponValidating(true)
    try {
      const result = await clientApi.validateCoupon(code, subtotalForCoupon, productIds.length ? productIds : undefined)
      if (result.valid && result.discount != null) {
        setAppliedDiscount(result.discount)
        onCouponChange?.(code)
        setCouponInput('')
      } else {
        setCouponError(result.error ?? 'This coupon is not valid.')
      }
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Failed to validate coupon.')
    } finally {
      setCouponValidating(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedDiscount(null)
    setCouponError(null)
    setCouponInput('')
    onCouponChange?.(null)
  }

  const displayCouponDiscount = couponCode ? (appliedDiscount ?? 0) : 0
  const totalWithCoupon = totalAmount - displayCouponDiscount

  return (
    <div className='rounded-lg border-t-4 border-[var(--shreeji-primary)] bg-white p-6 shadow-sm'>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-xl font-semibold text-gray-900'>Order Details</h2>
        <div className="relative group">
          <button
            onClick={handleDownloadQuote}
            disabled={!cart || cart.items.length === 0}
            className='flex items-center gap-2 rounded-lg bg-[whitesmoke] px-4 py-2 text-sm font-medium text-[var(--shreeji-primary)] transition-colors hover:bg-[#544829] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--shreeji-primary)]'
          >
            <Download className='h-4 w-4' />
          </button>
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Download Quote as PDF
          </span>
        </div>
      </div>

      <div className='space-y-3 text-sm'>
        <div className='flex justify-between'>
          <span className='text-gray-600'>Subtotal</span>
          <span className='font-medium text-gray-900'>{currencyFormatter(subtotal, cart.currency)}</span>
        </div>

        <div className='flex justify-between'>
          <span className='text-gray-600'>Discount</span>
          <span className={`font-medium ${discountAmount > 0 ? 'text-green-600' : 'text-gray-600'}`}>
            {discountAmount > 0 ? '-' : ''}{currencyFormatter(discountAmount, cart.currency)}
          </span>
        </div>

        {/* Coupon code section */}
        <div className='border-t border-gray-100 pt-3'>
          {!couponCode ? (
            <>
              <button
                type='button'
                onClick={() => setShowCouponSection(!showCouponSection)}
                className='flex items-center gap-2 text-sm font-medium text-[var(--shreeji-primary)] hover:underline'
              >
                <Tag className='h-4 w-4' />
                {showCouponSection ? 'Hide coupon' : 'Have a coupon?'}
              </button>
              {showCouponSection && (
                <div className='mt-2 space-y-2'>
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value); setCouponError(null) }}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      placeholder='Enter code'
                      className='flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-[var(--shreeji-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--shreeji-primary)]'
                      disabled={couponValidating}
                    />
                    <button
                      type='button'
                      onClick={handleApplyCoupon}
                      disabled={couponValidating || !couponInput.trim()}
                      className='rounded bg-[var(--shreeji-primary)] px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      {couponValidating ? '…' : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className='text-xs text-red-600'>{couponError}</p>}
                </div>
              )}
            </>
          ) : (
            <div className='flex items-center justify-between rounded-lg bg-green-50 px-3 py-2'>
              <span className='text-sm font-medium text-gray-800'>{couponCode}</span>
              {appliedDiscount != null && appliedDiscount > 0 && (
                <span className='text-sm font-medium text-green-600'>-{currencyFormatter(appliedDiscount, cart.currency)}</span>
              )}
              <button
                type='button'
                onClick={handleRemoveCoupon}
                className='rounded p-1 text-gray-500 hover:bg-green-100 hover:text-gray-700'
                aria-label='Remove coupon'
              >
                <X className='h-4 w-4' />
              </button>
            </div>
          )}
        </div>

        {displayCouponDiscount > 0 && (
          <div className='flex justify-between'>
            <span className='text-gray-600'>Coupon discount</span>
            <span className='font-medium text-green-600'>-{currencyFormatter(displayCouponDiscount, cart.currency)}</span>
          </div>
        )}

        {currentStep >= 2 && fulfillmentType === 'delivery' && (
          <div className='flex justify-between'>
            <span className='text-gray-600'>Delivery charges</span>
            <span className='font-medium text-green-600'>Free</span>
          </div>
        )}

        {(cart.taxTotal ?? 0) > 0 && (
          <div className='flex justify-between'>
            <span className='text-gray-600'>Value Added Tax (VAT)</span>
            <span className='font-medium text-gray-900'>{currencyFormatter(cart.taxTotal ?? 0, cart.currency)}</span>
          </div>
        )}
      </div>

      <div className='my-4 border-t border-dashed border-gray-300'></div>

      <div className='mb-4'>
        <div className='flex justify-between'>
          <div>
            <p className='font-semibold text-gray-900'>Total Cost</p>
            <p className='text-xs text-gray-500'>(Incl VAT)</p>
          </div>
          <span className='text-lg font-bold text-gray-900'>{currencyFormatter(totalWithCoupon, cart.currency)}</span>
        </div>
      </div>

      {discountAmount > 0 && (
        <div className='rounded-lg bg-green-50 p-4'>
          <p className='text-sm font-medium text-gray-800'>Your total Savings amount on this order</p>
          <p className='mt-1 text-lg font-bold text-green-600'>{currencyFormatter(discountAmount, cart.currency)}</p>
        </div>
      )}
    </div>
  )
}

