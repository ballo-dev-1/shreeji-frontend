'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'

export default function PortalProfilePage() {
  const { user, loading: authLoading, isAuthenticated, logout } = useClientAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/portal/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: ''
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      await clientApi.updateProfile(formData)
      setMessage('Profile updated successfully!')
    } catch (error: any) {
      setMessage('Error updating profile: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/portal/login')
  }

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
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
                />
              </div>
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
                />
              </div>
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
              className="block w-full rounded-2xl border border-[#dddddd] shadow-sm bg-gray-50 sm:text-sm px-4 py-3"
              />
              <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
              />
            </div>

            {message && (
              <div className={`rounded-md p-4 ${
                message.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
              }`}>
                {message}
              </div>
            )}

          <div className="flex justify-between pt-4">
              <button
                type="submit"
                disabled={saving}
              className="px-8 py-4 bg-[var(--shreeji-primary)] text-white rounded-2xl hover:opacity-90 disabled:opacity-50 shadow-lg transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
              className="px-8 py-4 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 shadow-md transition-all"
              >
                Logout
              </button>
            </div>
          </form>
      </div>
    </div>
  )
}

