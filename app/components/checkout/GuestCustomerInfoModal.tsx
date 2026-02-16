'use client'

import { useState, useEffect } from 'react'
import { X, User, LogIn, UserPlus } from 'lucide-react'
import { CheckoutCustomerInput } from '@/app/lib/ecommerce/api'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { getLoginUrl } from '@/app/lib/client/redirectToLogin'

interface GuestCustomerInfoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (data: CheckoutCustomerInput) => void
  initialData?: CheckoutCustomerInput | null
}

export default function GuestCustomerInfoModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: GuestCustomerInfoModalProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<CheckoutCustomerInput>({
    email: initialData?.email || '',
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    phone: initialData?.phone || '',
  })
  const [errors, setErrors] = useState<{
    email?: string
    firstName?: string
    lastName?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(initialData)
    } else if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
      })
      setErrors({})
      setSubmitting(false)
    }
  }, [isOpen, initialData])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // Trim all fields
    const trimmedData = {
      email: formData.email.trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phone: formData.phone?.trim() || '',
    }

    // Validate
    const newErrors: typeof errors = {}

    if (!trimmedData.email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(trimmedData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!trimmedData.firstName) {
      newErrors.firstName = 'First name is required'
    } else if (trimmedData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters'
    }

    if (!trimmedData.lastName) {
      newErrors.lastName = 'Last name is required'
    } else if (trimmedData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      setSubmitting(false)
      toast.error('Please fill in all required fields correctly.')
      return
    }

    // Success - pass data to parent
    onSuccess(trimmedData)
    onClose()
    setSubmitting(false)
  }

  const handleChange = (field: keyof CheckoutCustomerInput, value: string) => {
    setFormData({ ...formData, [field]: value })
    // Clear error for this field
    if (errors[field as keyof typeof errors]) {
      setErrors({ ...errors, [field]: undefined })
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !submitting) {
      onClose()
    }
  }

  const handleSignIn = () => {
    router.push(getLoginUrl('/checkout'));
  }

  const handleSignUp = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('returnUrl', '/checkout');
    }
    router.push('/portal/register')
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-[var(--shreeji-primary)]" />
            <h2 className="text-xl font-bold text-gray-900">Continue Checkout</h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1 hover:bg-gray-100 rounded-full transition disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Sign In / Sign Up Options */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Have an account?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSignIn}
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-[var(--shreeji-primary)] text-[var(--shreeji-primary)] rounded-lg hover:bg-[var(--shreeji-primary)] hover:text-white transition font-medium"
              >
                <LogIn className="h-5 w-5" />
                Sign In
              </button>
              <button
                type="button"
                onClick={handleSignUp}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--shreeji-primary)] text-white rounded-lg hover:opacity-90 transition font-medium"
              >
                <UserPlus className="h-5 w-5" />
                Sign Up
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue as guest</span>
            </div>
          </div>

          {/* Guest Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-transparent ${
                  errors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your first name"
                disabled={submitting}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-transparent ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your last name"
                disabled={submitting}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="your.email@example.com"
              disabled={submitting}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              We'll send your order confirmation to this email
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-transparent"
              placeholder="+260 77 123 4567"
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              We may contact you about your order
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[var(--shreeji-primary)] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Continue as Guest'}
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  )
}

