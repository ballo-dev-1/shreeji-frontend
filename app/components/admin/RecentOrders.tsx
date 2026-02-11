'use client'

interface Order {
  id: string
  customer: string
  date: string
  amount: string
  status: string
  avatar: string
}

interface RecentOrdersProps {
  orders: Order[]
}

export default function RecentOrders({ orders }: RecentOrdersProps) {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'delivered':
      case 'fulfilled':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'due':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'shipped':
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Order No.</th>
              <th className="table-header">Customer</th>
              <th className="table-header">Date</th>
              <th className="table-header">Amount</th>
              <th className="table-header">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium text-primary-600">
                  {order.id}
                </td>
                <td className="table-cell">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-white">
                        {order.avatar}
                      </span>
                    </div>
                    {order.customer}
                  </div>
                </td>
                <td className="table-cell text-gray-500">{order.date}</td>
                <td className="table-cell font-medium">{order.amount}</td>
                <td className="table-cell">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
