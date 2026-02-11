'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'
import {
  ShieldCheckIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { TwoFactorSettingsSkeleton } from '@/app/components/ui/Skeletons'

interface TwoFactorSettingsProps {
  /**
   * When true, renders with full page padding and heading.
   * When false, renders as an embedded section (for settings tab).
   */
  standalone?: boolean
}

export default function TwoFactorSettings({ standalone = false }: TwoFactorSettingsProps) {
  const { loading: authLoading, isAuthenticated } = useClientAuth()
  const router = useRouter()
  const [status, setStatus] = useState<{
    isEnabled: boolean
    isVerified: boolean
    enabledAt: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [step, setStep] = useState<'status' | 'generate' | 'verify' | 'enabled'>('status')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/portal/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadStatus()
    }
  }, [isAuthenticated])

  const loadStatus = async () => {
    try {
      setLoading(true)
      const response = await clientApi.get2FAStatus()
      setStatus(response)
      if (response.isEnabled) {
        setStep('enabled')
      } else {
        setStep('status')
      }
    } catch (error: any) {
      console.error('Failed to load 2FA status:', error)
      toast.error(error.message || 'Failed to load 2FA status')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSecret = async () => {
    try {
      setLoading(true)
      const response = await clientApi.generate2FASecret()
      setQrCodeUrl(response.qrCodeUrl)
      setManualEntryKey(response.manualEntryKey)
      setStep('verify')
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate 2FA secret')
    } finally {
      setLoading(false)
    }
  }

  const handleEnable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    try {
      setLoading(true)
      const response = await clientApi.enable2FA(verificationCode)
      setBackupCodes(response.backupCodes)
      setShowBackupCodes(true)
      setStep('enabled')
      toast.success('2FA enabled successfully!')
      loadStatus()
    } catch (error: any) {
      toast.error(error.message || 'Failed to enable 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return
    }

    try {
      setLoading(true)
      await clientApi.disable2FA()
      toast.success('2FA disabled successfully')
      setStep('status')
      loadStatus()
    } catch (error: any) {
      toast.error(error.message || 'Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    if (!confirm('This will invalidate your existing backup codes. Are you sure?')) {
      return
    }

    try {
      setLoading(true)
      const response = await clientApi.regenerate2FABackupCodes()
      setBackupCodes(response.backupCodes)
      setShowBackupCodes(true)
      toast.success('Backup codes regenerated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate backup codes')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return <TwoFactorSettingsSkeleton standalone={standalone} />
  }

  if (!isAuthenticated) {
    return null
  }

  const heading = (
    <div>
      <h1 className={standalone ? 'text-3xl font-bold text-gray-900' : 'text-xl font-semibold text-gray-900'}>
        Two-Factor Authentication
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Add an extra layer of security to your account
      </p>
    </div>
  )

  return (
    <div className={standalone ? 'space-y-6 pb-24' : 'space-y-6'}>
      {heading}

      {/* Status Card */}
      {step === 'status' && status && !status.isEnabled && (
        <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-yellow-100 rounded-full">
              <ShieldCheckIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">2FA is Disabled</h2>
              <p className="text-gray-600 mb-4">
                Two-factor authentication adds an extra layer of security to your account. When enabled, you'll need to enter a code from your authenticator app in addition to your password when logging in.
              </p>
              <button
                onClick={handleGenerateSecret}
                className="px-6 py-2 bg-[var(--shreeji-primary)] text-white rounded-lg hover:opacity-90 transition-all"
              >
                Enable 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate QR Code Step */}
      {step === 'verify' && qrCodeUrl && (
        <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Scan QR Code</h2>
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
              </div>
              <p className="text-sm text-gray-600 text-center max-w-md">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Or enter this key manually:</p>
              <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
                <KeyIcon className="h-5 w-5 text-gray-400" />
                <code className="text-sm font-mono text-gray-900 flex-1">{manualEntryKey}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(manualEntryKey || '')
                    toast.success('Key copied to clipboard')
                  }}
                  className="text-sm text-[var(--shreeji-primary)] hover:underline"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter verification code from your app
              </label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)] text-center text-2xl tracking-widest"
              />
              <button
                onClick={handleEnable2FA}
                disabled={verificationCode.length !== 6}
                className="mt-4 w-full px-6 py-2 bg-[var(--shreeji-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Verify and Enable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enabled State */}
      {step === 'enabled' && status && status.isEnabled && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-3xl p-6">
            <div className="flex items-start space-x-4">
              <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-green-900 mb-2">2FA is Enabled</h2>
                <p className="text-green-700">
                  Your account is protected with two-factor authentication. You'll need to enter a code from your authenticator app when logging in.
                </p>
                {status.enabledAt && (
                  <p className="text-sm text-green-600 mt-2">
                    Enabled on: {new Date(status.enabledAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Backup Codes */}
          {showBackupCodes && backupCodes.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-6">
              <div className="flex items-start space-x-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Save Your Backup Codes</h3>
                  <p className="text-yellow-700 mb-4">
                    These codes can be used to access your account if you lose access to your authenticator app. Save them in a safe place.
                  </p>
                  <div className="bg-white p-4 rounded-lg border border-yellow-300 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, index) => (
                        <code key={index} className="text-sm font-mono text-gray-900 p-2 bg-gray-50 rounded">
                          {code}
                        </code>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const codesText = backupCodes.join('\n')
                      navigator.clipboard.writeText(codesText)
                      toast.success('Backup codes copied to clipboard')
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all text-sm"
                  >
                    Copy All Codes
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage 2FA</h3>
            <div className="space-y-3">
              <button
                onClick={handleRegenerateBackupCodes}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-left"
              >
                Regenerate Backup Codes
              </button>
              <button
                onClick={handleDisable2FA}
                className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-all text-left"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

