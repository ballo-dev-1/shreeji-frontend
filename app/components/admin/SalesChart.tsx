'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '@/app/lib/admin/api'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'

interface SalesChartProps {
  period?: 'daily' | 'weekly' | 'monthly'
  type?: 'revenue' | 'orders'
}

export default function SalesChart({ period = 'weekly', type = 'revenue' }: SalesChartProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSalesData()
  }, [period])

  const fetchSalesData = async () => {
    try {
      setLoading(true)
      const endDate = new Date()
      const startDate = new Date()
      
      // Calculate date range based on period
      if (period === 'daily') {
        startDate.setDate(endDate.getDate() - 7) // Last 7 days
      } else if (period === 'weekly') {
        startDate.setDate(endDate.getDate() - 42) // Last 6 weeks
      } else {
        startDate.setMonth(endDate.getMonth() - 6) // Last 6 months
      }

      let chartData: any[] = []

      try {
        // Try to fetch analytics data from the API
        const analytics = await api.getOrderAnalytics({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          groupBy: period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'
        })

        // Transform analytics data for chart
        // Handle different response formats from the API
        if (analytics?.data) {
          // If data is an array, use it directly or transform if needed
          const rawData = Array.isArray(analytics.data) ? analytics.data : [analytics.data]
          
          chartData = rawData.map((item: any) => {
            // Try multiple possible field names for period/label
            const periodValue = item.period || item.date || item.label || item.timePeriod || 
                              item.groupBy || item.timeLabel || item.periodLabel ||
                              item.day || item.week || item.month || // Try day/week/month directly
                              item.createdAt || item.created_at || // Try date fields
                              (item.startDate ? new Date(item.startDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                ...(period === 'monthly' ? { year: 'numeric' } : { day: 'numeric' })
                              }) : null) ||
                              'Unknown'
            
            // Ensure data has the expected structure for the chart
            return {
              period: periodValue,
              revenue: parseFloat(item.revenue || item.totalRevenue || item.amount || item.totalAmount || 0),
              orders: parseInt(item.orders || item.orderCount || item.count || 0)
            }
          }).filter((item: any) => {
            // Only filter out if period is Unknown AND no meaningful data
            if (item.period === 'Unknown' && item.revenue === 0 && item.orders === 0) {
              return false
            }
            return true
          })
          
          // If we still have "Unknown" periods, the API might not support grouping
          // Fall through to fallback calculation
          if (chartData.length > 0 && chartData.every(item => item.period === 'Unknown')) {
            console.warn('API returned data but no period labels. Falling back to order-based calculation.')
            throw new Error('No period labels in API response')
          }
        } else if (analytics && typeof analytics === 'object') {
          // If analytics is not wrapped in data property, check if it's already the array
          const rawData = Array.isArray(analytics) ? analytics : []
          chartData = rawData.map((item: any) => {
            const periodValue = item.period || item.date || item.label || item.timePeriod || 
                              item.groupBy || item.timeLabel || item.periodLabel ||
                              item.day || item.week || item.month ||
                              item.createdAt || item.created_at ||
                              (item.startDate ? new Date(item.startDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                ...(period === 'monthly' ? { year: 'numeric' } : { day: 'numeric' })
                              }) : null) ||
                              'Unknown'
            return {
              period: periodValue,
              revenue: parseFloat(item.revenue || item.totalRevenue || item.amount || item.totalAmount || 0),
              orders: parseInt(item.orders || item.orderCount || item.count || 0)
            }
          }).filter((item: any) => {
            if (item.period === 'Unknown' && item.revenue === 0 && item.orders === 0) {
              return false
            }
            return true
          })
          
          if (chartData.length > 0 && chartData.every(item => item.period === 'Unknown')) {
            console.warn('API returned data but no period labels. Falling back to order-based calculation.')
            throw new Error('No period labels in API response')
          }
        }
      } catch (analyticsError) {
        console.warn('Analytics API not available, falling back to calculating from orders:', analyticsError)
        
        // Fallback: Calculate statistics from orders
        try {
          const ordersResponse = await api.getOrders({
            pagination: { page: 1, pageSize: 1000 }
          })

          const allOrders = ordersResponse.data || []
          
          // Filter orders by date range on client side
          const orders = allOrders.filter((order: any) => {
            const orderDate = new Date(order.createdAt || order.created_at)
            return orderDate >= startDate && orderDate <= endDate
          })
          
          // Group orders by period with date tracking for proper sorting
          const grouped: Record<string, { revenue: number; orders: number; sortDate: Date }> = {}
          
          orders.forEach((order: any) => {
            const orderDate = new Date(order.createdAt || order.created_at)
            let periodKey = ''
            let sortDate: Date
            
            if (period === 'daily') {
              periodKey = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              sortDate = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate())
            } else if (period === 'weekly') {
              const weekStart = new Date(orderDate)
              weekStart.setDate(orderDate.getDate() - orderDate.getDay())
              weekStart.setHours(0, 0, 0, 0)
              periodKey = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              sortDate = weekStart
            } else {
              periodKey = orderDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              sortDate = new Date(orderDate.getFullYear(), orderDate.getMonth(), 1)
            }
            
            if (!grouped[periodKey]) {
              grouped[periodKey] = { revenue: 0, orders: 0, sortDate }
            }
            
            const amount = parseFloat(order.totalAmount || order.total_amount || 0)
            grouped[periodKey].revenue += amount
            grouped[periodKey].orders += 1
          })
          
          // Convert to array and sort by date (chronological order)
          chartData = Object.entries(grouped)
            .map(([period, stats]) => ({
              period,
              revenue: stats.revenue,
              orders: stats.orders,
              sortDate: stats.sortDate
            }))
            .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
            .map(({ sortDate, ...rest }) => rest) // Remove sortDate before setting state
        } catch (ordersError) {
          console.error('Error fetching orders for fallback calculation:', ordersError)
          chartData = []
        }
      }

      setData(chartData)
    } catch (error) {
      console.error('Error fetching sales data:', error)
      // Fallback to empty data
      setData([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center animate-pulse">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          <div className="h-1 bg-gray-200 rounded w-24 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>No sales data available</p>
      </div>
    )
  }

  if (type === 'revenue') {
    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="period" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `K${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => currencyFormatter(Number(value))}
              labelFormatter={(label: string) => `Period: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              name="Revenue"
              stroke="#807045" 
              strokeWidth={2}
              dot={{ fill: '#807045', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#807045', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="period" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={(value) => value.toString()}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: number) => `${value.toLocaleString()}`}
            labelFormatter={(label: string) => `Period: ${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="orders" 
            name="Orders"
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
