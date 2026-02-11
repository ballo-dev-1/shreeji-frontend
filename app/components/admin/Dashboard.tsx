'use client'

import { useState, useEffect } from 'react'
import Layout from './Layout'
import StatCard from './StatCard'
import RecentOrders from './RecentOrders'
import TopProducts from './TopProducts'
import SalesChart from './SalesChart'
import api from '@/app/lib/admin/api'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'
import { 
  CubeIcon, 
  UsersIcon, 
  ShoppingBagIcon, 
  CurrencyDollarIcon 
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  inventoryValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [revenueChartPeriod, setRevenueChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [ordersChartPeriod, setOrdersChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [revenueTrend, setRevenueTrend] = useState<{ current: number; previous: number; change: number } | null>(null)
  const [customerMetrics, setCustomerMetrics] = useState<{ newCustomers: number; totalCustomers: number; growth: number } | null>(null)
  const [conversionRate, setConversionRate] = useState<{ rate: number; trend: number } | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all dashboard data in parallel
      const [statsData, ordersData, productsData, analyticsData, customersData] = await Promise.all([
        api.getDashboardStats(),
        api.getOrders({ pagination: { page: 1, pageSize: 5 }, populate: ['customer'] }),
        api.getProducts({ pagination: { page: 1, pageSize: 5 } }),
        api.getOrderAnalytics().catch(() => null), // Optional analytics
        api.getCustomers({ pagination: { page: 1, pageSize: 100 } }).catch(() => null) // For customer metrics
      ])

      // Calculate revenue trend if analytics available
      if (analyticsData?.data) {
        const currentPeriod = analyticsData.data[analyticsData.data.length - 1]
        const previousPeriod = analyticsData.data[analyticsData.data.length - 2]
        if (currentPeriod && previousPeriod) {
          const currentRevenue = currentPeriod.revenue || 0
          const previousRevenue = previousPeriod.revenue || 0
          const change = previousRevenue > 0 
            ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
            : 0
          setRevenueTrend({ current: currentRevenue, previous: previousRevenue, change })
        }
      }

      // Calculate customer metrics
      if (customersData?.data) {
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        
        const allCustomers = Array.isArray(customersData.data) ? customersData.data : []
        const newCustomers = allCustomers.filter((customer: any) => {
          const createdAt = new Date(customer.createdAt || customer.created_at)
          return createdAt >= thirtyDaysAgo
        }).length
        
        const totalCustomers = allCustomers.length
        const previousTotal = Math.max(0, totalCustomers - newCustomers)
        const growth = previousTotal > 0 ? ((newCustomers / previousTotal) * 100) : 0
        
        setCustomerMetrics({
          newCustomers,
          totalCustomers,
          growth
        })
      }

      setStats(statsData)
        
        // Transform orders data
        const transformedOrders = ordersData.data?.map((order: any) => ({
          id: order.orderNumber || `#${order.id}`,
          customer: order.customer?.firstName && order.customer?.lastName 
            ? `${order.customer.firstName} ${order.customer.lastName}`
            : 'Unknown Customer',
          date: new Date(order.createdAt).toLocaleDateString(),
          amount: currencyFormatter(Number(order.totalAmount || order.total_amount || 0)),
          status: order.orderStatus || 'pending',
          paymentStatus: order.paymentStatus || 'pending'
        })) || []

        setOrders(transformedOrders)

        // Fetch top-selling products from orders
        let transformedProducts: any[] = []
        try {
          const allOrders = await api.getOrders({ 
            pagination: { page: 1, pageSize: 100 },
            populate: ['items']
          })
          
          // Aggregate product sales from order items
          const productSales: Record<string, { name: string; sold: number; revenue: number; price: number }> = {}
          
          allOrders.data?.forEach((order: any) => {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((item: any) => {
                const productId = item.productId || item.product?.id
                const productName = item.productName || item.product?.name || 'Unknown Product'
                const quantity = item.quantity || 0
                const price = item.price || item.unitPrice || 0
                const revenue = quantity * price
                
                if (productId) {
                  if (!productSales[productId]) {
                    productSales[productId] = {
                      name: productName,
                      sold: 0,
                      revenue: 0,
                      price: price
                    }
                  }
                  productSales[productId].sold += quantity
                  productSales[productId].revenue += revenue
                }
              })
            }
          })
          
          // Sort by revenue and take top 5
          const topProductsList = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
            .map(product => ({
              name: product.name,
              price: currencyFormatter(Number(product.price || 0)),
              revenue: currencyFormatter(Number(product.revenue || 0)),
              sold: product.sold
            }))
          
          if (topProductsList.length > 0) {
            setTopProducts(topProductsList)
          } else {
            // Fallback to stock-based data
            transformedProducts = productsData.data?.map((product: any) => ({
              name: product.name,
              price: product.price,
              revenue: currencyFormatter(Number((product.stockQuantity || 0) * (product.basePrice || 0))),
              sold: product.stockQuantity || 0,
              stockStatus: product.stockStatus
            })) || []
            setTopProducts(transformedProducts)
          }
        } catch (error) {
          console.error('Error fetching top products:', error)
          // Fallback to stock-based data
          transformedProducts = productsData.data?.map((product: any) => ({
            name: product.name,
            price: product.price,
            revenue: `K${((product.stockQuantity || 0) * (product.basePrice || 0)).toLocaleString()}`,
            sold: product.stockQuantity || 0,
            stockStatus: product.stockStatus
          })) || []
          setTopProducts(transformedProducts)
        }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      // Keep mock data as fallback
      setStats({
        totalProducts: 25,
        totalCustomers: 4,
        totalOrders: 1,
        totalRevenue: 0,
        inventoryValue: 1592500,
        lowStockProducts: 2,
        outOfStockProducts: 1,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Refresh dashboard data every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Layout currentPage="Dashboard">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPage="Dashboard" pageTitle="Dashboard">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Products"
            value={stats?.totalProducts.toString() || "0"}
            icon={<CubeIcon className="w-6 h-6" />}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
            href="/admin/products"
          />
          <StatCard
            title="Total Customers"
            value={stats?.totalCustomers.toString() || "0"}
            subtitle={customerMetrics ? `${customerMetrics.newCustomers} new (30d)` : undefined}
            icon={<UsersIcon className="w-6 h-6" />}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
            href="/admin/customers"
          />
          <StatCard
            title="Total Orders"
            value={stats?.totalOrders.toString() || "0"}
            icon={<ShoppingBagIcon className="w-6 h-6" />}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
            href="/admin/orders"
          />
          <StatCard
            title="Total Revenue"
            value={currencyFormatter(Number(stats?.totalRevenue || 0))}
            subtitle={revenueTrend ? `Trend: ${revenueTrend.change >= 0 ? '+' : ''}${revenueTrend.change.toFixed(1)}%` : undefined}
            icon={<CurrencyDollarIcon className="w-6 h-6" />}
            iconBgColor="bg-yellow-100"
            iconColor="text-yellow-600"
            href="/admin/reports"
          />
        </div>

        {/* Additional Metrics */}
        {conversionRate && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {conversionRate.rate.toFixed(2)}%
                  </p>
                  {conversionRate.trend !== 0 && (
                    <p className={`text-sm mt-1 ${conversionRate.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {conversionRate.trend >= 0 ? '↑' : '↓'} {Math.abs(conversionRate.trend).toFixed(1)}% vs previous period
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">K</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Inventory Value</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {currencyFormatter(Number(stats?.inventoryValue || 0))}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 font-semibold">⚠</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {stats?.lowStockProducts || "0"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-semibold">!</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Out of Stock</p>
                <p className="text-2xl font-semibold text-red-600">
                  {stats?.outOfStockProducts || "0"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Chart Card */}
          <div className="card p-6 pb-14">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Revenue Statistics</h3>
                {revenueTrend && (
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-gray-500">Revenue Trend: </span>
                    <span className={`text-sm font-medium ml-1 ${revenueTrend.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {revenueTrend.change >= 0 ? '↑' : '↓'} {Math.abs(revenueTrend.change).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setRevenueChartPeriod('daily')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    revenueChartPeriod === 'daily' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Daily
                </button>
                <button 
                  onClick={() => setRevenueChartPeriod('weekly')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    revenueChartPeriod === 'weekly' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Weekly
                </button>
                <button 
                  onClick={() => setRevenueChartPeriod('monthly')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    revenueChartPeriod === 'monthly' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
            <SalesChart period={revenueChartPeriod} type="revenue" />
          </div>

          {/* Orders Chart Card */}
          <div className="card p-6 pb-14">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Orders Statistics</h3>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setOrdersChartPeriod('daily')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    ordersChartPeriod === 'daily' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Daily
                </button>
                <button 
                  onClick={() => setOrdersChartPeriod('weekly')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    ordersChartPeriod === 'weekly' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Weekly
                </button>
                <button 
                  onClick={() => setOrdersChartPeriod('monthly')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    ordersChartPeriod === 'monthly' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
            <SalesChart period={ordersChartPeriod} type="orders" />
          </div>
        </div>

        {/* Recent Orders and Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RecentOrders orders={orders} />
          <TopProducts products={topProducts} />
        </div>
      </div>
    </Layout>
  )
}
