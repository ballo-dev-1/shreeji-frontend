"use client";

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/20/solid';
import toast from 'react-hot-toast';
import Layout from './Layout'
import api from '@/app/lib/admin/api'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'
import { Download } from 'lucide-react';
import Link from 'next/link';
import { TableSkeleton } from '@/app/components/ui/Skeletons';

const paymentStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  refunded: 'bg-orange-100 text-orange-800',
};

const paymentMethodLabels = {
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  cash_on_delivery: 'Cash on Pickup', // Backward compatibility
  cash_on_pickup: 'Cash on Pickup',
};

export default function PaymentManagement() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    paymentMethod: '',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, [pagination.page, filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await api.getPayments({
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
        },
        filters: {
          ...(filters.status && { status: filters.status }),
          ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
          ...(filters.startDate && { startDate: filters.startDate }),
          ...(filters.endDate && { endDate: filters.endDate }),
        },
      });
      
      setPayments(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.meta?.pagination?.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment =>
    payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.order?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExport = async (type: 'csv' | 'pdf') => {
    try {
      setIsExporting(true);
      const params: Record<string, string> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;

      if (type === 'csv') {
        await api.exportPaymentsToCSV(params);
      } else {
        await api.exportPaymentsToPDF(params);
      }
      toast.success(`Payments ${type.toUpperCase()} exported`);
    } catch (error) {
      console.error('Failed to export payments', error);
      toast.error('Failed to export payments');
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      paymentMethod: '',
      startDate: '',
      endDate: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (loading) {
    return (
      <Layout currentPage="Payments">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-64"></div>
          <TableSkeleton rows={8} columns={6} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="Payments" pageTitle="Payment Management">
      <div className="space-y-6">
      <div className="flex items-center justify-end">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <Download className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <Download className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Export PDF
            </button>
          </div>
        </div>
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Transaction ID, Email, Order #"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="">All Methods</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="cash_on_pickup">Cash on Pickup</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>
          {(filters.status || filters.paymentMethod || filters.startDate || filters.endDate) && (
            <div className="mt-4">
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Payments Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.transactionId || `#${payment.id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.order ? (
                          <Link href={`/admin/orders`} className="text-primary-600 hover:text-primary-700">
                            {payment.order.orderNumber}
                          </Link>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.customer
                          ? `${payment.customer.firstName} ${payment.customer.lastName} (${payment.customer.email})`
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {currencyFormatter(Number(payment.amount || 0), payment.currency || 'ZMW')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {paymentMethodLabels[payment.paymentMethod as keyof typeof paymentMethodLabels] || payment.paymentMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            paymentStatusColors[payment.paymentStatus as keyof typeof paymentStatusColors] ||
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {payment.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.createdAt
                          ? new Date(payment.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payment Details Modal */}
          {isDetailsOpen && selectedPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
                  <button
                    onClick={() => setIsDetailsOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="px-6 py-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div>
                      <div className="text-gray-500">Transaction ID</div>
                      <div className="font-medium text-gray-900">{selectedPayment.transactionId || `#${selectedPayment.id}`}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Order</div>
                      <div className="font-medium text-primary-600">
                        {selectedPayment.order?.orderNumber || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Customer</div>
                      <div className="font-medium text-gray-900">
                        {selectedPayment.customer
                          ? `${selectedPayment.customer.firstName} ${selectedPayment.customer.lastName} (${selectedPayment.customer.email})`
                          : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Amount</div>
                      <div className="font-semibold text-gray-900">
                        {currencyFormatter(Number(selectedPayment.amount || 0), selectedPayment.currency || 'ZMW')}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Method</div>
                      <div className="font-medium text-gray-900">
                        {paymentMethodLabels[selectedPayment.paymentMethod as keyof typeof paymentMethodLabels] || selectedPayment.paymentMethod}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Status</div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          paymentStatusColors[selectedPayment.paymentStatus as keyof typeof paymentStatusColors] ||
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {selectedPayment.paymentStatus}
                      </span>
                    </div>
                    <div>
                      <div className="text-gray-500">Processed At</div>
                      <div className="font-medium text-gray-900">
                        {selectedPayment.processedAt ? new Date(selectedPayment.processedAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Created At</div>
                      <div className="font-medium text-gray-900">
                        {selectedPayment.createdAt ? new Date(selectedPayment.createdAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    {selectedPayment.paymentProofUrl && (
                      <div className="md:col-span-2">
                        <div className="text-gray-500">Payment Proof</div>
                        <a
                          href={selectedPayment.paymentProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 underline"
                        >
                          View proof
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t px-6 py-4">
                  <button
                    onClick={() => setIsDetailsOpen(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Pagination */}
          {pagination.total > pagination.pageSize && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page * pagination.pageSize >= pagination.total}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.pageSize + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page * pagination.pageSize >= pagination.total}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

