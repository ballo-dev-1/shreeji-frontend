'use client'

import { useState, useEffect, useCallback } from 'react'
import Layout from './Layout'
import api from '@/app/lib/admin/api'
import toast from 'react-hot-toast'
import { CheckCircleIcon, XCircleIcon, EyeIcon } from '@heroicons/react/20/solid'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'
import { TableSkeleton } from '@/app/components/ui/Skeletons'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  refunded: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

export default function ReturnManagement() {
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
  })

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.getReturns({
        status: filters.status || undefined,
        page: 1,
        pageSize: 100,
      })
      setReturns(response.data || [])
    } catch (error) {
      console.error('Error fetching returns:', error)
      toast.error('Failed to fetch return requests')
    } finally {
      setLoading(false)
    }
  }, [filters.status])

  useEffect(() => {
    fetchReturns()
  }, [fetchReturns])

  const handleApprove = async (returnId: number) => {
    if (!confirm('Are you sure you want to approve this return request? This will process the refund.')) {
      return
    }

    try {
      await api.approveReturn(returnId)
      toast.success('Return request approved and refund processed')
      fetchReturns()
    } catch (error: any) {
      console.error('Error approving return:', error)
      toast.error(error.message || 'Failed to approve return request')
    }
  }

  const handleReject = async (returnId: number) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return

    try {
      await api.rejectReturn(returnId, reason)
      toast.success('Return request rejected')
      fetchReturns()
    } catch (error: any) {
      console.error('Error rejecting return:', error)
      toast.error(error.message || 'Failed to reject return request')
    }
  }

  if (loading) {
    return (
      <Layout currentPage="Returns">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-64"></div>
          <TableSkeleton rows={8} columns={6} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPage="Returns" pageTitle="Return Management">
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No return requests found
                    </td>
                  </tr>
                ) : (
                  returns.map((returnRequest) => (
                    <tr key={returnRequest.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{returnRequest.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Order #{returnRequest.order?.orderNumber || returnRequest.orderId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {returnRequest.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {currencyFormatter(Number(returnRequest.refundAmount || 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[returnRequest.status] || 'bg-gray-100 text-gray-800'}`}>
                          {returnRequest.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(returnRequest.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {returnRequest.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(returnRequest.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Approve"
                              >
                                <CheckCircleIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleReject(returnRequest.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Reject"
                              >
                                <XCircleIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

