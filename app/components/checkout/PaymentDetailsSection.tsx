'use client'

import { CreditCard, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import React from 'react'
import clientApi from '@/app/lib/client/api'

import { CheckoutCardDetails, CheckoutMobileMoneyDetails, getBankDetails, getEnabledPaymentMethods, type BankDetails } from '@/app/lib/ecommerce/api'
import CashOnPickupDetailsSection, { type CashOnPickupDetails } from './CashOnPickupDetailsSection'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'

interface PaymentDetailsSectionProps {
  paymentMethod: string
  onPaymentMethodChange: (method: string) => void
  onPayment: () => void
  onPaymentDetailsChange?: (details: {
    cardDetails?: CheckoutCardDetails
    mobileMoneyDetails?: CheckoutMobileMoneyDetails
    pickupDetails?: CashOnPickupDetails
  }) => void
  isProcessing: boolean
}

const mobileMoneyProviders = [
  { value: 'mtn', label: 'MTN Mobile Money' },
  { value: 'airtel', label: 'Airtel Money' },
  { value: 'zamtel', label: 'Zamtel Kwacha' },
  { value: 'orange', label: 'Orange Money' },
]

// Infer mobile money provider from phone number (Zambian prefixes)
const inferProviderFromPhoneNumber = (phoneNumber: string): 'mtn' | 'airtel' | 'zamtel' | 'orange' => {
  const cleaned = phoneNumber.replace(/\s+/g, '').replace(/^\+260/, '0')
  
  // Check first 3 digits (prefix)
  if (cleaned.startsWith('096') || cleaned.startsWith('097')) {
    return 'mtn'
  } else if (cleaned.startsWith('095')) {
    // 095 can be Airtel or Zamtel, defaulting to Airtel
    return 'airtel'
  } else if (cleaned.startsWith('098')) {
    return 'zamtel'
  }
  
  // Default to MTN if unable to determine
  return 'mtn'
}

export default function PaymentDetailsSection({
  paymentMethod,
  onPaymentMethodChange,
  onPayment,
  onPaymentDetailsChange,
  isProcessing,
}: PaymentDetailsSectionProps) {
  const { isAuthenticated, user } = useClientAuth()
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [savedCards, setSavedCards] = useState<any[]>([])
  const [loadingSavedCards, setLoadingSavedCards] = useState(false)
  const [mobileNumber, setMobileNumber] = useState<string>('')
  const [showNewCardForm, setShowNewCardForm] = useState(true)
  const [selectedCardType, setSelectedCardType] = useState<'visa' | 'mastercard' | 'amex' | 'diners' | null>('visa')
  const [defaultCardType, setDefaultCardType] = useState<'visa' | 'mastercard' | 'amex' | 'diners'>('visa')
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null)
  const [loadingBankDetails, setLoadingBankDetails] = useState(false)
  const [enabledMethods, setEnabledMethods] = useState<string[]>(['card', 'mobile_money', 'bank_transfer', 'cop'])
  const [loadingMethods, setLoadingMethods] = useState(true)
  const [pickupDetails, setPickupDetails] = useState<CashOnPickupDetails | null>(null)
  const [newCardData, setNewCardData] = useState({
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    saveCard: false,
    cardType: 'visa' as 'visa' | 'mastercard' | 'amex' | 'diners',
  })

  // Load enabled payment methods on mount
  useEffect(() => {
    setLoadingMethods(true)
    getEnabledPaymentMethods()
      .then((data) => {
        setEnabledMethods(data.enabledMethods || ['card', 'mobile_money', 'bank_transfer', 'cop'])
        // If current payment method is disabled, switch to first enabled method
        if (data.enabledMethods && data.enabledMethods.length > 0 && !data.enabledMethods.includes(paymentMethod)) {
          onPaymentMethodChange(data.enabledMethods[0])
        }
      })
      .catch((error) => {
        console.error('Failed to fetch enabled payment methods:', error)
        // Fallback to all methods if API fails
        setEnabledMethods(['card', 'mobile_money', 'bank_transfer', 'cop'])
      })
      .finally(() => {
        setLoadingMethods(false)
      })
  }, [])

  // Load saved cards when authenticated and card payment is selected
  useEffect(() => {
    if (isAuthenticated && paymentMethod === 'card' && !loadingSavedCards) {
      setLoadingSavedCards(true)
      clientApi.getSavedCards()
        .then((response) => {
          setSavedCards(response.data || [])
          // If there are saved cards, show them by default
          if (response.data && response.data.length > 0) {
            const defaultCard = response.data.find((card: any) => card.isDefault) || response.data[0]
            if (defaultCard) {
              setSelectedCardId(defaultCard.id.toString())
              setShowNewCardForm(false)
            }
          } else {
            setShowNewCardForm(true)
          }
        })
        .catch((error) => {
          console.error('Failed to load saved cards:', error)
          setShowNewCardForm(true)
        })
        .finally(() => {
          setLoadingSavedCards(false)
        })
    } else if (!isAuthenticated || paymentMethod !== 'card') {
      setShowNewCardForm(true)
      setSelectedCardId(null)
    }
  }, [isAuthenticated, paymentMethod])

  // Load bank details when bank transfer is selected
  useEffect(() => {
    if (paymentMethod === 'bank_transfer' && !bankDetails && !loadingBankDetails) {
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
  }, [paymentMethod, bankDetails, loadingBankDetails])

  const allPaymentMethods = [
    { value: 'cop', label: 'Cash on Pickup' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'card', label: 'Credit / Debit Card (Visa, MasterCard, AmEx, Diners)' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
  ]

  // Filter payment methods based on enabled methods
  const paymentMethods = allPaymentMethods.filter((method) => enabledMethods.includes(method.value))

  // Validate mobile number format (Zambian format: 09XX XXX XXX or +260 XXX XXX XXX)
  const validateMobileNumber = (number: string): boolean => {
    const cleaned = number.replace(/\s+/g, '').replace(/^\+260/, '0')
    return /^0[0-9]{9}$/.test(cleaned)
  }

  // Update payment details when they change
  const updatePaymentDetails = () => {
    if (!onPaymentDetailsChange) return

    if (paymentMethod === 'card') {
      if (showNewCardForm && newCardData.number && selectedCardType) {
        onPaymentDetailsChange({
          cardDetails: {
            number: newCardData.number.replace(/\s+/g, ''),
            expiryMonth: newCardData.expiryMonth,
            expiryYear: newCardData.expiryYear,
            cvv: newCardData.cvv,
            cardholderName: newCardData.cardholderName,
            saveCard: newCardData.saveCard,
            // cardType is not sent to backend - it's only used for UI selection
          },
        })
      } else if (selectedCardId) {
        onPaymentDetailsChange({
          cardDetails: {
            cardId: selectedCardId,
          },
        })
      } else {
        onPaymentDetailsChange({})
      }
    } else if (paymentMethod === 'mobile_money') {
      if (mobileNumber && validateMobileNumber(mobileNumber)) {
        const inferredProvider = inferProviderFromPhoneNumber(mobileNumber)
        onPaymentDetailsChange({
          mobileMoneyDetails: {
            provider: inferredProvider,
            phoneNumber: mobileNumber.replace(/\s+/g, '').replace(/^\+260/, '0'),
          },
        })
      } else {
        onPaymentDetailsChange({})
      }
    } else if (paymentMethod === 'cop') {
      if (pickupDetails) {
        onPaymentDetailsChange({
          pickupDetails,
        })
      } else {
        onPaymentDetailsChange({})
      }
    } else {
      onPaymentDetailsChange({})
    }
  }

  // Update details when payment method or inputs change
  useEffect(() => {
    updatePaymentDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, selectedCardId, showNewCardForm, newCardData, selectedCardType, mobileNumber, pickupDetails])

  return (
    <div className='space-y-4 rounded-lg border-t-4 border-[var(--shreeji-primary)] bg-white p-6 shadow-sm'>
      <div className='flex items-center gap-3'>
        <CreditCard className='h-5 w-5 text-[#544829]' />
        <h2 className='text-xl font-semibold text-gray-900'>Payment Details</h2>
      </div>

      {loadingMethods ? (
        <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600'>
          Loading payment methods...
        </div>
      ) : paymentMethods.length === 0 ? (
        <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600'>
          No payment methods are currently available. Please contact support.
        </div>
      ) : (
        <div className='space-y-3'>
          {paymentMethods.map((method) => (
          <label
            key={method.value}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${
              paymentMethod === method.value
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <input
              type='radio'
              name='paymentMethod'
              value={method.value}
              checked={paymentMethod === method.value}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              className='h-4 w-4 text-green-600 focus:ring-green-500'
            />
            <span className='text-sm font-medium text-gray-900'>{method.label}</span>
          </label>
          ))}
        </div>
      )}

      {paymentMethod === 'card' && (
        <div className='space-y-4'>
          {/* Saved Cards Selection */}
          {isAuthenticated && savedCards.length > 0 && (
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <label className='text-sm font-medium text-gray-700'>Use Saved Card</label>
                <button
                  type='button'
                  onClick={() => {
                    setShowNewCardForm(!showNewCardForm)
                    if (showNewCardForm) {
                      setSelectedCardId(null)
                    }
                  }}
                  className='text-sm text-[var(--shreeji-primary)] hover:underline'
                >
                  {showNewCardForm ? 'Use saved card' : 'Enter new card'}
                </button>
              </div>
              {!showNewCardForm && (
                <div className='space-y-2'>
                  {savedCards.map((card) => (
                    <label
                      key={card.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                        selectedCardId === card.id.toString()
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <input
                        type='radio'
                        name='savedCard'
                        value={card.id}
                        checked={selectedCardId === card.id.toString()}
                        onChange={(e) => {
                          setSelectedCardId(e.target.value)
                          setShowNewCardForm(false)
                        }}
                        className='h-4 w-4 text-green-600 focus:ring-green-500'
                      />
                      <div className='flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='text-lg font-semibold text-gray-900'>
                            {card.cardType?.toUpperCase() || 'CARD'} •••• {card.last4}
                          </span>
                          {card.isDefault && (
                            <span className='text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded'>Default</span>
                          )}
                        </div>
                        <p className='text-sm text-gray-500 mt-1'>
                          {card.cardholderName || 'Cardholder'} • Expires {card.expiryMonth?.padStart(2, '0')}/{card.expiryYear?.slice(-2)}
                        </p>
                      </div>
                    </label>
                  ))}
                  {selectedCardId && (
                    <div className='mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3'>
                      <p className='text-sm text-amber-800'>
                        Please enter your CVV to complete the payment
                      </p>
                      <input
                        type='text'
                        placeholder='CVV'
                        maxLength={4}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                          if (onPaymentDetailsChange) {
                            onPaymentDetailsChange({
                              cardDetails: {
                                cardId: selectedCardId,
                                cvv: value,
                              },
                            })
                          }
                        }}
                        className='mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Card Type Selection - Always visible when form is shown */}
          {showNewCardForm && (
            <div>
              <label className='mb-2 block text-sm font-medium text-gray-700'>Select Card Type</label>
              <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                {[
                  { type: 'visa' as const, label: 'Visa', icon: <div className='text-2xl font-bold text-blue-600'>VISA</div> },
                  { type: 'mastercard' as const, label: 'Mastercard', icon: <div className='flex items-center gap-1'><div className='h-6 w-6 rounded-full bg-red-500'></div><div className='h-6 w-6 rounded-full bg-yellow-500 -ml-2'></div></div> },
                  { type: 'amex' as const, label: 'American Express', icon: <div className='text-lg font-bold text-blue-800'>AMEX</div> },
                  { type: 'diners' as const, label: 'Diners Club', icon: <div className='text-lg font-bold text-orange-600'>DINERS</div> },
                ].map((cardType) => (
              <div
                    key={cardType.type}
                    onClick={() => {
                      setSelectedCardType(cardType.type)
                      setNewCardData({ ...newCardData, cardType: cardType.type })
                    }}
                className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      (selectedCardType === cardType.type) || (!selectedCardType && defaultCardType === cardType.type)
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                    <div className='mb-2 flex items-center justify-center'>
                      {cardType.icon}
                    </div>
                    <p className='text-center text-sm font-medium text-gray-900'>{cardType.label}</p>
                </div>
                ))}
              </div>
          </div>
          )}

          {/* Card Information Form - Show below card type selection when a type is selected */}
          {showNewCardForm && selectedCardType && (
            <div className='space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4'>
              <div>
                <h3 className='text-lg font-semibold text-gray-900'>Enter Card Information</h3>
                <p className='text-sm text-gray-500 mt-1'>
                  {selectedCardType === 'visa' && 'Visa'}
                  {selectedCardType === 'mastercard' && 'Mastercard'}
                  {selectedCardType === 'amex' && 'American Express'}
                  {selectedCardType === 'diners' && 'Diners Club'}
                </p>
              </div>

              <div className='space-y-3'>
                <div>
                  <label htmlFor='cardNumber' className='mb-1 block text-sm font-medium text-gray-700'>
                    Card Number
                  </label>
                  <input
                    id='cardNumber'
                    type='text'
                    value={newCardData.number}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\s+/g, '').replace(/\D/g, '')
                      const formatted = value.match(/.{1,4}/g)?.join(' ') || value
                      setNewCardData({ ...newCardData, number: formatted })
                    }}
                    placeholder='1234 5678 9012 3456'
                    maxLength={19}
                    className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'
                  />
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label htmlFor='expiryMonth' className='mb-1 block text-sm font-medium text-gray-700'>
                      Month
                    </label>
                    <input
                      id='expiryMonth'
                      type='text'
                      value={newCardData.expiryMonth}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 2)
                        if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 12)) {
                          setNewCardData({ ...newCardData, expiryMonth: value })
                        }
                      }}
                      placeholder='MM'
                      maxLength={2}
                      className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'
                    />
                  </div>
                  <div>
                    <label htmlFor='expiryYear' className='mb-1 block text-sm font-medium text-gray-700'>
                      Year
                    </label>
                    <input
                      id='expiryYear'
                      type='text'
                      value={newCardData.expiryYear}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setNewCardData({ ...newCardData, expiryYear: value })
                      }}
                      placeholder='YYYY'
                      maxLength={4}
                      className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label htmlFor='cvv' className='mb-1 block text-sm font-medium text-gray-700'>
                      CVV
                    </label>
                    <input
                      id='cvv'
                      type='text'
                      value={newCardData.cvv}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setNewCardData({ ...newCardData, cvv: value })
                      }}
                      placeholder='123'
                      maxLength={4}
                      className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'
                    />
                  </div>
                  <div>
                    <label htmlFor='cardholderName' className='mb-1 block text-sm font-medium text-gray-700'>
                      Cardholder Name
                    </label>
                    <input
                      id='cardholderName'
                      type='text'
                      value={newCardData.cardholderName}
                      onChange={(e) => setNewCardData({ ...newCardData, cardholderName: e.target.value })}
                      placeholder='John Doe'
                      className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'
                    />
                  </div>
                </div>

                <label className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    checked={newCardData.saveCard}
                    onChange={(e) => setNewCardData({ ...newCardData, saveCard: e.target.checked })}
                    className='h-4 w-4 text-green-600 focus:ring-green-500'
                  />
                  <span className='text-sm text-gray-700'>Save this card for future purchases</span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {paymentMethod === 'mobile_money' && (
        <div className='space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4'>
            <div>
              <label htmlFor='mobileNumber' className='mb-2 block text-sm font-medium text-gray-700'>
                Mobile Number
              </label>
              <input
                id='mobileNumber'
                type='tel'
                value={mobileNumber}
                onChange={(e) => {
                  let value = e.target.value.replace(/\s+/g, '')
                  // Auto-format Zambian numbers
                  if (value.startsWith('+260')) {
                    value = '0' + value.slice(4)
                  }
                  setMobileNumber(value)
                }}
                placeholder='0977123456 or +260977123456'
                className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'
              />
            {mobileNumber && validateMobileNumber(mobileNumber) && (
              <p className='mt-1 text-xs text-gray-600'>
                Provider: {mobileMoneyProviders.find(p => p.value === inferProviderFromPhoneNumber(mobileNumber))?.label}
              </p>
            )}
              {mobileNumber && !validateMobileNumber(mobileNumber) && (
                <p className='mt-1 text-xs text-red-600'>Please enter a valid mobile number (e.g., 0977123456)</p>
              )}
          </div>
        </div>
      )}

      {paymentMethod === 'bank_transfer' && (
        <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
          {loadingBankDetails ? (
            <p className='text-sm text-gray-600'>Loading bank details...</p>
          ) : bankDetails ? (
            <div className='space-y-3'>
              <p className='text-sm font-medium text-gray-900'>Bank Transfer Details:</p>
              <div className='space-y-1 text-sm text-gray-700'>
                <p><strong>Bank:</strong> {bankDetails.bankName}</p>
                <p><strong>Account Number:</strong> {bankDetails.accountNumber}</p>
                <p><strong>Account Name:</strong> {bankDetails.accountName}</p>
                {bankDetails.swiftCode && (
                  <p><strong>SWIFT Code:</strong> {bankDetails.swiftCode}</p>
                )}
                {bankDetails.iban && (
                  <p><strong>IBAN:</strong> {bankDetails.iban}</p>
                )}
              </div>
              <p className='text-xs text-amber-600 mt-2'>
                ⚠️ You will receive detailed instructions via email after placing your order. Please complete the transfer within {bankDetails.deadlineHours} hours to confirm your order.
              </p>
            </div>
          ) : (
            <p className='text-sm text-gray-600'>
              You will receive bank transfer instructions after placing your order. Please complete the transfer within 24 hours to confirm your order.
            </p>
          )}
        </div>
      )}

      {paymentMethod === 'cop' && (
        <CashOnPickupDetailsSection
          onDetailsChange={(details) => {
            setPickupDetails(details)
          }}
          customerName={user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : undefined}
          customerPhone={user?.phone}
        />
      )}

      <button
        type='button'
        onClick={onPayment}
        disabled={
          isProcessing ||
          (paymentMethod === 'card' && !selectedCardId && showNewCardForm && (!newCardData.number || !newCardData.expiryMonth || !newCardData.expiryYear || !newCardData.cvv || !newCardData.cardholderName)) ||
          (paymentMethod === 'card' && !selectedCardId && !showNewCardForm && savedCards.length > 0) ||
          (paymentMethod === 'mobile_money' && (!mobileNumber || !validateMobileNumber(mobileNumber))) ||
          (paymentMethod === 'cop' && (!pickupDetails || !pickupDetails.preferredPickupDate || !pickupDetails.preferredPickupTime || !pickupDetails.idType || !pickupDetails.idNumber))
        }
        className='w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50'
      >
        {isProcessing ? 'Processing...' : paymentMethod === 'cop' ? 'Order Now' : 'Pay Now'}
      </button>
    </div>
  )
}

