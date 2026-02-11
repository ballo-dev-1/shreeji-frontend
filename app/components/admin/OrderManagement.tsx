"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PlusIcon, TrashIcon, MagnifyingGlassIcon, XCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import Layout from './Layout'
import api from '@/app/lib/admin/api'
import EditOrderModal from './EditOrderModal'
import CancelOrderModal from './CancelOrderModal'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'
import { TableSkeleton } from '@/app/components/ui/Skeletons'
import { ALL_ORDER_STATUSES, getEnabledOrderStatusOptions } from '@/app/lib/order-statuses';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-primary-100 text-primary-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  fulfilled: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  confirmed: 'bg-blue-100 text-blue-800',
  refunded: 'bg-gray-100 text-gray-800'
};

const paymentStatusColors = {
  unpaid: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
  'partially-refunded': 'bg-orange-100 text-orange-800',
  'partially-paid': 'bg-orange-100 text-orange-800'
};

export default function OrderManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    paymentStatus: '',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    total: 0,
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  // Order status visibility settings (from general.enabledOrderStatuses)
  const [enabledOrderStatuses, setEnabledOrderStatuses] = useState<string[] | null>(null);

  const visibleStatusValues = useMemo(() => {
    const allValues = ALL_ORDER_STATUSES.map((s) => s.value);
    if (!enabledOrderStatuses || enabledOrderStatuses.length === 0) {
      return allValues;
    }
    const set = new Set(enabledOrderStatuses);
    return allValues.filter((value) => set.has(value));
  }, [enabledOrderStatuses]);

  const orderStatusFilterOptions = useMemo(
    () => getEnabledOrderStatusOptions(enabledOrderStatuses),
    [enabledOrderStatuses],
  );

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getOrders({ 
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
        },
        filters: {
          ...(filters.status && { status: filters.status }),
          ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus }),
          ...(filters.startDate && { startDate: filters.startDate }),
          ...(filters.endDate && { endDate: filters.endDate }),
        },
        populate: ['customer', 'orderItems', 'shippingAddress']
      });
      
      // Debug: Log first order to check data structure
      if (response.data && response.data.length > 0) {
        console.log('Sample order data:', response.data[0]);
        console.log('totalAmount:', response.data[0]?.totalAmount);
        console.log('total_amount:', response.data[0]?.total_amount);
      }
      
      // Transform API response to match component format
      const transformedOrders = (response.data || []).map((order: any) => {
        const customer = order.customer || {};
        const shippingAddress = order.shippingAddress || {};
        
        // Handle totalAmount - check both camelCase and snake_case, convert to number
        const totalAmount = order.totalAmount ?? order.total_amount ?? null;
        const total = totalAmount !== null && totalAmount !== undefined && totalAmount !== '' 
          ? Number(totalAmount) 
          : 0;
        
        return {
          id: order.orderNumber || `#${order.id}`,
          orderId: order.id,
          orderNumber: order.orderNumber || `#${order.id}`,
          customer: customer.firstName && customer.lastName
            ? `${customer.firstName} ${customer.lastName}`
            : customer.email || 'Unknown Customer',
          email: customer.email || '',
          phone: customer.phone || shippingAddress.phone || '',
          total: total,
          status: order.status || order.orderStatus || 'pending',
          paymentStatus: order.paymentStatus || 'pending',
          trackingNumber: order.trackingNumber || '',
          items: order.orderItems?.length || 0,
          date: order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          shippingAddress: shippingAddress.addressLine1 
            ? `${shippingAddress.addressLine1}, ${shippingAddress.city || ''}`
            : 'N/A',
          rawOrder: order // Keep raw order for details view
        };
      });
      
      setOrders(transformedOrders);
      setPagination(prev => ({
        ...prev,
        total: response.meta?.pagination?.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters.status, filters.paymentStatus, filters.startDate, filters.endDate]);

  // Silent refresh for polling (doesn't show loading state)
  const refreshOrdersSilently = useCallback(async () => {
    try {
      const response = await api.getOrders({ 
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
        },
        filters: {
          ...(filters.status && { status: filters.status }),
          ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus }),
          ...(filters.startDate && { startDate: filters.startDate }),
          ...(filters.endDate && { endDate: filters.endDate }),
        },
        populate: ['customer', 'orderItems', 'shippingAddress']
      });
      
      const transformedOrders = (response.data || []).map((order: any) => {
        const customer = order.customer || {};
        const shippingAddress = order.shippingAddress || {};
        
        // Handle totalAmount - check both camelCase and snake_case, convert to number
        const totalAmount = order.totalAmount ?? order.total_amount ?? null;
        const total = totalAmount !== null && totalAmount !== undefined && totalAmount !== '' 
          ? Number(totalAmount) 
          : 0;
        
        return {
          id: order.orderNumber || `#${order.id}`,
          orderId: order.id,
          orderNumber: order.orderNumber || `#${order.id}`,
          customer: customer.firstName && customer.lastName
            ? `${customer.firstName} ${customer.lastName}`
            : customer.email || 'Unknown Customer',
          email: customer.email || '',
          phone: customer.phone || shippingAddress.phone || '',
          total: total,
          status: order.status || order.orderStatus || 'pending',
          paymentStatus: order.paymentStatus || 'pending',
          trackingNumber: order.trackingNumber || '',
          items: order.orderItems?.length || 0,
          date: order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          shippingAddress: shippingAddress.addressLine1 
            ? `${shippingAddress.addressLine1}, ${shippingAddress.city || ''}`
            : 'N/A',
          rawOrder: order
        };
      });
      
      setOrders(transformedOrders);
      setPagination(prev => ({
        ...prev,
        total: response.meta?.pagination?.total || 0,
      }));
    } catch (error) {
      console.error('Error refreshing orders:', error);
      // Silently fail during auto-refresh
    }
  }, [pagination.page, pagination.pageSize, filters.status, filters.paymentStatus, filters.startDate, filters.endDate]);

  // Fetch orders when filters or pagination change (not when fetchOrders function changes)
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filters.status, filters.paymentStatus, filters.startDate, filters.endDate]);

  // Load order status visibility settings from backend (general.enabledOrderStatuses)
  useEffect(() => {
    let mounted = true;

    const loadStatusSettings = async () => {
      try {
        const settingsResponse = await api.getSettingsByCategory('general');
        if (!mounted) return;

        const general = settingsResponse?.data || settingsResponse;
        if (general && Array.isArray(general.enabledOrderStatuses)) {
          setEnabledOrderStatuses(general.enabledOrderStatuses);
        } else {
          setEnabledOrderStatuses(null);
        }
      } catch (error) {
        console.error('Error loading order status settings:', error);
        if (mounted) {
          setEnabledOrderStatuses(null);
        }
      }
    };

    loadStatusSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await api.getOrderAnalytics({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        status: filters.status || undefined,
        paymentStatus: filters.paymentStatus || undefined,
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, [filters.startDate, filters.endDate, filters.status, filters.paymentStatus]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh orders and analytics every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshOrdersSilently();
      fetchAnalytics();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refreshOrdersSilently, fetchAnalytics]);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      await api.exportOrdersToCSV({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        status: filters.status || undefined,
        paymentStatus: filters.paymentStatus || undefined,
      });
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      alert(error.message || 'Failed to export orders');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      await api.exportOrdersToPDF({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        status: filters.status || undefined,
        paymentStatus: filters.paymentStatus || undefined,
      });
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      alert(error.message || 'Failed to export orders');
    } finally {
      setExporting(false);
    }
  };

  // Memoize stats calculations to prevent unnecessary re-renders
  const stats = useMemo(() => {
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const processingCount = orders.filter(o => o.status === 'processing').length;
    const deliveredCount = orders.filter(o => o.status === 'delivered').length;
    const revenue = orders.reduce((sum, order) => sum + order.total, 0);
    
    return { pendingCount, processingCount, deliveredCount, revenue };
  }, [orders]);

  // Client-side search filter similar to Inventory route
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter((order) => {
      const idMatch = order.id?.toString().toLowerCase().includes(term);
      const customerMatch = order.customer?.toLowerCase().includes(term);
      const emailMatch = order.email?.toLowerCase().includes(term);
      return idMatch || customerMatch || emailMatch;
    });
  }, [orders, searchTerm]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      paymentStatus: '',
      startDate: '',
      endDate: '',
    });
    setSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    setSelectedOrders(
      selectedOrders.length === orders.length
        ? []
        : orders.map(order => order.id)
    );
  };

  if (loading) {
    return (
      <Layout currentPage="Orders">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-64"></div>
          <TableSkeleton rows={8} columns={6} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="Orders" pageTitle="Order Management">
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {analytics ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalOrders || 0}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{currencyFormatter(Number(analytics.totalRevenue || 0))}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900">{currencyFormatter(Number(analytics.averageOrderValue || 0))}</p>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Status Distribution</h4>
            <div className="flex flex-wrap gap-2">
              {visibleStatusValues.map((status) => {
                const count = analytics?.statusDistribution?.[status] || 0;
                return (
                  <span
                    key={status}
                    className={clsx(
                      'px-3 py-1 rounded-full text-sm',
                      statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800',
                    )}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Analytics</h3>
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
            <div className="h-1 bg-gray-200 rounded w-24 mx-auto"></div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label htmlFor="search-orders" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <input
                id="search-orders"
                name="search"
                type="text"
                placeholder="Order #, Email, Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="filter-order-status" className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
            <select
              id="filter-order-status"
              name="orderStatus"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              {orderStatusFilterOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-payment-status" className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              id="filter-payment-status"
              name="paymentStatus"
              value={filters.paymentStatus}
              onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">All Payment Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partially-paid">Partially Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="partially-refunded">Partially Refunded</option>
            </select>
          </div>
          <div>
            <label htmlFor="filter-start-date" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              id="filter-start-date"
              name="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="filter-end-date" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              id="filter-end-date"
              name="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>
        {(filters.status || filters.paymentStatus || filters.startDate || filters.endDate || searchTerm) && (
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

      {selectedOrders.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
          <span className="text-sm text-gray-500">{selectedOrders.length} selected</span>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            Bulk Actions
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                  <input
                    type="checkbox"
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 sm:left-6"
                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tracking
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsEditModalOpen(true);
                  }}
                  className={clsx(
                    'cursor-pointer',
                    selectedOrders.includes(order.id) && 'bg-gray-50'
                  )}
                >
                  <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                    {selectedOrders.includes(order.id) && (
                      <div className="absolute inset-y-0 left-0 w-0.5 bg-primary-600" />
                    )}
                    <input
                      type="checkbox"
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 sm:left-6"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.customer}</div>
                      <div className="text-sm text-gray-500">{order.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {currencyFormatter(Number(order.total || 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx('inline-flex px-2 py-1 text-xs font-semibold rounded-full', statusColors[order.status])}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx('inline-flex px-2 py-1 text-xs font-semibold rounded-full', paymentStatusColors[order.paymentStatus])}>
                      {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.trackingNumber ? (
                      <span className="font-mono text-xs">{order.trackingNumber}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'fulfilled' && order.paymentStatus !== 'paid' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrderToCancel(order);
                            setIsCancelModalOpen(true);
                          }}
                          className="tooltip tooltip-left text-red-600 hover:text-red-900"
                          data-tip="Cancel Order"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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

      {/* Edit Order Modal */}
      <EditOrderModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onSave={() => {
          fetchOrders();
        }}
        enabledOrderStatuses={enabledOrderStatuses ?? undefined}
      />

      {/* Cancel Order Modal */}
      {orderToCancel && (
        <CancelOrderModal
          isOpen={isCancelModalOpen}
          onClose={() => {
            setIsCancelModalOpen(false);
            setOrderToCancel(null);
          }}
          orderId={orderToCancel.orderId || orderToCancel.id}
          orderNumber={orderToCancel.orderNumber || orderToCancel.id}
          onSuccess={() => {
            fetchOrders();
          }}
        />
      )}
    </div>
    </Layout>
  );
}
