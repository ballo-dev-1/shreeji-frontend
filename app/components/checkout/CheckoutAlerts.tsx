'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { getBankDetails, type BankDetails } from '@/app/lib/ecommerce/api'

interface CheckoutAlertsProps {
  cartError: string | null
  formError: string | null
  success: { orderNumber: string; orderId: number; paymentStatus: string; redirectUrl?: string; requiresAction?: boolean } | null
  paymentMethod?: string
  onRetry?: () => void
}

export default function CheckoutAlerts({ cartError, formError, success, paymentMethod, onRetry }: CheckoutAlertsProps) {
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null)
  const [loadingBankDetails, setLoadingBankDetails] = useState(false)

  useEffect(() => {
    if (paymentMethod === 'bank_transfer' && success?.paymentStatus === 'pending') {
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
  }, [paymentMethod, success?.paymentStatus])

  const getPaymentStatusMessage = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed':
        return { icon: CheckCircle, color: 'green', message: 'Payment completed successfully' }
      case 'pending':
        return { icon: Clock, color: 'yellow', message: 'Payment is pending confirmation' }
      case 'failed':
      case 'declined':
        return { icon: XCircle, color: 'red', message: 'Payment failed' }
      default:
        return { icon: AlertCircle, color: 'gray', message: `Payment status: ${status}` }
    }
  }

  const calculateDeadline = (hours: number) => {
    const deadline = new Date()
    deadline.setHours(deadline.getHours() + hours)
    return deadline
  }

  return (
    <>
      {cartError && (
        <div className='mb-4 flex items-start gap-3 rounded-md bg-red-50 p-4 text-red-700'>
          <XCircle className='h-5 w-5 flex-shrink-0' />
          <div className='flex-1'>
            <p className='font-semibold'>Error</p>
            <p className='text-sm'>{cartError}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className='mt-2 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700'
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
      {formError && (
        <div className='mb-4 flex items-start gap-3 rounded-md bg-red-50 p-4 text-red-700'>
          <XCircle className='h-5 w-5 flex-shrink-0' />
          <div className='flex-1'>
            <p className='font-semibold'>Validation Error</p>
            <p className='text-sm'>{formError}</p>
          </div>
        </div>
      )}
      {success && (
        <div className={`mb-6 rounded-md bg-${getPaymentStatusMessage(success.paymentStatus).color}-50 p-4 text-${getPaymentStatusMessage(success.paymentStatus).color}-800`}>
          <div className='flex items-start gap-3'>
            {React.createElement(getPaymentStatusMessage(success.paymentStatus).icon, {
              className: 'h-5 w-5 flex-shrink-0',
            })}
            <div className='flex-1'>
              <p className='font-semibold'>Order {success.orderNumber} placed successfully</p>
              <p className='mt-1 text-sm'>
                {getPaymentStatusMessage(success.paymentStatus).message}
              </p>
              
              {success.requiresAction && success.redirectUrl && (
                <p className='mt-2 text-sm font-medium'>
                  Redirecting to payment gateway...
                </p>
              )}

              {paymentMethod === 'bank_transfer' && success.paymentStatus === 'pending' && (
                <div className='mt-3 rounded bg-white p-3 text-sm'>
                  <p className='font-semibold'>Bank Transfer Instructions:</p>
                  <p className='mt-1'>Please transfer the order amount to:</p>
                  {loadingBankDetails ? (
                    <p className='mt-2 text-xs text-gray-500'>Loading bank details...</p>
                  ) : bankDetails ? (
                    <>
                      <ul className='mt-2 list-inside list-disc space-y-1'>
                        <li><strong>Bank Name:</strong> {bankDetails.bankName}</li>
                        <li><strong>Account Number:</strong> {bankDetails.accountNumber}</li>
                        <li><strong>Account Name:</strong> {bankDetails.accountName}</li>
                        {bankDetails.swiftCode && (
                          <li><strong>SWIFT Code:</strong> {bankDetails.swiftCode}</li>
                        )}
                        {bankDetails.iban && (
                          <li><strong>IBAN:</strong> {bankDetails.iban}</li>
                        )}
                        <li><strong>Reference:</strong> {success.orderNumber}</li>
                      </ul>
                      <p className='mt-2 text-xs text-amber-600'>
                        ⚠️ Complete the transfer within {bankDetails.deadlineHours} hours (by {calculateDeadline(bankDetails.deadlineHours).toLocaleString()}) to confirm your order.
                      </p>
                      <p className='mt-2 text-xs text-gray-600'>
                        After completing the transfer, you can upload proof of payment in your order details page.
                      </p>
                    </>
                  ) : (
                    <ul className='mt-2 list-inside list-disc space-y-1'>
                      <li>Bank: [Loading...]</li>
                      <li>Account Number: [Loading...]</li>
                      <li>Account Name: Shreeji</li>
                      <li>Reference: {success.orderNumber}</li>
                    </ul>
                  )}
                </div>
              )}

              {paymentMethod === 'cop' && success.paymentStatus === 'pending' && (
                <div className='mt-3 rounded bg-white p-3 text-sm'>
                  <p className='font-semibold'>Cash on Pickup Confirmed</p>
                  <p className='mt-1'>Please have the exact amount ready when you pick up your order.</p>
                </div>
              )}

              <div className='mt-4 flex gap-3'>
                <Link
                  href={`/portal/orders/${success.orderId}`}
                  className='rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700'
                >
                  View Order Details
                </Link>
                <Link
                  href='/portal/orders'
                  className='rounded border border-green-600 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50'
                >
                  View All Orders
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

