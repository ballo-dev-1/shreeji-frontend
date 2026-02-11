'use client'

import { useState, useEffect, useMemo } from 'react'
import Layout from './Layout'
import api from '@/app/lib/admin/api'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'
import { exportToCSV, exportToPDF } from '@/utils/reportExporter'
import ReportFilters from './reports/ReportFilters'
import ReportSummaryCards from './reports/ReportSummaryCards'
import RevenueChart from './reports/RevenueChart'
import OrdersChart from './reports/OrdersChart'
import ProductPerformanceChart from './reports/ProductPerformanceChart'
import PaymentMethodChart from './reports/PaymentMethodChart'
import CustomerSegmentationChart from './reports/CustomerSegmentationChart'
import CouponUsageChart from './reports/CouponUsageChart'
import { 
  DocumentArrowDownIcon,
  ChartBarIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  TagIcon,
  CubeIcon
} from '@heroicons/react/24/outline'

interface ReportData {
  period: string
  revenue: number
  orders: number
  customers: number
  averageOrderValue: number
}

type ReportType = 'sales' | 'products' | 'customers' | 'payments' | 'coupons' | 'inventory'

export default function AdminReports() {
  const [reportType, setReportType] = useState<ReportType>('sales')
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [comparisonEnabled, setComparisonEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Data states for all report types
  const [salesData, setSalesData] = useState<ReportData[]>([])
  const [previousSalesData, setPreviousSalesData] = useState<ReportData[]>([])
  const [productData, setProductData] = useState<any[]>([])
  const [customerData, setCustomerData] = useState<any[]>([])
  const [paymentData, setPaymentData] = useState<any[]>([])
  const [couponData, setCouponData] = useState<any[]>([])
  const [inventoryData, setInventoryData] = useState<any[]>([])

  useEffect(() => {
    fetchReportData()
  }, [reportType, period, dateRange, comparisonEnabled])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      if (reportType === 'sales') {
        const analytics = await api.getOrderAnalytics({
          startDate: new Date(dateRange.start).toISOString(),
          endDate: new Date(dateRange.end).toISOString(),
          groupBy: period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'
        })
        // Transform analytics data - ensure it's always an array
        const transformed = Array.isArray(analytics?.data) ? analytics.data : []
        setSalesData(transformed)
        
        // Fetch previous period data for comparison
        if (comparisonEnabled) {
          const daysDiff = Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24))
          const prevStart = new Date(new Date(dateRange.start).getTime() - daysDiff * 24 * 60 * 60 * 1000)
          const prevEnd = new Date(dateRange.start)
          
          const prevAnalytics = await api.getOrderAnalytics({
            startDate: prevStart.toISOString(),
            endDate: prevEnd.toISOString(),
            groupBy: period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'
          })
          const prevTransformed = Array.isArray(prevAnalytics?.data) ? prevAnalytics.data : []
          setPreviousSalesData(prevTransformed)
        } else {
          setPreviousSalesData([])
        }
      } else if (reportType === 'products') {
        // Fetch orders to calculate product performance
        const orders = await api.getOrders({ 
          pagination: { page: 1, pageSize: 500 },
          populate: ['items']
        })
        
        // Aggregate product performance
        const productPerformance: Record<string, any> = {}
        orders.data?.forEach((order: any) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const productId = item.productId || item.product?.id
              const productName = item.productName || item.product?.name || 'Unknown'
              
              if (productId) {
                if (!productPerformance[productId]) {
                  productPerformance[productId] = {
                    name: productName,
                    sold: 0,
                    revenue: 0,
                    orders: new Set(),
                    avgPrice: 0
                  }
                }
                productPerformance[productId].sold += item.quantity || 0
                productPerformance[productId].revenue += (item.quantity || 0) * (item.price || item.unitPrice || 0)
                productPerformance[productId].orders.add(order.id)
                productPerformance[productId].avgPrice = item.price || item.unitPrice || 0
              }
            })
          }
        })
        
        const products = Object.values(productPerformance).map((p: any) => ({
          name: p.name,
          sold: p.sold,
          revenue: p.revenue,
          orderCount: p.orders.size,
          avgPrice: p.avgPrice
        }))
        setProductData(products.sort((a, b) => b.revenue - a.revenue))
      } else if (reportType === 'customers') {
        const customers = await api.getCustomers({ pagination: { page: 1, pageSize: 500 } })
        const orders = await api.getOrders({ 
          pagination: { page: 1, pageSize: 500 },
          populate: ['customer']
        })
        
        // Calculate customer lifetime value
        const customerLTV: Record<string, any> = {}
        orders.data?.forEach((order: any) => {
          const customerId = order.customer?.id || order.customerId
          if (customerId) {
            if (!customerLTV[customerId]) {
              customerLTV[customerId] = {
                name: order.customer?.firstName && order.customer?.lastName
                  ? `${order.customer.firstName} ${order.customer.lastName}`
                  : order.customer?.email || 'Unknown',
                email: order.customer?.email || '',
                totalSpent: 0,
                orderCount: 0,
                avgOrderValue: 0,
                firstOrder: order.createdAt,
                lastOrder: order.createdAt
              }
            }
            customerLTV[customerId].totalSpent += order.totalAmount || order.total_amount || 0
            customerLTV[customerId].orderCount += 1
            if (new Date(order.createdAt) < new Date(customerLTV[customerId].firstOrder)) {
              customerLTV[customerId].firstOrder = order.createdAt
            }
            if (new Date(order.createdAt) > new Date(customerLTV[customerId].lastOrder)) {
              customerLTV[customerId].lastOrder = order.createdAt
            }
          }
        })
        
        const customersData = Object.values(customerLTV).map((c: any) => ({
          ...c,
          avgOrderValue: c.orderCount > 0 ? c.totalSpent / c.orderCount : 0
        })).sort((a, b) => b.totalSpent - a.totalSpent)
        
        setCustomerData(customersData)
      } else if (reportType === 'payments') {
        const payments = await api.getPayments({
          pagination: { page: 1, pageSize: 500 },
          filters: {
            startDate: dateRange.start,
            endDate: dateRange.end
          }
        })
        setPaymentData(payments.data || [])
      } else if (reportType === 'coupons') {
        const coupons = await api.getCoupons({
          pagination: { page: 1, pageSize: 500 }
        })
        
        // Get orders to calculate coupon usage
        const orders = await api.getOrders({
          pagination: { page: 1, pageSize: 500 },
          populate: ['items']
        })
        
        // Calculate coupon usage from orders
        const couponUsage: Record<string, any> = {}
        orders.data?.forEach((order: any) => {
          if (order.couponCode || order.coupon?.code) {
            const code = order.couponCode || order.coupon?.code
            if (!couponUsage[code]) {
              couponUsage[code] = {
                code,
                usage: 0,
                discountAmount: 0,
                revenue: 0
              }
            }
            couponUsage[code].usage += 1
            couponUsage[code].discountAmount += order.discountAmount || 0
            couponUsage[code].revenue += order.totalAmount || order.total_amount || 0
          }
        })
        
        // Merge with coupon data
        const couponsWithUsage = (coupons.data || []).map((coupon: any) => {
          const usage = couponUsage[coupon.code || coupon.couponCode] || { usage: 0, discountAmount: 0, revenue: 0 }
          return {
            ...coupon,
            ...usage
          }
        })
        
        setCouponData(couponsWithUsage)
      } else if (reportType === 'inventory') {
        // Link to inventory reports - fetch key metrics
        try {
          const stockReport: any = await api.getStockLevelReport()
          setInventoryData(stockReport?.data || [])
        } catch (error) {
          console.error('Error fetching inventory data:', error)
          setInventoryData([])
        }
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'csv' | 'pdf') => {
    try {
      let exportData: { headers: string[]; rows: (string | number)[][]; title: string; dateRange: { start: string; end: string } }
      
      if (reportType === 'sales') {
        const safeData = Array.isArray(salesData) ? salesData : []
        exportData = {
          title: 'Sales Report',
          dateRange,
          headers: ['Period', 'Revenue', 'Orders', 'Customers', 'Avg Order Value'],
          rows: safeData.map(item => [
            item.period || '',
            item.revenue || 0,
            item.orders || 0,
            item.customers || 0,
            item.averageOrderValue || 0
          ])
        }
      } else if (reportType === 'products') {
        exportData = {
          title: 'Product Performance Report',
          dateRange,
          headers: ['Product Name', 'Units Sold', 'Revenue', 'Orders', 'Avg Price'],
          rows: productData.map(item => [
            item.name || '',
            item.sold || 0,
            item.revenue || 0,
            item.orderCount || 0,
            item.avgPrice || 0
          ])
        }
      } else if (reportType === 'customers') {
        exportData = {
          title: 'Customer Analytics Report',
          dateRange,
          headers: ['Customer', 'Email', 'Total Spent', 'Orders', 'Avg Order Value', 'Last Order'],
          rows: customerData.map(item => [
            item.name || '',
            item.email || '',
            item.totalSpent || 0,
            item.orderCount || 0,
            item.avgOrderValue || 0,
            item.lastOrder ? new Date(item.lastOrder).toLocaleDateString() : ''
          ])
        }
      } else if (reportType === 'payments') {
        exportData = {
          title: 'Payment Report',
          dateRange,
          headers: ['Payment Method', 'Amount', 'Status', 'Date'],
          rows: paymentData.map((item: any) => [
            item.method || item.paymentMethod || '',
            item.amount || 0,
            item.status || '',
            item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''
          ])
        }
      } else if (reportType === 'coupons') {
        exportData = {
          title: 'Coupon Report',
          dateRange,
          headers: ['Coupon Code', 'Usage', 'Discount Amount', 'Revenue Generated'],
          rows: couponData.map((item: any) => [
            item.code || item.couponCode || '',
            item.usage || 0,
            item.discountAmount || 0,
            item.revenue || 0
          ])
        }
      } else {
        exportData = {
          title: 'Inventory Report',
          dateRange,
          headers: ['Product', 'Stock Level', 'Value'],
          rows: inventoryData.map((item: any) => [
            item.productName || item.name || '',
            item.stockLevel || item.quantity || 0,
            item.value || 0
          ])
        }
      }
      
      if (format === 'csv') {
        exportToCSV(exportData)
      } else {
        exportToPDF(exportData)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Failed to export report. Please try again.')
    }
  }

  // Calculate summary metrics for each report type
  const safeSalesData = Array.isArray(salesData) ? salesData : []
  const totalRevenue = safeSalesData.reduce((sum, item) => sum + (item.revenue || 0), 0)
  const totalOrders = safeSalesData.reduce((sum, item) => sum + (item.orders || 0), 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  
  // Calculate previous period metrics for comparison
  const previousRevenue = Array.isArray(previousSalesData) 
    ? previousSalesData.reduce((sum, item) => sum + (item.revenue || 0), 0)
    : 0
  const revenueChange = previousRevenue > 0 
    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
    : 0
  
  // Product metrics
  const totalProductsSold = productData.reduce((sum, item) => sum + (item.sold || 0), 0)
  const totalProductRevenue = productData.reduce((sum, item) => sum + (item.revenue || 0), 0)
  const topProductRevenue = productData.length > 0 ? productData[0]?.revenue || 0 : 0
  
  // Customer metrics
  const totalCustomers = customerData.length
  const totalCustomerSpent = customerData.reduce((sum, item) => sum + (item.totalSpent || 0), 0)
  const avgLTV = totalCustomers > 0 ? totalCustomerSpent / totalCustomers : 0
  
  // Payment metrics
  const totalPayments = paymentData.length
  const totalPaymentAmount = paymentData.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
  const successfulPayments = paymentData.filter((item: any) => 
    item.status === 'completed' || item.status === 'success' || item.paymentStatus === 'paid'
  ).length
  const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0
  
  // Coupon metrics
  const totalCouponsUsed = couponData.reduce((sum, item: any) => sum + (item.usage || 0), 0)
  const totalDiscountAmount = couponData.reduce((sum, item: any) => sum + (item.discountAmount || 0), 0)
  const totalCouponRevenue = couponData.reduce((sum, item: any) => sum + (item.revenue || 0), 0)
  
  // Prepare chart data
  const revenueChartData = safeSalesData.map((item, index) => ({
    period: item.period || `Period ${index + 1}`,
    revenue: item.revenue || 0,
    previousRevenue: comparisonEnabled && previousSalesData[index] ? previousSalesData[index].revenue : undefined
  }))
  
  const ordersChartData = safeSalesData.map((item, index) => ({
    period: item.period || `Period ${index + 1}`,
    orders: item.orders || 0,
    previousOrders: comparisonEnabled && previousSalesData[index] ? previousSalesData[index].orders : undefined
  }))
  
  // Payment method breakdown
  const paymentMethodData = useMemo(() => {
    const methodMap: Record<string, { value: number; count: number }> = {}
    paymentData.forEach((item: any) => {
      const method = item.method || item.paymentMethod || 'Unknown'
      if (!methodMap[method]) {
        methodMap[method] = { value: 0, count: 0 }
      }
      methodMap[method].value += item.amount || 0
      methodMap[method].count += 1
    })
    return Object.entries(methodMap).map(([name, data]) => ({
      name,
      value: data.value,
      count: data.count
    }))
  }, [paymentData])
  
  // Customer segmentation
  const customerSegments = useMemo(() => {
    const segments = {
      VIP: { count: 0, totalValue: 0, avgValue: 0 },
      Regular: { count: 0, totalValue: 0, avgValue: 0 },
      New: { count: 0, totalValue: 0, avgValue: 0 }
    }
    
    customerData.forEach((customer: any) => {
      const spent = customer.totalSpent || 0
      const orders = customer.orderCount || 0
      
      if (spent >= 10000 || orders >= 10) {
        segments.VIP.count += 1
        segments.VIP.totalValue += spent
      } else if (orders >= 3) {
        segments.Regular.count += 1
        segments.Regular.totalValue += spent
      } else {
        segments.New.count += 1
        segments.New.totalValue += spent
      }
    })
    
    return Object.entries(segments).map(([segment, data]) => ({
      segment,
      count: data.count,
      totalValue: data.totalValue,
      avgValue: data.count > 0 ? data.totalValue / data.count : 0
    }))
  }, [customerData])

  return (
    <Layout currentPage="Reports" pageTitle="Reports">
      <div className="space-y-6">
        {/* Report Type Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setReportType('sales')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              reportType === 'sales'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ChartBarIcon className="w-5 h-5 inline-block mr-2" />
            Sales Reports
          </button>
          <button
            onClick={() => setReportType('products')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              reportType === 'products'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingBagIcon className="w-5 h-5 inline-block mr-2" />
            Product Performance
          </button>
          <button
            onClick={() => setReportType('customers')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              reportType === 'customers'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserGroupIcon className="w-5 h-5 inline-block mr-2" />
            Customer Analytics
          </button>
          <button
            onClick={() => setReportType('payments')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              reportType === 'payments'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCardIcon className="w-5 h-5 inline-block mr-2" />
            Payment Reports
          </button>
          <button
            onClick={() => setReportType('coupons')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              reportType === 'coupons'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <TagIcon className="w-5 h-5 inline-block mr-2" />
            Coupon Reports
          </button>
          <button
            onClick={() => setReportType('inventory')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              reportType === 'inventory'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CubeIcon className="w-5 h-5 inline-block mr-2" />
            Inventory Reports
          </button>
        </div>

        {/* Filters */}
        <ReportFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          period={period}
          onPeriodChange={setPeriod}
          showPeriodSelector={reportType === 'sales' || reportType === 'products' || reportType === 'customers'}
          showComparison={reportType === 'sales'}
          comparisonEnabled={comparisonEnabled}
          onComparisonToggle={setComparisonEnabled}
          additionalFilters={
            <div className="flex items-end gap-2 mt-4">
                <button
                  onClick={() => exportReport('csv')}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
                >
                  <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                  Export CSV
                </button>
                <button
                  onClick={() => exportReport('pdf')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
                >
                  <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                  Export PDF
                </button>
              </div>
          }
        />

        {/* Summary Cards */}
        {reportType === 'sales' && (
          <ReportSummaryCards
            cards={[
              {
                label: 'Total Revenue',
                value: totalRevenue,
                change: comparisonEnabled ? { value: revenueChange, isPositive: revenueChange >= 0 } : undefined
              },
              { label: 'Total Orders', value: totalOrders },
              { label: 'Avg Order Value', value: avgOrderValue },
              { label: 'Periods', value: safeSalesData.length }
            ]}
          />
        )}
        
        {reportType === 'products' && (
          <ReportSummaryCards
            cards={[
              { label: 'Total Products Sold', value: totalProductsSold },
              { label: 'Total Revenue', value: totalProductRevenue },
              { label: 'Top Product Revenue', value: topProductRevenue },
              { label: 'Products Tracked', value: productData.length }
            ]}
          />
        )}
        
        {reportType === 'customers' && (
          <ReportSummaryCards
            cards={[
              { label: 'Total Customers', value: totalCustomers },
              { label: 'Total Customer Value', value: totalCustomerSpent },
              { label: 'Average LTV', value: avgLTV },
              { label: 'Active Customers', value: customerData.filter((c: any) => (c.orderCount || 0) > 0).length }
            ]}
          />
        )}
        
        {reportType === 'payments' && (
          <ReportSummaryCards
            cards={[
              { label: 'Total Payments', value: totalPayments },
              { label: 'Total Amount', value: totalPaymentAmount },
              { label: 'Success Rate', value: `${successRate.toFixed(1)}%` },
              { label: 'Successful Payments', value: successfulPayments }
            ]}
          />
        )}
        
        {reportType === 'coupons' && (
          <ReportSummaryCards
            cards={[
              { label: 'Total Coupons Used', value: totalCouponsUsed },
              { label: 'Total Discount Amount', value: totalDiscountAmount },
              { label: 'Revenue Generated', value: totalCouponRevenue },
              { label: 'Active Coupons', value: couponData.length }
            ]}
          />
        )}
        
        {reportType === 'inventory' && (
          <ReportSummaryCards
            cards={[
              { label: 'Total Items', value: inventoryData.length },
              { label: 'Total Value', value: inventoryData.reduce((sum: number, item: any) => sum + (item.value || 0), 0) },
              { label: 'Low Stock Items', value: inventoryData.filter((item: any) => (item.stockLevel || 0) < (item.reorderPoint || 10)).length },
              { label: 'Out of Stock', value: inventoryData.filter((item: any) => (item.stockLevel || 0) === 0).length }
            ]}
          />
        )}

        {/* Charts Section */}
        {!loading && reportType === 'sales' && revenueChartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
              <RevenueChart data={revenueChartData} showComparison={comparisonEnabled} />
            </div>
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders Trend</h3>
              <OrdersChart data={ordersChartData} showComparison={comparisonEnabled} />
            </div>
          </div>
        )}
        
        {!loading && reportType === 'products' && productData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Revenue</h3>
              <ProductPerformanceChart data={productData} type="revenue" limit={10} />
            </div>
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Quantity</h3>
              <ProductPerformanceChart data={productData} type="quantity" limit={10} />
            </div>
          </div>
        )}
        
        {!loading && reportType === 'customers' && customerSegments.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segmentation</h3>
            <CustomerSegmentationChart data={customerSegments} type="bar" />
          </div>
        )}
        
        {!loading && reportType === 'payments' && paymentMethodData.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method Breakdown</h3>
            <PaymentMethodChart data={paymentMethodData} />
          </div>
        )}
        
        {!loading && reportType === 'coupons' && couponData.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Coupon Usage</h3>
            <CouponUsageChart data={couponData} type="usage" />
          </div>
        )}

        {/* Report Data Table */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {reportType === 'sales' && 'Sales Report'}
            {reportType === 'products' && 'Product Performance Report'}
            {reportType === 'customers' && 'Customer Analytics Report'}
            {reportType === 'payments' && 'Payment Report'}
            {reportType === 'coupons' && 'Coupon Report'}
            {reportType === 'inventory' && 'Inventory Report'}
          </h3>
          
          {loading ? (
            <div className="space-y-2 animate-pulse py-12">
              <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
              <div className="h-1 bg-gray-200 rounded w-24 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {reportType === 'sales' && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Period</th>
                      <th className="table-header">Revenue</th>
                      <th className="table-header">Orders</th>
                      <th className="table-header">Customers</th>
                      <th className="table-header">Avg Order Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {safeSalesData.length > 0 ? (
                      safeSalesData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="table-cell">{row.period || `Period ${index + 1}`}</td>
                          <td className="table-cell">{currencyFormatter(Number(row.revenue || 0))}</td>
                          <td className="table-cell">{row.orders || 0}</td>
                          <td className="table-cell">{row.customers || 0}</td>
                          <td className="table-cell">
                            {currencyFormatter(Number(row.averageOrderValue || 0))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="table-cell text-center text-gray-500 py-8">
                          No sales data available for the selected period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'products' && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Product Name</th>
                      <th className="table-header">Units Sold</th>
                      <th className="table-header">Revenue</th>
                      <th className="table-header">Orders</th>
                      <th className="table-header">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productData.length > 0 ? (
                      productData.map((product, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="table-cell font-medium">{product.name}</td>
                          <td className="table-cell">{product.sold}</td>
                          <td className="table-cell">{currencyFormatter(Number(product.revenue || 0))}</td>
                          <td className="table-cell">{product.orderCount}</td>
                          <td className="table-cell">{currencyFormatter(Number(product.avgPrice || 0))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="table-cell text-center text-gray-500 py-8">
                          No product performance data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'customers' && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Customer</th>
                      <th className="table-header">Email</th>
                      <th className="table-header">Total Spent</th>
                      <th className="table-header">Orders</th>
                      <th className="table-header">Avg Order Value</th>
                      <th className="table-header">Last Order</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customerData.length > 0 ? (
                      customerData.map((customer, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="table-cell font-medium">{customer.name}</td>
                          <td className="table-cell">{customer.email}</td>
                          <td className="table-cell">{currencyFormatter(Number(customer.totalSpent || 0))}</td>
                          <td className="table-cell">{customer.orderCount}</td>
                          <td className="table-cell">{currencyFormatter(Number(customer.avgOrderValue || 0))}</td>
                          <td className="table-cell">
                            {new Date(customer.lastOrder).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="table-cell text-center text-gray-500 py-8">
                          No customer data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'payments' && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Payment Method</th>
                      <th className="table-header">Amount</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Date</th>
                      <th className="table-header">Order ID</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentData.length > 0 ? (
                      paymentData.map((payment: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="table-cell font-medium">{payment.method || payment.paymentMethod || 'Unknown'}</td>
                          <td className="table-cell">{currencyFormatter(Number(payment.amount || 0))}</td>
                          <td className="table-cell">
                            <span className={`px-2 py-1 rounded text-xs ${
                              payment.status === 'completed' || payment.status === 'success' || payment.paymentStatus === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : payment.status === 'failed' || payment.paymentStatus === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {payment.status || payment.paymentStatus || 'Pending'}
                            </span>
                          </td>
                          <td className="table-cell">
                            {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="table-cell">{payment.orderId || payment.order?.id || 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="table-cell text-center text-gray-500 py-8">
                          No payment data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'coupons' && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Coupon Code</th>
                      <th className="table-header">Usage</th>
                      <th className="table-header">Discount Amount</th>
                      <th className="table-header">Revenue Generated</th>
                      <th className="table-header">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {couponData.length > 0 ? (
                      couponData.map((coupon: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="table-cell font-medium">{coupon.code || coupon.couponCode || 'N/A'}</td>
                          <td className="table-cell">{coupon.usage || 0}</td>
                          <td className="table-cell">{currencyFormatter(Number(coupon.discountAmount || 0))}</td>
                          <td className="table-cell">{currencyFormatter(Number(coupon.revenue || 0))}</td>
                          <td className="table-cell">
                            <span className={`px-2 py-1 rounded text-xs ${
                              coupon.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {coupon.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="table-cell text-center text-gray-500 py-8">
                          No coupon data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'inventory' && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Product</th>
                      <th className="table-header">Stock Level</th>
                      <th className="table-header">Reorder Point</th>
                      <th className="table-header">Value</th>
                      <th className="table-header">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryData.length > 0 ? (
                      inventoryData.map((item: any, index: number) => {
                        const stockLevel = item.stockLevel || item.quantity || 0
                        const reorderPoint = item.reorderPoint || 10
                        const status = stockLevel === 0 ? 'Out of Stock' : stockLevel < reorderPoint ? 'Low Stock' : 'In Stock'
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="table-cell font-medium">{item.productName || item.name || 'Unknown'}</td>
                            <td className="table-cell">{stockLevel}</td>
                            <td className="table-cell">{reorderPoint}</td>
                            <td className="table-cell">{currencyFormatter(Number(item.value || 0))}</td>
                            <td className="table-cell">
                              <span className={`px-2 py-1 rounded text-xs ${
                                status === 'Out of Stock'
                                  ? 'bg-red-100 text-red-800'
                                  : status === 'Low Stock'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="table-cell text-center text-gray-500 py-8">
                          No inventory data available. <a href="/admin/inventory/reports" className="text-primary-600 hover:underline">View detailed inventory reports</a>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

