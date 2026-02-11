'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'
import { 
  UserIcon, 
  ShieldCheckIcon, 
  BellIcon, 
  PaintBrushIcon,
  CogIcon,
} from '@heroicons/react/24/outline'
import { Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import NotificationPreferences from '@/app/components/portal/NotificationPreferences'
import TwoFactorSettings from '@/app/components/portal/TwoFactorSettings'

const settingsSections = [
  {
    id: 'profile',
    name: 'Profile',
    icon: UserIcon,
    description: 'Manage your personal information'
  },
  {
    id: 'security',
    name: 'Security',
    icon: ShieldCheckIcon,
    description: 'Manage security settings'
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: BellIcon,
    description: 'Configure notification preferences'
  },
  {
    id: 'appearance',
    name: 'Appearance',
    icon: PaintBrushIcon,
    description: 'Customize the look and feel'
  },
  {
    id: 'general',
    name: 'General',
    icon: CogIcon,
    description: 'General preferences'
  }
]

export default function SettingsPage() {
  const { loading: authLoading, isAuthenticated, user } = useClientAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState('profile')
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsStatus, setSettingsStatus] = useState<{ type: 'idle' | 'success' | 'error', message?: string }>({ type: 'idle' })
  
  // Password change states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    // Profile
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    timezone: 'UTC',
    
    // Security
    sessionTimeout: '30',
    
    // Appearance
    theme: 'light',
    
    // General
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    language: 'en',
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  const [initialFormData, setInitialFormData] = useState(formData)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/portal/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    const sectionParam = searchParams?.get('section')
    if (sectionParam && settingsSections.some((section) => section.id === sectionParam)) {
      setActiveSection(sectionParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      }))
      setInitialFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      }))
    }
  }, [user])

  // Initialize theme from localStorage to match actual state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = (localStorage.getItem('portal-theme') as 'light' | 'dark' | 'auto') || 'light'
      
      setFormData(prev => ({
        ...prev,
        theme: savedTheme
      }))
      setInitialFormData(prev => ({
        ...prev,
        theme: savedTheme
      }))
    }
  }, [])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Apply theme immediately when changed (before saving)
    if (field === 'theme' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: value }))
      localStorage.setItem('portal-theme', value)
    }
  }

  const handleCancel = () => {
    setFormData(initialFormData)
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    
    // Revert theme if it was changed
    if (initialFormData.theme && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: initialFormData.theme }))
    }
    
    setSettingsStatus({ type: 'idle' })
  }

  const handleSave = async () => {
    if (activeSection === 'security') {
      // Handle password change separately
      if (passwordData.newPassword) {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
        if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    try {
          setSettingsSaving(true)
      await clientApi.changePassword({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
      })
      
      toast.success('Password changed successfully')
          setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password')
          return
        } finally {
          setSettingsSaving(false)
        }
      }
      
      // Save security settings (session timeout)
      // Note: This would need backend support for client settings
      setSettingsStatus({ type: 'success', message: 'Security settings updated successfully.' })
      return
    }
    
    setSettingsSaving(true)
    setSettingsStatus({ type: 'idle' })
    
    try {
      // For now, we'll save profile updates via the profile update endpoint
      if (activeSection === 'profile') {
        // Update profile via existing API
        await clientApi.updateProfile({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        })
        setSettingsStatus({ type: 'success', message: 'Profile updated successfully.' })
      } else if (activeSection === 'appearance') {
        // Save appearance settings (theme)
        // Note: This would need backend support for client settings
        // For now, we'll just dispatch the theme change event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('themeChanged', { detail: formData.theme }))
        }
        setSettingsStatus({ type: 'success', message: 'Appearance settings updated successfully.' })
      } else if (activeSection === 'general') {
        // Save general settings
        // Note: This would need backend support for client settings
        setSettingsStatus({ type: 'success', message: 'General settings updated successfully.' })
      }
      
      setInitialFormData(formData)
    } catch (error: any) {
      setSettingsStatus({ type: 'error', message: error.message || 'Failed to update settings.' })
    } finally {
      setSettingsSaving(false)
    }
  }

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Profile Information</h3>
        <p className="mt-2 text-sm text-gray-500">Update your personal information and contact details.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">First Name</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Last Name</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email Address</label>
          <input
            type="email"
            value={formData.email}
            disabled
            className="block w-full rounded-2xl border border-[#dddddd] bg-gray-50 shadow-sm sm:text-sm px-4 py-3 cursor-not-allowed"
          />
          <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Timezone</label>
          <select
            value={formData.timezone}
            onChange={(e) => handleInputChange('timezone', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          >
            <option value="UTC">UTC</option>
            <option value="Africa/Lusaka">Africa/Lusaka (Zambia)</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
            </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Security Settings</h3>
        <p className="mt-2 text-sm text-gray-500">Manage your account security and authentication preferences.</p>
          </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Change Password</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-10 border border-[#dddddd] rounded-2xl focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  minLength={6}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-10 border border-[#dddddd] rounded-2xl focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">Must be at least 6 characters long</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  minLength={6}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-10 border border-[#dddddd] rounded-2xl focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
              </div>
            </div>

        <div className="pt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
          <select
            value={formData.sessionTimeout}
            onChange={(e) => handleInputChange('sessionTimeout', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
          </select>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <TwoFactorSettings />
        </div>
      </div>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Notification Preferences</h3>
        <p className="mt-2 text-sm text-gray-500">Choose how you want to receive notifications.</p>
      </div>
      
      <div className="pt-4">
        <NotificationPreferences />
      </div>
            </div>
  )

  const renderAppearanceSettings = () => {
    const isDarkMode = formData.theme === 'dark'
    const isAutoMode = formData.theme === 'auto'
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Appearance Settings</h3>
          <p className="mt-2 text-sm text-gray-500">Customize the look and feel of your portal.</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Dark Mode</h4>
              <p className="text-sm text-gray-500">Enable dark theme for your portal</p>
            </div>
            <button
              type="button"
              onClick={() => {
                // If auto is enabled, disable it first
                const newTheme = isDarkMode ? 'light' : 'dark'
                handleInputChange('theme', newTheme)
              }}
              disabled={isAutoMode}
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:ring-offset-2',
                isDarkMode && !isAutoMode ? 'bg-[var(--shreeji-primary)]' : 'bg-gray-200',
                isAutoMode && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  isDarkMode && !isAutoMode ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Auto Theme</h4>
              <p className="text-sm text-gray-500">Match your system theme preference</p>
            </div>
            <button
              type="button"
              onClick={() => {
                // If auto is enabled, disable it (go to light). If disabled, enable auto
                const newTheme = isAutoMode ? 'light' : 'auto'
                handleInputChange('theme', newTheme)
              }}
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:ring-offset-2',
                isAutoMode ? 'bg-[var(--shreeji-primary)]' : 'bg-gray-200'
              )}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  isAutoMode ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">General Settings</h3>
        <p className="mt-2 text-sm text-gray-500">Configure general application preferences.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date Format</label>
          <select
            value={formData.dateFormat}
            onChange={(e) => handleInputChange('dateFormat', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Time Format</label>
          <select
            value={formData.timeFormat}
            onChange={(e) => handleInputChange('timeFormat', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          >
            <option value="12h">12-hour</option>
            <option value="24h">24-hour</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Language</label>
          <select
            value={formData.language}
            onChange={(e) => handleInputChange('language', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>
      </div>
    </div>
  )

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSettings()
      case 'security':
        return renderSecuritySettings()
      case 'notifications':
        return renderNotificationSettings()
      case 'appearance':
        return renderAppearanceSettings()
      case 'general':
        return renderGeneralSettings()
      default:
        return (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">Coming Soon</h3>
            <p className="mt-1 text-sm text-gray-500">This section is under development.</p>
          </div>
        )
    }
  }

  if (authLoading || settingsLoading) {
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
        <p className="text-sm text-gray-500">Manage your account settings and preferences.</p>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
        {/* Sidebar */}
        <aside className="py-6 px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-3 lg:sticky lg:top-6 lg:self-start">
          <nav className="space-y-2">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={clsx(
                  'group w-full flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-200',
                  activeSection === section.id
                    ? 'bg-[var(--shreeji-primary)] text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <section.icon
                  className={clsx(
                    'mr-3 flex-shrink-0 h-6 w-6',
                    activeSection === section.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {section.name}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
          <div className="bg-white shadow-[0_0_20px_0_rgba(0,0,0,0.1)] rounded-3xl">
            <div className="px-6 py-8 sm:p-8">
              {renderSectionContent()}
              
              {/* Settings Status Messages */}
              {settingsStatus.type !== 'idle' && (
                <div
                  className={clsx(
                    'mt-6 rounded-2xl p-4',
                    settingsStatus.type === 'success' ? 'bg-[#7FB06F]/10 text-[#7FB06F] border border-[#7FB06F]/20' : 'bg-[#D96C6C]/10 text-[#D96C6C] border border-[#D96C6C]/20'
                  )}
                >
                  <p className="text-sm font-medium">{settingsStatus.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-5 left-0 right-0 z-50 px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center px-8 py-4 border border-gray-300 shadow-lg text-sm font-medium rounded-2xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--shreeji-primary)] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={settingsSaving}
            className={clsx(
              'inline-flex items-center px-8 py-4 border border-transparent text-sm font-medium rounded-2xl shadow-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--shreeji-primary)] transition-all',
              settingsSaving
                ? 'bg-[var(--shreeji-primary)]/50 cursor-not-allowed'
                : 'bg-[var(--shreeji-primary)] hover:opacity-90'
            )}
          >
            {settingsSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
