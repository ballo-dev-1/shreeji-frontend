'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { getBankDetails, type BankDetails } from '@/app/lib/ecommerce/api'

interface OrderCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  orderNumber: string
  orderId: number
  paymentStatus: string
  paymentMethod?: string
  guestEmail?: string
  guestFirstName?: string
  guestLastName?: string
}

export default function OrderCompletionModal({
  isOpen,
  onClose,
  orderNumber,
  orderId,
  paymentStatus,
  paymentMethod,
  guestEmail,
  guestFirstName,
  guestLastName,
}: OrderCompletionModalProps) {
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null)
  const [loadingBankDetails, setLoadingBankDetails] = useState(false)

  useEffect(() => {
    if (paymentMethod === 'bank_transfer' && paymentStatus === 'pending') {
      setLoadingBankDetails(true)
      getBankDetails()
        .then(setBankDetails)
        .catch((error) => {
          console.error('Failed to fetch bank details:', error)
        })
        .finally(() => {
          setLoadingBankDetails(false)
        })
    }
  }, [paymentMethod, paymentStatus])

  const getPaymentStatusMessage = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed':
        return { icon: CheckCircle, color: 'green', message: 'Payment completed successfully' }
      case 'pending':
        return { icon: Clock, color: 'yellow', message: 'Payment is pending confirmation' }
      case 'failed':
      case 'declined':
        return { icon: AlertCircle, color: 'red', message: 'Payment failed' }
      default:
        return { icon: AlertCircle, color: 'gray', message: `Payment status: ${status}` }
    }
  }

  const calculateDeadline = (hours: number) => {
    const deadline = new Date()
    deadline.setHours(deadline.getHours() + hours)
    return deadline
  }

  const statusInfo = getPaymentStatusMessage(paymentStatus)
  const StatusIcon = statusInfo.icon

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">Order Confirmed!</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Number & Status */}
          <div className={`rounded-lg p-4 border ${
            statusInfo.color === 'green' ? 'bg-green-50 border-green-200' :
            statusInfo.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
            statusInfo.color === 'red' ? 'bg-red-50 border-red-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start gap-3">
              <StatusIcon className={`h-6 w-6 flex-shrink-0 ${
                statusInfo.color === 'green' ? 'text-green-600' :
                statusInfo.color === 'yellow' ? 'text-yellow-600' :
                statusInfo.color === 'red' ? 'text-red-600' :
                'text-gray-600'
              }`} />
              <div className="flex-1">
                <p className="font-semibold text-lg text-gray-900">
                  Order #{orderNumber} placed successfully
                </p>
                <p className={`mt-1 text-sm ${
                  statusInfo.color === 'green' ? 'text-green-700' :
                  statusInfo.color === 'yellow' ? 'text-yellow-700' :
                  statusInfo.color === 'red' ? 'text-red-700' :
                  'text-gray-700'
                }`}>
                  {statusInfo.message}
                </p>
              </div>
            </div>
          </div>

          {/* Bank Transfer Instructions */}
          {paymentMethod === 'bank_transfer' && paymentStatus === 'pending' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="font-semibold text-gray-900 mb-2">Bank Transfer Instructions:</p>
              <p className="text-sm text-gray-700 mb-3">
                Please transfer the order amount to the following account:
              </p>
              {loadingBankDetails ? (
                <p className="text-sm text-gray-500">Loading bank details...</p>
              ) : bankDetails ? (
                <>
                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-700 mb-3">
                    <li><strong>Bank Name:</strong> {bankDetails.bankName}</li>
                    <li><strong>Account Number:</strong> {bankDetails.accountNumber}</li>
                    <li><strong>Account Name:</strong> {bankDetails.accountName}</li>
                    {bankDetails.swiftCode && (
                      <li><strong>SWIFT Code:</strong> {bankDetails.swiftCode}</li>
                    )}
                    {bankDetails.iban && (
                      <li><strong>IBAN:</strong> {bankDetails.iban}</li>
                    )}
                    <li><strong>Reference:</strong> {orderNumber}</li>
                  </ul>
                  <p className="text-xs text-amber-700 font-medium">
                    ⚠️ Complete the transfer within {bankDetails.deadlineHours} hours (by{' '}
                    {calculateDeadline(bankDetails.deadlineHours).toLocaleString()}) to confirm your order.
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    After completing the transfer, you can upload proof of payment in your order details page.
                  </p>
                </>
              ) : (
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                  <li>Bank: [Loading...]</li>
                  <li>Account Number: [Loading...]</li>
                  <li>Account Name: Shreeji</li>
                  <li>Reference: {orderNumber}</li>
                </ul>
              )}
            </div>
          )}

          {/* Cash on Pickup Instructions */}
          {paymentMethod === 'cop' && paymentStatus === 'pending' && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="font-semibold text-gray-900 mb-2">Payment on Pickup Confirmed</p>
              <p className="text-sm text-gray-700">
                Please have the exact amount ready when you pick up your order. You will receive
                pickup instructions via email.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            {guestEmail ? (
              <>
                <Link
                  href={`/portal/register?email=${encodeURIComponent(guestEmail)}&firstName=${encodeURIComponent(guestFirstName || '')}&lastName=${encodeURIComponent(guestLastName || '')}&returnUrl=/portal/orders/${orderId}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--shreeji-primary)] text-white rounded-lg hover:opacity-90 transition font-medium"
                >
                  <ExternalLink className="h-5 w-5" />
                  Create Account to Track Order
                </Link>
                <Link
                  href={`/portal/login?returnUrl=/portal/orders/${orderId}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-[var(--shreeji-primary)] text-[var(--shreeji-primary)] rounded-lg hover:bg-[var(--shreeji-primary)] hover:text-white transition font-medium"
                >
                  Already have an account? Login
                </Link>
              </>
            ) : (
              <Link
                href={`/portal/login?returnUrl=/portal/orders/${orderId}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--shreeji-primary)] text-white rounded-lg hover:opacity-90 transition font-medium"
              >
                <ExternalLink className="h-5 w-5" />
                Login to View Order
              </Link>
            )}
            <Link
              href="/products"
              className="flex-1 flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Continue Shopping
            </Link>
          </div>

          {/* Info Message */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> You can view your order details and track its status by logging
              into your account. If you don't have an account, you can create one using the email
              address used for this order.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

