'use client'

import { Package, Pencil, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import GuestAddressForm from './GuestAddressForm'
import { CheckoutAddressInput } from '@/app/lib/ecommerce/api'

interface Address {
  id: string | number
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2?: string
  city: string
  state?: string
  postalCode: string
  country: string
  phone?: string
  isDefault?: boolean
}

interface DeliveryAddressSectionProps {
  selectedAddressId: string | null
  onAddressSelect: (id: string) => void
  onAddAddress: () => void
  addresses?: Address[]
  loading?: boolean
  isAuthenticated?: boolean
  guestAddressData?: CheckoutAddressInput | null
  onGuestAddressChange?: (data: CheckoutAddressInput) => void
}

export default function DeliveryAddressSection({
  selectedAddressId,
  onAddressSelect,
  onAddAddress,
  addresses = [],
  loading = false,
  isAuthenticated = false,
  guestAddressData = null,
  onGuestAddressChange,
}: DeliveryAddressSectionProps) {
  const router = useRouter()

  const formatAddress = (address: Address) => {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ].filter(Boolean)
    return parts.join(', ')
  }

  const formatName = (address: Address) => {
    return `${address.firstName} ${address.lastName}`.trim()
  }

  if (loading) {
    return (
      <div className='space-y-4 rounded-lg border-t-4 border-[var(--shreeji-primary)] bg-white p-6 shadow-sm'>
        <div className='flex items-center gap-3'>
          <Package className='h-5 w-5 text-[#544829]' />
          <h2 className='text-xl font-semibold text-gray-900'>Delivery address</h2>
        </div>
        <div className='space-y-2 animate-pulse py-8'>
          <div className='h-4 bg-gray-200 rounded w-32 mx-auto'></div>
          <div className='h-1 bg-gray-200 rounded w-24 mx-auto'></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className='space-y-4 rounded-lg border-t-4 border-[var(--shreeji-primary)] bg-white p-6 shadow-sm'>
        <div className='flex items-center gap-3'>
          <Package className='h-5 w-5 text-[#544829]' />
          <h2 className='text-xl font-semibold text-gray-900'>Delivery address</h2>
        </div>
        {onGuestAddressChange ? (
          <GuestAddressForm
            addressData={guestAddressData}
            onAddressDataChange={onGuestAddressChange}
          />
        ) : (
          <div className='rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center'>
            <p className='text-gray-600 mb-4'>
              Please{' '}
              <button
                onClick={() => {
                  // Store the return URL so we can redirect back after login
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('returnUrl', '/checkout')
                  }
                  router.push('/portal/login')
                }}
                className='text-[var(--shreeji-primary)] hover:underline font-medium'
              >
                log in
              </button>{' '}
              to use saved addresses or enter address manually
            </p>
            <button
              onClick={onAddAddress}
              className='px-4 py-2 bg-[var(--shreeji-primary)] text-white rounded-md hover:bg-[var(--shreeji-secondary)] transition-colors'
            >
              Enter Address Manually
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='space-y-4 rounded-lg border-t-4 border-[var(--shreeji-primary)] bg-white p-6 shadow-sm'>
      <div className='flex items-center gap-3'>
        <Package className='h-5 w-5 text-[#544829]' />
        <h2 className='text-xl font-semibold text-gray-900'>Delivery address</h2>
      </div>

      {addresses.length === 0 ? (
        <div className='rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center'>
          <p className='text-gray-600 mb-4'>No saved addresses. Add one to get started.</p>
          <button
            onClick={onAddAddress}
            className='px-4 py-2 bg-[var(--shreeji-primary)] text-white rounded-md hover:bg-[var(--shreeji-secondary)] transition-colors'
          >
            Add Address
          </button>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {addresses.map((address) => (
            <div
              key={address.id}
              onClick={() => onAddressSelect(address.id.toString())}
              className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                selectedAddressId === address.id.toString()
                  ? 'border-[var(--shreeji-primary)] bg-white'
                  : 'border-gray-200 bg-white hover:border-[var(--shreeji-secondary)]'
              }`}
            >
              {selectedAddressId === address.id.toString() && (
                <div className='absolute right-2 top-2'>
                  <div className='flex h-6 w-6 items-center justify-center rounded-full bg-[var(--shreeji-primary)]'>
                    <svg className='h-4 w-4 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                    </svg>
                  </div>
                </div>
              )}
              {address.isDefault && (
                <div className='absolute left-2 top-2'>
                  <span className='rounded bg-[var(--shreeji-primary)] px-2 py-0.5 text-xs text-white'>
                    Default
                  </span>
                </div>
              )}
              <div className='pr-8'>
                <div className='mb-2 flex items-center justify-start gap-1'>
                  <h3 className='font-semibold text-gray-900'>{formatName(address)}</h3>
                  <div className='group relative'>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Handle edit - navigate to profile/addresses page
                      }}
                      className='flex items-center justify-center rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[var(--shreeji-primary)]'
                      aria-label='Edit address'
                    >
                      <Pencil className='h-4 w-4' />
                    </button>
                    <div className='invisible absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:visible group-hover:opacity-100'>
                      Edit
                      <div className='absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900'></div>
                    </div>
                  </div>
                </div>
                <p className='text-sm text-gray-600'>{formatAddress(address)}</p>
                {address.phone && (
                  <p className='mt-2 text-sm text-gray-600'>Mobile No: {address.phone}</p>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={onAddAddress}
            className='flex min-h-[120px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100'
          >
            <svg className='mb-2 h-8 w-8' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
            </svg>
            <span className='text-sm font-medium'>Add Address</span>
          </button>
        </div>
      )}
    </div>
  )
}

