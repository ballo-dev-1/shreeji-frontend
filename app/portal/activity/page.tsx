'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import RecentlyViewed from '@/app/components/products/RecentlyViewed'
import { ActivityPageSkeleton } from '@/app/components/ui/Skeletons'

interface Activity {
  id: number
  activityType: string
  description: string
  metadata: Record<string, any>
  ipAddress?: string
  createdAt: string
}

interface Session {
  id: number
  device: string
  location: string
  ipAddress: string
  lastActivityAt: string
  createdAt: string
  isActive: boolean
}

interface LoginHistoryEntry {
  id: number
  status: 'success' | 'failed'
  ipAddress: string
  location: string
  device: string
  failureReason?: string
  createdAt: string
}

const activityLabels: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  password_changed: 'Password Changed',
  password_reset: 'Password Reset',
  email_changed: 'Email Changed',
  profile_updated: 'Profile Updated',
  address_added: 'Address Added',
  address_updated: 'Address Updated',
  address_deleted: 'Address Deleted',
  payment_method_added: 'Payment Method Added',
  payment_method_deleted: 'Payment Method Deleted',
  order_placed: 'Order Placed',
  order_cancelled: 'Order Cancelled',
  return_requested: 'Return Requested',
  review_submitted: 'Review Submitted',
  wishlist_item_added: 'Wishlist Item Added',
  wishlist_item_removed: 'Wishlist Item Removed',
  settings_changed: 'Settings Changed',
}

const activityIcons: Record<string, any> = {
  login: CheckCircleIcon,
  logout: XCircleIcon,
  password_changed: InformationCircleIcon,
  password_reset: InformationCircleIcon,
  email_changed: InformationCircleIcon,
  profile_updated: InformationCircleIcon,
  order_placed: CheckCircleIcon,
  order_cancelled: XCircleIcon,
  return_requested: InformationCircleIcon,
  review_submitted: CheckCircleIcon,
  default: ClockIcon,
}

const activityColors: Record<string, string> = {
  login: 'text-green-600 bg-green-100',
  logout: 'text-gray-600 bg-gray-100',
  password_changed: 'text-blue-600 bg-blue-100',
  password_reset: 'text-blue-600 bg-blue-100',
  email_changed: 'text-yellow-600 bg-yellow-100',
  profile_updated: 'text-purple-600 bg-purple-100',
  order_placed: 'text-green-600 bg-green-100',
  order_cancelled: 'text-red-600 bg-red-100',
  return_requested: 'text-orange-600 bg-orange-100',
  review_submitted: 'text-indigo-600 bg-indigo-100',
  default: 'text-gray-600 bg-gray-100',
}

export default function ActivityPage() {
  const { loading: authLoading, isAuthenticated } = useClientAuth()
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [securityLoading, setSecurityLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/portal/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadSecurityData()
      loadActivities()
    }
  }, [isAuthenticated, filter])

  const loadSecurityData = async () => {
    try {
      setSecurityLoading(true)
      const [sessionsRes, historyRes] = await Promise.all([
        clientApi.getActiveSessions(),
        clientApi.getLoginHistory(),
      ])
      setSessions(sessionsRes.data || [])
      setLoginHistory(historyRes.data || [])
    } catch (error: any) {
      console.error('Failed to load security data:', error)
      toast.error(error.message || 'Failed to load security data')
    } finally {
      setSecurityLoading(false)
    }
  }

  const loadActivities = async () => {
    try {
      setLoading(true)
      const params: any = { limit: 100 }
      if (filter !== 'all') {
        params.type = filter
      }
      const response = await clientApi.getAccountActivities(params)
      setActivities(response.data || [])
    } catch (error: any) {
      console.error('Failed to load activities:', error)
      toast.error(error.message || 'Failed to load activities')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeSession = async (sessionId: number) => {
    if (!confirm('Are you sure you want to revoke this session?')) {
      return
    }

    try {
      await clientApi.revokeSession(sessionId)
      toast.success('Session revoked successfully')
      loadSecurityData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke session')
    }
  }

  const handleRevokeAllOthers = async () => {
    if (!confirm('Are you sure you want to revoke all other sessions? You will remain logged in on this device.')) {
      return
    }

    try {
      await clientApi.revokeAllOtherSessions()
      toast.success('All other sessions revoked successfully')
      loadSecurityData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke sessions')
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('mobile') || device.toLowerCase().includes('phone')) {
      return <DevicePhoneMobileIcon className="h-5 w-5" />
    }
    if (device.toLowerCase().includes('tablet')) {
      return <DevicePhoneMobileIcon className="h-5 w-5" />
    }
    return <ComputerDesktopIcon className="h-5 w-5" />
  }

  const getActivityIcon = (type: string) => {
    const Icon = activityIcons[type] || activityIcons.default
    return Icon
  }

  const getActivityColor = (type: string) => {
    return activityColors[type] || activityColors.default
  }

  const uniqueActivityTypes = Array.from(
    new Set(activities.map((a) => a.activityType))
  )

  if (authLoading || (loading && securityLoading)) {
    return <ActivityPageSkeleton />
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Account Activity</h1>
          <p className="mt-2 text-sm text-gray-500">
            View your recent account activities and changes
          </p>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Active Sessions</h2>
            <p className="text-sm text-gray-500 mt-1">
              These are the devices where you're currently logged in
            </p>
          </div>
          {sessions.length > 1 && (
            <button
              onClick={handleRevokeAllOthers}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-all"
              disabled={securityLoading}
            >
              Revoke All Others
            </button>
          )}
        </div>

        {securityLoading ? (
          <p className="text-gray-500 text-center py-8">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active sessions</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="text-gray-600">
                    {getDeviceIcon(session.device)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">{session.device}</p>
                      {session.id === sessions[0]?.id && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <GlobeAltIcon className="h-4 w-4" />
                        <span>{session.location}</span>
                      </span>
                      <span>{session.ipAddress}</span>
                      <span>Last active: {formatDateTime(session.lastActivityAt)}</span>
                    </div>
                  </div>
                </div>
                {session.id !== sessions[0]?.id && (
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    className="ml-4 px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-all"
                    disabled={securityLoading}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Login History */}
      <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Login History</h2>
          <p className="text-sm text-gray-500 mt-1">
            Recent login attempts to your account
          </p>
        </div>

        {securityLoading ? (
          <p className="text-gray-500 text-center py-8">Loading login history...</p>
        ) : loginHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No login history available</p>
        ) : (
          <div className="space-y-3">
            {loginHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`p-2 rounded-full ${
                    entry.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <ShieldCheckIcon className={`h-5 w-5 ${
                      entry.status === 'success' ? 'text-green-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className={`font-medium ${
                        entry.status === 'success' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {entry.status === 'success' ? 'Successful Login' : 'Failed Login'}
                      </p>
                      {entry.failureReason && (
                        <span className="text-xs text-gray-500">({entry.failureReason})</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <GlobeAltIcon className="h-4 w-4" />
                        <span>{entry.location}</span>
                      </span>
                      <span>{entry.ipAddress}</span>
                      <span>{entry.device}</span>
                      <span>{formatDateTime(entry.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter */}
      {uniqueActivityTypes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-4">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                filter === 'all'
                  ? 'bg-[var(--shreeji-primary)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Activities
            </button>
            {uniqueActivityTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  filter === type
                    ? 'bg-[var(--shreeji-primary)] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {activityLabels[type] || type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Activities List */}
      <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-6">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">No activities found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.activityType)
              const colorClass = getActivityColor(activity.activityType)

              return (
                <div
                  key={activity.id}
                  className="flex items-start space-x-4 p-4 border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">
                        {activityLabels[activity.activityType] || activity.activityType}
                      </p>
                      <span className="text-sm text-gray-500 ml-4">
                        {formatDate(activity.createdAt)}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    )}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        {activity.metadata.orderNumber && (
                          <span>Order: {activity.metadata.orderNumber}</span>
                        )}
                        {activity.metadata.field && (
                          <span>Field: {activity.metadata.field}</span>
                        )}
                        {activity.ipAddress && (
                          <span className="ml-4">IP: {activity.ipAddress}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recently Viewed Products */}
      <RecentlyViewed className="mt-8" />
    </div>
  )
}

