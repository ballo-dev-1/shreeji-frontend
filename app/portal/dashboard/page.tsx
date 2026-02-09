'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import { useCart } from '@/app/contexts/CartContext'
import clientApi from '@/app/lib/client/api'
import { Package, DollarSign, TrendingUp, ShoppingCart } from 'lucide-react'
import RecentlyViewed from '@/app/components/products/RecentlyViewed'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'
import { DashboardSkeleton } from '@/app/components/ui/Skeletons'

export default function PortalDashboardPage() {
  const { user, loading: authLoading, isAuthenticated } = useClientAuth()
  const { cart } = useCart()
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const hasActiveCart = cart && cart.items && cart.items.length > 0
  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0

  const fetchOrders = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      const response = await clientApi.getOrders({ 
        pagination: { page: 1, pageSize: 5 },
        populate: ['orderItems']
      })
      const newOrders = response.data || []
      // Only update state if orders actually changed to prevent unnecessary re-renders
      setOrders(prevOrders => {
        const ordersChanged = JSON.stringify(prevOrders) !== JSON.stringify(newOrders)
        if (!ordersChanged) {
          return prevOrders
        }
        return newOrders
      })
    } catch (error: any) {
      console.error('Error fetching orders:', error)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/portal/login')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      // Initial fetch with loading indicator
      fetchOrders(true)
      
      // Refresh orders every 30 seconds without loading indicator
      const interval = setInterval(() => {
        fetchOrders(false)
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, fetchOrders])

  const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
  const averageOrderValue = orders.length > 0 ? totalSpent / orders.length : 0
  const pendingOrders = orders.filter((o: any) => 
    ['pending', 'processing', 'confirmed'].includes(o.orderStatus?.toLowerCase())
  ).length

  if (authLoading || loading) {
    return <DashboardSkeleton />
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
            Welcome, {user?.firstName || user?.email || 'Customer'}
        </div>
        </div>

        {/* Continue Checkout Banner */}
        {hasActiveCart && (
          <div className="mb-6 rounded-lg bg-gradient-to-r from-[var(--shreeji-primary)] to-[#9b8f6d] p-4 text-white shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-6 w-6" />
                <div>
                  <p className="font-semibold">You have items in your cart</p>
                  <p className="text-sm opacity-90">
                    {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} ready to checkout
                  </p>
                </div>
              </div>
              <Link
                href="/checkout"
                className="rounded-lg bg-white px-6 py-2 text-[var(--shreeji-primary)] font-semibold hover:bg-gray-100 transition-colors"
              >
                Continue Checkout
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-[0_0_20px_0_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
                <p className="mt-2 text-3xl font-bold text-gray-900">{orders.length}</p>
              </div>
              <Package className="h-8 w-8 text-[var(--shreeji-primary)]" />
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-[0_0_20px_0_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Spent</h3>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {currencyFormatter(Number(totalSpent || 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-[0_0_20px_0_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Avg Order Value</h3>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {currencyFormatter(Number(Math.round(averageOrderValue || 0)))}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-[0_0_20px_0_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Pending Orders</h3>
                <p className="mt-2 text-3xl font-bold text-gray-900">{pendingOrders}</p>
              </div>
              <Package className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)]">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            {orders.length > 0 && (
              <Link
                href="/portal/orders"
                className="text-sm text-[var(--shreeji-primary)] hover:text-[var(--shreeji-secondary)]"
              >
                View all orders →
              </Link>
            )}
          </div>
          <div className="p-6">
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders yet</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => (
                  <Link
                    key={order.id}
                    href={`/portal/orders/${order.id}`}
                    className="block border-b border-gray-200 pb-4 last:border-0 hover:bg-gray-50 -mx-6 px-6 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">Order #{order.orderNumber || order.id}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {currencyFormatter(Number(order.totalAmount || 0))}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.orderStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.orderStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.orderStatus || 'pending'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Recently Viewed Products */}
      <RecentlyViewed className="mt-8" />
    </div>
  )
}

