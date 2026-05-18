'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import { getLoginUrl } from '@/app/lib/client/redirectToLogin'
import clientApi from '@/app/lib/client/api'
import { TableSkeleton } from '@/app/components/ui/Skeletons'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'

const statusConfig: Record<string, { bg: string; text: string }> = {
  delivered:  { bg: 'bg-green-100',  text: 'text-green-800' },
  fulfilled:  { bg: 'bg-green-100',  text: 'text-green-800' },
  shipped:    { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  processing: { bg: 'bg-blue-100',   text: 'text-blue-800' },
  confirmed:  { bg: 'bg-blue-100',   text: 'text-blue-800' },
  pending:    { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  cancelled:  { bg: 'bg-red-100',    text: 'text-red-800' },
  returned:   { bg: 'bg-orange-100', text: 'text-orange-800' },
}

function StatusBadge({ status }: { status?: string }) {
  const key = (status || 'pending').toLowerCase()
  const cfg = statusConfig[key] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${cfg.bg} ${cfg.text}`}>
      {status || 'pending'}
    </span>
  )
}

function EmptyOrders() {
  return (
    <div className="text-center py-16 px-6">
      <ShoppingBag className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-1">No orders yet</h3>
      <p className="text-gray-500 text-sm mb-6">When you place an order it will appear here.</p>
      <Link
        href="/products"
        className="inline-flex items-center px-5 py-2.5 bg-[var(--shreeji-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Start Shopping
      </Link>
    </div>
  )
}

export default function PortalOrdersPage() {
  const { loading: authLoading, isAuthenticated } = useClientAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(getLoginUrl())
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()

      const handler = () => fetchOrders()
      window.addEventListener('order-status-changed', handler)
      const interval = setInterval(() => fetchOrders(), 30000)

      return () => {
        window.removeEventListener('order-status-changed', handler)
        clearInterval(interval)
      }
    }
  }, [isAuthenticated])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await clientApi.getOrders({
        pagination: { page: 1, pageSize: 50 },
        populate: ['orderItems', 'orderItems.product'],
      })
      setOrders(response.data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f5f1e8] pt-24">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <TableSkeleton rows={5} columns={5} />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] overflow-hidden">

        {orders.length === 0 ? (
          <EmptyOrders />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-100">
              {orders.map((order: any) => (
                <Link
                  key={order.id}
                  href={`/portal/orders/${order.id}`}
                  className="flex flex-col gap-2 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 text-sm">
                      #{order.orderNumber || order.id}
                    </span>
                    <StatusBadge status={order.orderStatus} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {currencyFormatter(Number(order.totalAmount || 0))}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--shreeji-primary)] font-medium self-end">
                    View details →
                  </span>
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#f5f1e8]">
                  <tr>
                    {['Order #', 'Date', 'Total', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.orderNumber || order.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {currencyFormatter(Number(order.totalAmount || 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={order.orderStatus} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/portal/orders/${order.id}`}
                          className="text-[var(--shreeji-primary)] hover:opacity-70 transition-opacity"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
