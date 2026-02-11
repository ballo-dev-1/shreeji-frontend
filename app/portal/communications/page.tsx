'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'
import {
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

interface Communication {
  id: number
  communicationType: string
  status: string
  subject: string
  content?: string
  metadata: Record<string, any>
  sentAt?: string
  deliveredAt?: string
  openedAt?: string
  clickedAt?: string
  createdAt: string
}

const typeLabels: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  push_notification: 'Push Notification',
  in_app_notification: 'In-App Notification',
}

const typeIcons: Record<string, any> = {
  email: EnvelopeIcon,
  sms: DevicePhoneMobileIcon,
  push_notification: BellIcon,
  in_app_notification: BellIcon,
}

const statusLabels: Record<string, string> = {
  sent: 'Sent',
  delivered: 'Delivered',
  failed: 'Failed',
  bounced: 'Bounced',
  opened: 'Opened',
  clicked: 'Clicked',
}

const statusColors: Record<string, string> = {
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  bounced: 'bg-orange-100 text-orange-800',
  opened: 'bg-purple-100 text-purple-800',
  clicked: 'bg-indigo-100 text-indigo-800',
}

export default function CommunicationsPage() {
  const { loading: authLoading, isAuthenticated } = useClientAuth()
  const router = useRouter()
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/portal/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadCommunications()
    }
  }, [isAuthenticated, filter])

  const loadCommunications = async () => {
    try {
      setLoading(true)
      const params: any = { limit: 100 }
      if (filter !== 'all') {
        params.type = filter
      }
      const response = await clientApi.getCommunicationHistory(params)
      setCommunications(response.data || [])
    } catch (error: any) {
      console.error('Failed to load communications:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
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

  const getTypeIcon = (type: string) => {
    const Icon = typeIcons[type] || EnvelopeIcon
    return Icon
  }

  const uniqueTypes = Array.from(
    new Set(communications.map((c) => c.communicationType))
  )

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8]">
        <div className="space-y-4 animate-pulse">
          <div className="h-12 w-12 bg-gray-300 rounded-full mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Communication History</h1>
        <p className="mt-2 text-sm text-gray-500">
          View all emails, SMS, and notifications sent to you
        </p>
      </div>

      {/* Filter */}
      {uniqueTypes.length > 0 && (
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
              All
            </button>
            {uniqueTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  filter === type
                    ? 'bg-[var(--shreeji-primary)] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {typeLabels[type] || type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Communications List */}
      <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-6">
        {communications.length === 0 ? (
          <div className="text-center py-12">
            <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">No communications found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {communications.map((comm) => {
              const Icon = getTypeIcon(comm.communicationType)
              const statusColor = statusColors[comm.status] || statusColors.sent

              return (
                <div
                  key={comm.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500">
                            {typeLabels[comm.communicationType] || comm.communicationType}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
                            {statusLabels[comm.status] || comm.status}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(comm.sentAt || comm.createdAt)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{comm.subject}</h3>
                      {comm.content && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {comm.content}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {comm.deliveredAt && (
                          <span className="flex items-center space-x-1">
                            <CheckCircleIcon className="h-3 w-3" />
                            <span>Delivered: {formatDate(comm.deliveredAt)}</span>
                          </span>
                        )}
                        {comm.openedAt && (
                          <span className="flex items-center space-x-1">
                            <ClockIcon className="h-3 w-3" />
                            <span>Opened: {formatDate(comm.openedAt)}</span>
                          </span>
                        )}
                        {comm.clickedAt && (
                          <span className="flex items-center space-x-1">
                            <CheckCircleIcon className="h-3 w-3" />
                            <span>Clicked: {formatDate(comm.clickedAt)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

