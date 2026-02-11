'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'
import { TicketIcon, DocumentDuplicateIcon, CheckIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Coupon {
  id: number
  code: string
  description?: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  validFrom: string
  validUntil: string
  isActive: boolean
  usageLimit?: number
  usageCount?: number
}

export default function CouponsPage() {
  const { loading: authLoading, isAuthenticated } = useClientAuth()
  const router = useRouter()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/portal/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadCoupons()
    }
  }, [isAuthenticated])

  const loadCoupons = async () => {
    try {
      setLoading(true)
      // Get all coupons (we'll filter by date on frontend)
      const response = await clientApi.getCoupons({ pageSize: 100 })
      setCoupons(response.data || [])
    } catch (error: any) {
      console.error('Failed to load coupons:', error)
      toast.error(error.message || 'Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Coupon code copied!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}% OFF`
    } else {
      return `${coupon.discountValue} ${coupon.discountType === 'fixed' ? 'OFF' : ''}`
    }
  }

  const isExpired = (coupon: Coupon) => {
    if (coupon.validUntil) {
      return new Date(coupon.validUntil) < new Date()
    }
    return false
  }

  const isUpcoming = (coupon: Coupon) => {
    if (coupon.validFrom) {
      return new Date(coupon.validFrom) > new Date()
    }
    return false
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8]">
        <div className="space-y-4 animate-pulse">
          <div className="h-12 w-12 bg-gray-300 rounded-full mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const activeCoupons = coupons.filter(c => !isExpired(c) && !isUpcoming(c))
  const expiredCoupons = coupons.filter(c => isExpired(c))
  const upcomingCoupons = coupons.filter(c => isUpcoming(c))

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Available Coupons</h1>
        <p className="mt-2 text-sm text-gray-500">
          Use these discount codes at checkout to save on your orders
        </p>
      </div>

      {activeCoupons.length === 0 && expiredCoupons.length === 0 && upcomingCoupons.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-12 text-center">
          <TicketIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No coupons available</h3>
          <p className="mt-2 text-sm text-gray-500">
            Check back later for new discount codes and promotions
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Coupons */}
          {activeCoupons.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Coupons</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeCoupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="bg-gradient-to-br from-[var(--shreeji-primary)] to-[var(--shreeji-secondary)] rounded-2xl p-6 text-white shadow-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <TicketIcon className="h-6 w-6" />
                          <span className="text-2xl font-bold">{formatDiscount(coupon)}</span>
                        </div>
                        {coupon.description && (
                          <p className="text-sm opacity-90 mb-3">{coupon.description}</p>
                        )}
                        {coupon.minOrderAmount && (
                          <p className="text-xs opacity-75 mb-2">
                            Min. order: {coupon.minOrderAmount} {coupon.discountType === 'percentage' ? '' : 'ZMW'}
                          </p>
                        )}
                        {coupon.validUntil && (
                          <p className="text-xs opacity-75">
                            Valid until: {new Date(coupon.validUntil).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="ml-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === coupon.code ? (
                          <CheckIcon className="h-5 w-5" />
                        ) : (
                          <DocumentDuplicateIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <div className="flex items-center justify-between">
                        <code className="text-lg font-mono font-bold bg-white/20 px-4 py-2 rounded-lg">
                          {coupon.code}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Coupons */}
          {upcomingCoupons.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Coupons</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingCoupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="bg-gray-100 rounded-2xl p-6 border-2 border-dashed border-gray-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <TicketIcon className="h-6 w-6 text-gray-400" />
                          <span className="text-2xl font-bold text-gray-700">{formatDiscount(coupon)}</span>
                        </div>
                        {coupon.description && (
                          <p className="text-sm text-gray-600 mb-3">{coupon.description}</p>
                        )}
                        {coupon.validFrom && (
                          <p className="text-xs text-gray-500">
                            Starts: {new Date(coupon.validFrom).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <code className="text-lg font-mono font-bold text-gray-500 bg-gray-200 px-4 py-2 rounded-lg">
                        {coupon.code}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expired Coupons */}
          {expiredCoupons.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Expired Coupons</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {expiredCoupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="bg-gray-50 rounded-2xl p-6 border border-gray-200 opacity-60"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <TicketIcon className="h-6 w-6 text-gray-400" />
                          <span className="text-2xl font-bold text-gray-500 line-through">{formatDiscount(coupon)}</span>
                        </div>
                        {coupon.description && (
                          <p className="text-sm text-gray-500 mb-3">{coupon.description}</p>
                        )}
                        {coupon.validUntil && (
                          <p className="text-xs text-red-500">
                            Expired: {new Date(coupon.validUntil).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <code className="text-lg font-mono font-bold text-gray-400 bg-gray-100 px-4 py-2 rounded-lg">
                        {coupon.code}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

