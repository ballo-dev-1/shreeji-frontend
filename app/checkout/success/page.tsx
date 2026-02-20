'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, ShoppingBag, ArrowLeft } from 'lucide-react'
import { verifyDpoPayment } from '@/app/lib/ecommerce/api'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'

type VerifyState =
  | { status: 'loading' }
  | { status: 'success'; orderId?: number; orderNumber?: string; message: string }
  | { status: 'error'; message: string }

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthenticated } = useClientAuth()
  const [state, setState] = useState<VerifyState>({ status: 'loading' })

  const transactionToken = searchParams.get('TransactionToken')
  const companyRef = searchParams.get('CompanyRef')

  useEffect(() => {
    if (!transactionToken) {
      setState({
        status: 'error',
        message: 'No transaction token found. Invalid payment return link.',
      })
      return
    }

    let cancelled = false

    async function verify() {
      try {
        const result = await verifyDpoPayment(transactionToken!)

        if (cancelled) return

        if (result.success) {
          // Clear pending order from sessionStorage
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('pendingOrder')
          }

          setState({
            status: 'success',
            orderId: result.orderId,
            orderNumber: result.orderNumber,
            message: result.message || 'Payment verified successfully',
          })
        } else {
          setState({
            status: 'error',
            message:
              result.message ||
              `Payment was not successful (${result.paymentStatus || 'unknown'})`,
          })
        }
      } catch (err) {
        if (cancelled) return
        setState({
          status: 'error',
          message:
            err instanceof Error
              ? `Verification failed: ${err.message}`
              : 'Could not verify payment. Please contact support.',
        })
      }
    }

    verify()

    return () => {
      cancelled = true
    }
  }, [transactionToken])

  // Loading state
  if (state.status === 'loading') {
    return (
      <div className='flex min-h-[60vh] flex-col items-center justify-center px-4'>
        <Loader2 className='mb-4 h-12 w-12 animate-spin text-green-600' />
        <h1 className='mb-2 text-2xl font-bold text-gray-900'>
          Verifying Your Payment
        </h1>
        <p className='text-gray-500'>
          Please wait while we confirm your payment...
        </p>
      </div>
    )
  }

  // Success state
  if (state.status === 'success') {
    return (
      <div className='flex min-h-[60vh] flex-col items-center justify-center px-4'>
        <div className='w-full max-w-md rounded-2xl border border-green-200 bg-white p-8 text-center shadow-lg'>
          <CheckCircle className='mx-auto mb-4 h-16 w-16 text-green-500' />
          <h1 className='mb-2 text-2xl font-bold text-gray-900'>
            Payment Successful!
          </h1>
          <p className='mb-4 text-gray-600'>{state.message}</p>

          {state.orderNumber && (
            <div className='mb-6 rounded-lg bg-green-50 p-4'>
              <p className='text-sm text-gray-600'>Order Number</p>
              <p className='text-lg font-bold text-gray-900'>
                {state.orderNumber}
              </p>
            </div>
          )}

          {!isAuthenticated && state.orderNumber && (
            <p className='mb-6 text-sm text-gray-600'>
              An email with your order details has been sent to the email you provided.
            </p>
          )}

          <div className='space-y-3'>
            {isAuthenticated && state.orderId ? (
              <Link
                href={`/portal/orders/${state.orderId}`}
                className='block w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700'
              >
                View Order Details
              </Link>
            ) : state.orderNumber ? (
              <Link
                href={`/checkout/order-status?orderNumber=${encodeURIComponent(state.orderNumber)}`}
                className='block w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700'
              >
                View order status
              </Link>
            ) : null}
            <Link
              href='/'
              className='flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50'
            >
              <ShoppingBag className='h-4 w-4' />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center px-4'>
      <div className='w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg'>
        <XCircle className='mx-auto mb-4 h-16 w-16 text-red-500' />
        <h1 className='mb-2 text-2xl font-bold text-gray-900'>
          Payment Not Successful
        </h1>
        <p className='mb-6 text-gray-600'>{state.message}</p>

        <div className='space-y-3'>
          <Link
            href='/checkout'
            className='flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700'
          >
            <ArrowLeft className='h-4 w-4' />
            Return to Checkout
          </Link>
          <Link
            href='/'
            className='block rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50'
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className='flex min-h-[60vh] flex-col items-center justify-center px-4'>
          <Loader2 className='mb-4 h-12 w-12 animate-spin text-green-600' />
          <p className='text-gray-500'>Loading...</p>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}
