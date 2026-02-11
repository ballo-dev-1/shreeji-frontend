'use client'

import { useEffect, useMemo, useState } from 'react'
import Layout from './Layout'
import api from '@/app/lib/admin/api'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'

interface CustomerAnalyticsPageProps {
  customerId: string
}

export default function CustomerAnalyticsPage({ customerId }: CustomerAnalyticsPageProps) {
  const [customer, setCustomer] = useState<any | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'analytics' | 'admin'>('analytics')
  const [companyName, setCompanyName] = useState('')
  const [taxId, setTaxId] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [customerRes, ordersRes] = await Promise.all([
          api.getCustomer(customerId),
          api.getOrders({
            pagination: { page: 1, pageSize: 50 },
            filters: { search: '' },
          }),
        ])

        const customerData = customerRes.data
        // Filter orders for this customer on the client (backend currently filters by search)
        const customerOrders = (ordersRes.data || []).filter(
          (order: any) => order.customer && String(order.customer.id) === String(customerData.id)
        )

        setCustomer(customerData)
        setOrders(customerOrders)
      } catch (err: any) {
        console.error('Failed to load customer analytics', err)
        setError(err?.message || 'Failed to load customer details')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [customerId])

  useEffect(() => {
    if (customer) {
      setCompanyName(customer.companyName || '')
      setTaxId(customer.taxId || '')
    }
  }, [customer])

  const stats = useMemo(() => {
    if (!customer) {
      return {
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: null as Date | null,
      }
    }

    const totalOrders = orders.length
    const totalSpent = orders.reduce(
      (sum, o) => sum + Number(o.totalAmount || 0),
      0
    )
    const lastOrderDate =
      totalOrders > 0
        ? new Date(
            orders[0].createdAt || orders[0].orderDate || orders[0].created_at
          )
        : null

    return { totalOrders, totalSpent, lastOrderDate }
  }, [customer, orders])

  if (loading) {
    return (
      <Layout currentPage="Customers" pageTitle="Customer Details">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-64"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </Layout>
    )
  }

  if (error || !customer) {
    return (
      <Layout currentPage="Customers" pageTitle="Customer Details">
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-red-600">
            {error || 'Customer not found.'}
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPage="Customers" pageTitle="Customer Analytics">
      <div className="space-y-6">
        {/* Header with tabs */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {customer.firstName} {customer.lastName}
            </h1>
            <p className="text-sm text-gray-500">
              {customer.email} · {customer.phone || 'No phone on file'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-0.5 text-sm shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`relative px-4 py-1.5 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 ${
                  activeTab === 'analytics'
                    ? 'bg-primary-600 text-white shadow'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Analytics
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`relative px-4 py-1.5 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 ${
                  activeTab === 'admin'
                    ? 'bg-primary-600 text-white shadow'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Admin Controls
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'analytics' && (
          <>
            {/* High-level stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <div className="text-sm text-gray-500">Total Orders</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">
                  {stats.totalOrders}
                </div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <div className="text-sm text-gray-500">Total Spent</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">
                  {currencyFormatter(stats.totalSpent)}
                </div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <div className="text-sm text-gray-500">Last Order</div>
                <div className="mt-1 text-lg font-medium text-gray-900">
                  {stats.lastOrderDate
                    ? stats.lastOrderDate.toLocaleDateString()
                    : 'No orders yet'}
                </div>
              </div>
            </div>

            {/* Recent orders list */}
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">
                Recent Orders
              </h2>
              {orders.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">
                  This customer has not placed any orders yet.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">
                          Order #
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">
                          Date
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-3 py-2 text-gray-900">
                            {order.orderNumber || order.id}
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {order.status || order.orderStatus || 'Unknown'}
                          </td>
                          <td className="px-3 py-2 text-gray-900">
                            {currencyFormatter(Number(order.totalAmount || order.total_amount || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Account Status
              </h2>
              <p className="text-xs text-gray-500 mb-2">
                Current status:{' '}
                <span className="font-medium text-gray-900">
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
                  onClick={async () => {
                    try {
                      await api.updateCustomer(customer.id, { isActive: false })
                      setCustomer((prev: any) =>
                        prev ? { ...prev, isActive: false } : prev
                      )
                    } catch (e) {
                      console.error('Failed to deactivate customer', e)
                    }
                  }}
                >
                  Deactivate
                </button>
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-green-700"
                  onClick={async () => {
                    try {
                      await api.updateCustomer(customer.id, { isActive: true })
                      setCustomer((prev: any) =>
                        prev ? { ...prev, isActive: true } : prev
                      )
                    } catch (e) {
                      console.error('Failed to activate customer', e)
                    }
                  }}
                >
                  Activate
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Verification & Risk
              </h2>
              <p className="text-xs text-gray-500 mb-2">
                Verification:{' '}
                <span className="font-medium text-gray-900">
                  {customer.isVerified ? 'Verified' : 'Not verified'}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  onClick={async () => {
                    try {
                      await api.updateCustomer(customer.id, { isVerified: true })
                      setCustomer((prev: any) =>
                        prev ? { ...prev, isVerified: true } : prev
                      )
                    } catch (e) {
                      console.error('Failed to verify customer', e)
                    }
                  }}
                >
                  Mark as Verified
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Profile & Preferences
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Customer type</p>
                  <div className="inline-flex rounded-full bg-gray-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={async () => {
                        if (customer.customerType === 'individual') return
                        try {
                          await api.updateCustomer(customer.id, {
                            customerType: 'individual',
                          })
                          setCustomer((prev: any) =>
                            prev ? { ...prev, customerType: 'individual' } : prev
                          )
                        } catch (e) {
                          console.error('Failed to update customer type', e)
                        }
                      }}
                      className={`px-3 py-1 rounded-full font-medium ${
                        customer.customerType === 'individual'
                          ? 'bg-primary-600 text-white shadow'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (customer.customerType === 'business') return
                        try {
                          await api.updateCustomer(customer.id, {
                            customerType: 'business',
                          })
                          setCustomer((prev: any) =>
                            prev ? { ...prev, customerType: 'business' } : prev
                          )
                        } catch (e) {
                          console.error('Failed to update customer type', e)
                        }
                      }}
                      className={`px-3 py-1 rounded-full font-medium ${
                        customer.customerType === 'business'
                          ? 'bg-primary-600 text-white shadow'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Business
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="customer-company-name"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      Company Name
                    </label>
                    <input
                      id="customer-company-name"
                      className="block w-full rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="customer-tax-id"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      Tax ID
                    </label>
                    <input
                      id="customer-tax-id"
                      className="block w-full rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Marketing consent:{' '}
                    <span className="font-medium text-gray-900">
                      {customer.marketingConsent ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    onClick={async () => {
                      const next = !customer.marketingConsent
                      try {
                        await api.updateCustomer(customer.id, {
                          marketingConsent: next,
                        })
                        setCustomer((prev: any) =>
                          prev ? { ...prev, marketingConsent: next } : prev
                        )
                      } catch (e) {
                        console.error('Failed to update marketing consent', e)
                      }
                    }}
                  >
                    {customer.marketingConsent ? 'Disable Marketing' : 'Enable Marketing'}
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
                    onClick={async () => {
                      try {
                        await api.updateCustomer(customer.id, {
                          companyName: companyName || null,
                          taxId: taxId || null,
                        })
                        setCustomer((prev: any) =>
                          prev
                            ? {
                                ...prev,
                                companyName: companyName || null,
                                taxId: taxId || null,
                              }
                            : prev
                        )
                      } catch (e) {
                        console.error('Failed to update company profile', e)
                      }
                    }}
                  >
                    Save Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}


