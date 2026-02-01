'use client'

import { useCart } from '@/app/contexts/CartContext'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import { useState, useEffect, useCallback } from 'react'
import CheckoutTopBar from '@/app/components/checkout/CheckoutTopBar'
import CheckoutTitle from '@/app/components/checkout/CheckoutTitle'
import CheckoutAlerts from '@/app/components/checkout/CheckoutAlerts'
import CheckoutSteps from '@/app/components/checkout/CheckoutSteps'
import CheckoutNavigation from '@/app/components/checkout/CheckoutNavigation'
import StickyCheckoutNavigation from '@/app/components/checkout/StickyCheckoutNavigation'
import DeliveryPickupToggle from '@/app/components/checkout/DeliveryPickupToggle'
import DeliveryAddressSection from '@/app/components/checkout/DeliveryAddressSection'
import PickupLocationSection from '@/app/components/checkout/PickupLocationSection'
import OrderSummarySection from '@/app/components/checkout/OrderSummarySection'
import PaymentDetailsSection from '@/app/components/checkout/PaymentDetailsSection'
import OrderDetailsSidebar from '@/app/components/checkout/OrderDetailsSidebar'
import AddressModal from '@/app/components/checkout/AddressModal'
import OrderCompletionModal from '@/app/components/checkout/OrderCompletionModal'
import GuestCustomerInfoModal from '@/app/components/checkout/GuestCustomerInfoModal'
import { ShoppingBag, Gift } from 'lucide-react'
import clientApi from '@/app/lib/client/api'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CheckoutCustomerInput, CheckoutAddressInput } from '@/app/lib/ecommerce/api'

const CHECKOUT_STEPS = [
  { label: 'Review', number: 1 },
  { label: 'Fulfillment & Address', number: 2 },
  { label: 'Payment', number: 3 },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, loading, checkout, isCheckingOut, error: cartError } = useCart()
  const { user, isAuthenticated, loading: authLoading } = useClientAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ orderNumber: string; orderId: number; paymentStatus: string; redirectUrl?: string; requiresAction?: boolean } | null>(null)
  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>('pickup')
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [addresses, setAddresses] = useState<any[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState('cop')
  const [paymentDetails, setPaymentDetails] = useState<{
    cardDetails?: { cardId?: string; number?: string; expiryMonth?: string; expiryYear?: string; cvv?: string; cardholderName?: string; saveCard?: boolean }
    mobileMoneyDetails?: { provider: 'mtn' | 'airtel' | 'zamtel' | 'orange'; phoneNumber: string }
    pickupDetails?: {
      preferredPickupDate: string
      preferredPickupTime: string
      collectingPersonName?: string
      collectingPersonPhone?: string
      collectingPersonRelationship?: string
      vehicleInfo?: string
      idType?: 'nrc' | 'passport' | 'drivers_license' | 'other'
      idNumber?: string
      specialInstructions?: string
    }
  }>({})
  const [showRecoveryMessage, setShowRecoveryMessage] = useState(false)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [availablePoints, setAvailablePoints] = useState<number>(0)
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0)
  const [loadingPoints, setLoadingPoints] = useState(false)
  const [pointsError, setPointsError] = useState<string | null>(null)
  const [showOrderCompletionModal, setShowOrderCompletionModal] = useState(false)
  const [showGuestCustomerModal, setShowGuestCustomerModal] = useState(false)
  const [guestCustomerData, setGuestCustomerData] = useState<CheckoutCustomerInput | null>(null)
  const [guestShippingAddress, setGuestShippingAddress] = useState<CheckoutAddressInput | null>(null)

  // Restore checkout progress on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !success) {
      const saved = sessionStorage.getItem('checkout_progress')
      if (saved) {
        try {
          const state = JSON.parse(saved)
          if (state.currentStep && state.currentStep > 1) {
            setShowRecoveryMessage(true)
            setCurrentStep(state.currentStep)
            setFulfillmentType(state.fulfillmentType || 'pickup')
            setSelectedAddressId(state.selectedAddressId || null)
            setPaymentMethod(state.paymentMethod || 'cop')
          }
        } catch (err) {
          console.error('Failed to restore checkout state', err)
        }
      }
    }
  }, [success])

  // Save checkout progress whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && !success && currentStep > 1) {
      const checkoutState = {
        currentStep,
        fulfillmentType,
        selectedAddressId,
        paymentMethod,
        // Don't save sensitive payment details
      }
      sessionStorage.setItem('checkout_progress', JSON.stringify(checkoutState))
    }
  }, [currentStep, fulfillmentType, selectedAddressId, paymentMethod, success])

  // Validate and redirect to step 1 if requirements not met
  useEffect(() => {
    // Don't validate during loading or if already on step 1 or if checkout is successful
    if (loading || authLoading || currentStep === 1 || success) {
      return
    }

    // Check if cart is null (doesn't exist)
    if (!cart) {
      setCurrentStep(1)
      toast.error('Cart not found. Please add items to continue.')
      return
    }

    // Check if cart is empty
    if (cart.items.length === 0) {
      setCurrentStep(1)
      toast.error('Your cart is empty. Please add items to continue.')
      return
    }

    // Check if cart has errors
    if (cartError) {
      setCurrentStep(1)
      toast.error('There was an error with your cart. Please refresh and try again.')
      return
    }

    // Check if cart items are valid (have required fields)
    const hasInvalidItems = cart.items.some(item => 
      !item.productSnapshot || 
      item.subtotal == null || 
      item.subtotal < 0 ||
      item.quantity == null ||
      item.quantity <= 0
    )
    if (hasInvalidItems) {
      setCurrentStep(1)
      toast.error('Your cart contains invalid items. Please refresh your cart.')
      return
    }

    // Check if guest user hasn't provided customer information
    if (!isAuthenticated) {
      if (!guestCustomerData || !guestCustomerData.email || !guestCustomerData.firstName || !guestCustomerData.lastName) {
        setCurrentStep(1)
        // Optionally show the modal
        setShowGuestCustomerModal(true)
        return
      }
      
      // Validate email format
      const email = guestCustomerData.email?.trim() || ''
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email) || guestCustomerData.firstName.trim().length < 2 || guestCustomerData.lastName.trim().length < 2) {
        setCurrentStep(1)
        setShowGuestCustomerModal(true)
        return
      }
    }
  }, [currentStep, cart, cartError, loading, authLoading, isAuthenticated, guestCustomerData, success])

  // Clear checkout progress on successful completion
  useEffect(() => {
    if (success && typeof window !== 'undefined') {
      sessionStorage.removeItem('checkout_progress')
    }
  }, [success])

  const loadUserData = useCallback(async () => {
    try {
      setLoadingAddresses(true)
      const [profileResponse, addressesResponse] = await Promise.all([
        clientApi.getProfile().catch(() => null),
        clientApi.getAddresses().catch(() => ({ data: [] })),
      ])

      if (profileResponse?.data) {
        setUserProfile(profileResponse.data)
      }

      if (addressesResponse?.data) {
        setAddresses(addressesResponse.data)
        // Select default address if available
        const defaultAddress = addressesResponse.data.find((addr: any) => addr.isDefault)
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id.toString())
        } else if (addressesResponse.data.length > 0) {
          setSelectedAddressId(addressesResponse.data[0].id.toString())
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoadingAddresses(false)
    }
  }, [])

  const loadLoyaltyPoints = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      setLoadingPoints(true)
      const res = await clientApi.getLoyaltyPoints()
      setAvailablePoints(res.data?.points || 0)
      setPointsError(null)
    } catch (error) {
      console.error('Error loading loyalty points:', error)
      setPointsError('Failed to load loyalty points')
    } finally {
      setLoadingPoints(false)
    }
  }, [isAuthenticated])

  // Load user profile and addresses if authenticated
  // This will automatically trigger when auth state changes (e.g., after login)
  useEffect(() => {
    // Wait for auth loading to complete before checking auth state
    if (!authLoading) {
      if (isAuthenticated) {
        loadUserData()
        loadLoyaltyPoints()
      } else {
        // Clear user data if not authenticated
        setAddresses([])
        setUserProfile(null)
        setSelectedAddressId(null)
        setAvailablePoints(0)
        setPointsToRedeem(0)
      }
    }
  }, [isAuthenticated, authLoading, loadUserData, loadLoyaltyPoints])

  const handleAddAddress = () => {
    setIsAddressModalOpen(true)
  }

  const handleAddressAdded = async () => {
    // Reload addresses after successful creation
    if (isAuthenticated) {
      await loadUserData()
    }
  }

  const handleNext = () => {
    setFormError(null)

    // Validate current step before proceeding
    if (currentStep === 1) {
      // Step 1: Review - show guest customer info modal if not authenticated
      if (!isAuthenticated) {
        if (!guestCustomerData) {
          // Show modal to collect guest information
          setShowGuestCustomerModal(true)
          return
        }
        
        // Validate existing data
        const email = guestCustomerData.email?.trim() || ''
        const firstName = guestCustomerData.firstName?.trim() || ''
        const lastName = guestCustomerData.lastName?.trim() || ''
        
        if (!email || !firstName || !lastName) {
          setShowGuestCustomerModal(true)
          return
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email) || firstName.length < 2 || lastName.length < 2) {
          setShowGuestCustomerModal(true)
          return
        }
      }
      setCurrentStep(2)
      // Scroll to top when proceeding to next step
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (currentStep === 2) {
      // Step 2: Fulfillment & Address - validate if delivery
      if (fulfillmentType === 'delivery') {
        if (isAuthenticated && !selectedAddressId) {
          toast.error('Please select a delivery address.')
          return
        }
        if (!isAuthenticated) {
          if (!guestShippingAddress || !guestShippingAddress.addressLine1 || !guestShippingAddress.city || !guestShippingAddress.postalCode || !guestShippingAddress.country) {
            toast.error('Please fill in all required address fields.')
            return
          }
        }
      }
      setCurrentStep(3)
      // Scroll to top when proceeding to next step
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (currentStep === 3) {
      // Step 3: Payment - process checkout
      handlePayment()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setFormError(null)
      // Scroll to top when going back to previous step
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePayment = async () => {
    // Log current cart entity/items when pay/order now button is clicked
    console.log('=== PAY/ORDER NOW BUTTON CLICKED - CART DATA ===')
    console.log('Full Cart Entity:', JSON.stringify(cart, null, 2))
    console.log('Cart Items:', JSON.stringify(cart?.items || [], null, 2))
    console.log('Cart Summary:', {
      cartId: cart?.id,
      itemCount: cart?.items?.length || 0,
      subtotal: cart?.subtotal,
      taxTotal: cart?.taxTotal,
      total: cart?.total,
      currency: cart?.currency,
    })
    console.log('Cart Items Details:', cart?.items?.map(item => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      taxRate: item.taxRate,
      productSnapshot: item.productSnapshot,
    })))
    console.log('================================================')

    setFormError(null)
    setSuccess(null)

    if (!cart || cart.items.length === 0) {
      toast.error('Your cart is empty.')
      return
    }

    if (fulfillmentType === 'delivery' && !selectedAddressId) {
      toast.error('Please select a delivery address.')
      return
    }

    try {
      // Get customer data from authenticated user or use form data
      let customerData
      let shippingAddressData

      if (isAuthenticated && userProfile) {
        // Use authenticated user data
        customerData = {
          email: userProfile.email,
          firstName: userProfile.firstName || user?.firstName || '',
          lastName: userProfile.lastName || user?.lastName || '',
          phone: userProfile.phone || '',
        }

        // Get selected address if delivery
        if (fulfillmentType === 'delivery' && selectedAddressId) {
          const selectedAddress = addresses.find(
            (addr) => addr.id.toString() === selectedAddressId
          )
          if (selectedAddress) {
            shippingAddressData = {
              firstName: selectedAddress.firstName,
              lastName: selectedAddress.lastName,
              addressLine1: selectedAddress.addressLine1,
              addressLine2: selectedAddress.addressLine2 || '',
              city: selectedAddress.city,
              state: selectedAddress.state || '',
              postalCode: selectedAddress.postalCode,
              country: selectedAddress.country,
              phone: selectedAddress.phone || customerData.phone,
            }
          }
        }
      } else {
        // Guest checkout - use collected guest data
        if (!guestCustomerData || !guestCustomerData.email || !guestCustomerData.firstName || !guestCustomerData.lastName) {
          toast.error('Please fill in all required customer information.')
          return
        }
        customerData = guestCustomerData

        if (fulfillmentType === 'delivery') {
          if (!guestShippingAddress || !guestShippingAddress.addressLine1 || !guestShippingAddress.city || !guestShippingAddress.postalCode || !guestShippingAddress.country) {
            toast.error('Please fill in all required address fields.')
            return
          }
          shippingAddressData = guestShippingAddress
        }
      }

      // If no address selected for delivery, show error
      if (fulfillmentType === 'delivery' && !shippingAddressData) {
        if (isAuthenticated) {
          toast.error('Please select a delivery address.')
        } else {
          toast.error('Please fill in all required address fields.')
        }
        return
      }

      // Validate points redemption
      if (pointsToRedeem > availablePoints) {
        setPointsError(`You can only redeem up to ${availablePoints} points (ZMW ${(availablePoints / 100).toFixed(2)})`)
        toast.error('Please correct the points redemption amount.')
        return
      }

      // Map frontend payment method to backend payment method
      let backendPaymentMethod = paymentMethod
      if (paymentMethod === 'card') {
        // Determine if it's credit or debit card (simplified - could be enhanced)
        backendPaymentMethod = 'credit_card'
      } else if (paymentMethod === 'cop') {
        backendPaymentMethod = 'cash_on_pickup'
      }

      const maxPointsAllowed = cart?.total ? Math.floor(cart.total * 100) : availablePoints
      const pointsToUse = Math.max(0, Math.min(pointsToRedeem, availablePoints, maxPointsAllowed))

      // Build checkout payload - only include payment details when relevant and valid
      const checkoutPayload: any = {
        customer: customerData,
        shippingAddress: shippingAddressData,
        billingAddress: undefined, // Use same as shipping for now
        paymentMethod: backendPaymentMethod,
        notes: fulfillmentType === 'pickup' ? 'Pickup order' : '',
      }

      if (pointsToUse > 0) {
        checkoutPayload.pointsToRedeem = pointsToUse
      }

      // Only include cardDetails if payment method is card and details exist
      if (backendPaymentMethod === 'credit_card' && paymentDetails.cardDetails) {
        // Only include if it has either cardId or all required card fields
        if (
          paymentDetails.cardDetails.cardId ||
          (paymentDetails.cardDetails.number &&
            paymentDetails.cardDetails.expiryMonth &&
            paymentDetails.cardDetails.expiryYear &&
            paymentDetails.cardDetails.cvv &&
            paymentDetails.cardDetails.cardholderName)
        ) {
          checkoutPayload.cardDetails = paymentDetails.cardDetails
        }
      }

      // Only include mobileMoneyDetails if payment method is mobile_money and details exist
      if (backendPaymentMethod === 'mobile_money' && paymentDetails.mobileMoneyDetails) {
        // Only include if it has both provider and phoneNumber
        if (paymentDetails.mobileMoneyDetails.provider && paymentDetails.mobileMoneyDetails.phoneNumber) {
          checkoutPayload.mobileMoneyDetails = paymentDetails.mobileMoneyDetails
        }
      }

      // Only include pickupDetails if payment method is cash_on_pickup and details exist
      if (backendPaymentMethod === 'cash_on_pickup' && paymentDetails.pickupDetails) {
        // Only include if it has required fields
        if (
          paymentDetails.pickupDetails.preferredPickupDate &&
          paymentDetails.pickupDetails.preferredPickupTime &&
          paymentDetails.pickupDetails.idType &&
          paymentDetails.pickupDetails.idNumber
        ) {
          checkoutPayload.pickupDetails = paymentDetails.pickupDetails
        }
      }

      const response = await checkout(checkoutPayload)

      // Handle payment redirect (for DPO gateway)
      if (response.redirectUrl && response.requiresAction) {
        // Store order info for return
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pendingOrder', JSON.stringify({
            orderNumber: response.orderNumber,
            orderId: response.orderId,
          }))
        }
        // Redirect to payment gateway
        window.location.href = response.redirectUrl
        return
      }

      // Check authentication status and handle accordingly
      if (response.orderNumber && response.orderId) {
        // Clear guest data after successful checkout
        if (!isAuthenticated) {
          setGuestCustomerData(null)
          setGuestShippingAddress(null)
        }
        
        if (isAuthenticated) {
          // Redirect authenticated users to order detail page
          router.push(`/portal/orders/${response.orderId}`)
        } else {
          // Show modal for non-authenticated users
          setSuccess({
            orderNumber: response.orderNumber,
            orderId: response.orderId,
            paymentStatus: response.paymentStatus,
          })
          setShowOrderCompletionModal(true)
        }
      } else {
        // Fallback to original behavior if no order info
        setSuccess({
          orderNumber: response.orderNumber,
          orderId: response.orderId,
          paymentStatus: response.paymentStatus,
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Checkout failed. Please try again.'
      toast.error(errorMessage)
      setFormError(errorMessage)
    }
  }

  const canProceedToNext = (): boolean => {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'checkout/page.tsx:526',message:'canProceedToNext called',data:{currentStep,fulfillmentType,selectedAddressId,isAuthenticated,hasGuestAddress:!!guestShippingAddress,guestAddressComplete:!!(guestShippingAddress?.addressLine1&&guestShippingAddress?.city&&guestShippingAddress?.postalCode&&guestShippingAddress?.country),paymentMethod,hasCardDetails:!!paymentDetails.cardDetails,hasMobileMoneyDetails:!!paymentDetails.mobileMoneyDetails,hasPickupDetails:!!paymentDetails.pickupDetails},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    switch (currentStep) {
      case 1:
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'checkout/page.tsx:529',message:'Step 1: returning true',data:{result:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        return true // Review always valid
      case 2:
        // #region agent log
        const step2Result = fulfillmentType === 'pickup' || selectedAddressId !== null;
        fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'checkout/page.tsx:531',message:'Step 2: checking address',data:{fulfillmentType,isPickup:fulfillmentType==='pickup',selectedAddressId,hasSelectedAddress:selectedAddressId!==null,isAuthenticated,hasGuestAddress:!!guestShippingAddress,guestAddressData:guestShippingAddress?{hasAddressLine1:!!guestShippingAddress.addressLine1,hasCity:!!guestShippingAddress.city,hasPostalCode:!!guestShippingAddress.postalCode,hasCountry:!!guestShippingAddress.country}:null,result:step2Result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        return step2Result
      case 3:
        if (paymentMethod === 'cop') {
          // #region agent log
          const copResult = !!(
            paymentDetails.pickupDetails?.preferredPickupDate && 
            paymentDetails.pickupDetails?.preferredPickupTime &&
            paymentDetails.pickupDetails?.idType &&
            paymentDetails.pickupDetails?.idNumber
          );
          fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'checkout/page.tsx:533',message:'Step 3: checking COP details',data:{paymentMethod,hasPickupDate:!!paymentDetails.pickupDetails?.preferredPickupDate,hasPickupTime:!!paymentDetails.pickupDetails?.preferredPickupTime,hasIdType:!!paymentDetails.pickupDetails?.idType,hasIdNumber:!!paymentDetails.pickupDetails?.idNumber,result:copResult},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
          // #endregion
          return copResult
        }
        // #region agent log
        const step3OtherResult = paymentMethod !== '';
        const cardValid = paymentMethod === 'card' ? !!(paymentDetails.cardDetails?.cardId || (paymentDetails.cardDetails?.number && paymentDetails.cardDetails?.expiryMonth && paymentDetails.cardDetails?.expiryYear && paymentDetails.cardDetails?.cvv && paymentDetails.cardDetails?.cardholderName)) : true;
        const mobileMoneyValid = paymentMethod === 'mobile_money' ? !!(paymentDetails.mobileMoneyDetails?.provider && paymentDetails.mobileMoneyDetails?.phoneNumber) : true;
        fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'checkout/page.tsx:542',message:'Step 3: checking other payment methods',data:{paymentMethod,hasPaymentMethod:paymentMethod!=='',isCard:paymentMethod==='card',isMobileMoney:paymentMethod==='mobile_money',cardValid,mobileMoneyValid,hasCardDetails:!!paymentDetails.cardDetails,hasMobileMoneyDetails:!!paymentDetails.mobileMoneyDetails,cardDetails:paymentDetails.cardDetails?{hasCardId:!!paymentDetails.cardDetails.cardId,hasNumber:!!paymentDetails.cardDetails.number,hasExpiryMonth:!!paymentDetails.cardDetails.expiryMonth,hasExpiryYear:!!paymentDetails.cardDetails.expiryYear,hasCvv:!!paymentDetails.cardDetails.cvv,hasCardholderName:!!paymentDetails.cardDetails.cardholderName}:null,mobileMoneyDetails:paymentDetails.mobileMoneyDetails?{hasProvider:!!paymentDetails.mobileMoneyDetails.provider,hasPhoneNumber:!!paymentDetails.mobileMoneyDetails.phoneNumber}:null,currentResult:step3OtherResult,shouldBeValid:cardValid&&mobileMoneyValid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        return step3OtherResult
      default:
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'checkout/page.tsx:544',message:'Default case: returning false',data:{currentStep,result:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        return false
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-[#f5f1e8] pt-24'>
        <div className='mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8'>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-8"></div>
          <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[#f5f1e8] pt-24'>
      <div className='mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8'>
        <CheckoutTitle currentStep={currentStep} />

        {/* Recovery Message */}
        {showRecoveryMessage && (
          <div className='mb-4 rounded-md bg-blue-50 border border-blue-200 p-4 text-blue-800'>
            <div className='flex items-start justify-between'>
              <div>
                <p className='font-semibold'>Welcome back!</p>
                <p className='text-sm mt-1'>We've restored your checkout progress. You can continue where you left off.</p>
              </div>
              <button
                onClick={() => setShowRecoveryMessage(false)}
                className='ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium'
                aria-label='Dismiss message'
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <CheckoutAlerts
          cartError={cartError}
          formError={formError}
          success={isAuthenticated ? success : null}
          paymentMethod={paymentMethod}
          onRetry={() => {
            setFormError(null)
            handlePayment()
          }}
        />

        <CheckoutSteps currentStep={currentStep} totalSteps={CHECKOUT_STEPS.length} steps={CHECKOUT_STEPS} />

        <div className='grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]'>
          {/* Left Column - Main Content */}
          <div className='space-y-8'>
            {/* Step 1: Review Order */}
            {currentStep === 1 && (
              <OrderSummarySection />
            )}

            {/* Step 2: Fulfillment & Address */}
            {currentStep === 2 && (
              <div className='space-y-6'>
                <DeliveryPickupToggle
                  fulfillmentType={fulfillmentType}
                  onFulfillmentTypeChange={setFulfillmentType}
                />
                {fulfillmentType === 'delivery' ? (
                  <DeliveryAddressSection
                    selectedAddressId={selectedAddressId}
                    onAddressSelect={setSelectedAddressId}
                    onAddAddress={handleAddAddress}
                    addresses={addresses}
                    loading={loadingAddresses}
                    isAuthenticated={isAuthenticated}
                    guestAddressData={guestShippingAddress}
                    onGuestAddressChange={setGuestShippingAddress}
                  />
                ) : (
                  <PickupLocationSection />
                )}
              </div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && (
              <div className='space-y-4'>
                <PaymentDetailsSection
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                  onPayment={handlePayment}
                  onPaymentDetailsChange={setPaymentDetails}
                  isProcessing={isCheckingOut}
                />
              </div>
            )}

            {/* Navigation */}
            {!success && (
              <CheckoutNavigation
                currentStep={currentStep}
                totalSteps={CHECKOUT_STEPS.length}
                onPrevious={handlePrevious}
                onNext={handleNext}
                canProceed={canProceedToNext()}
                isLastStep={currentStep === CHECKOUT_STEPS.length}
                isProcessing={isCheckingOut}
                nextButtonLabel={currentStep === 3 ? 'Complete Order' : undefined}
              />
            )}
            </div>

          {/* Right Column - Order Details Sidebar */}
          <div className='order-first lg:order-last lg:sticky lg:top-20 lg:self-start space-y-6'>
            <OrderDetailsSidebar fulfillmentType={fulfillmentType} currentStep={currentStep} />
            
            {/* Loyalty Points Section - Only show on Step 3 */}
            {currentStep === 3 && (
              <div className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-900'>Use loyalty points</p>
                    <p className='text-xs text-gray-500'>Available: {availablePoints} points (ZMW {(availablePoints / 100).toFixed(2)})</p>
                  </div>
                  <Gift className='h-5 w-5 text-[var(--shreeji-primary)]' />
                </div>
                {isAuthenticated ? 
                  (<div className='mt-3 grid grid-cols-1 gap-3'>
                    <div>
                      <label className='block text-xs font-medium text-gray-700'>Points to redeem</label>
                      <input
                        type='number'
                        min={0}
                        value={pointsToRedeem}
                        onChange={(e) => {
                          const value = Number(e.target.value)
                          if (value < 0) {
                            setPointsToRedeem(0)
                            setPointsError(null)
                          } else {
                            setPointsToRedeem(value)
                            if (value <= availablePoints) {
                              setPointsError(null)
                            }
                          }
                        }}
                        className={`mt-1 w-full rounded-lg border px-3 py-2 ${
                          pointsToRedeem > availablePoints
                            ? 'border-red-500 text-red-600 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'
                        }`}
                        disabled={loadingPoints}
                      />
                      {pointsToRedeem > availablePoints && (
                        <p className='mt-1 text-xs text-red-600'>
                          You can only redeem up to {availablePoints} points (ZMW {(availablePoints / 100).toFixed(2)})
                        </p>
                      )}
                      {pointsError && pointsToRedeem <= availablePoints && (
                        <p className='mt-1 text-xs text-red-600'>{pointsError}</p>
                      )}
                    </div>
                    <div className={`flex flex-col justify-end rounded-lg p-3 text-sm ${
                      pointsToRedeem > availablePoints
                        ? 'bg-red-50 text-red-700'
                        : 'bg-gray-50 text-gray-700'
                    }`}>
                      <span className='font-semibold'>Discount preview</span>
                      <span className={pointsToRedeem > availablePoints ? 'text-red-600' : ''}>
                        ZMW {(pointsToRedeem / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>) : (
                    <div className='mt-3 space-y-3'>
                      <p className='text-sm font-medium text-gray-900'>You need to be logged in to use loyalty points</p>
                      <button
                        onClick={() => {
                          // Store the return URL so we can redirect back after login
                          if (typeof window !== 'undefined') {
                            sessionStorage.setItem('returnUrl', '/checkout')
                          }
                          router.push('/portal/login')
                        }}
                        className='w-full px-4 py-2 bg-[var(--shreeji-primary)] text-white rounded-lg hover:bg-[#544829] transition-colors font-medium text-sm'
                      >
                        Sign In
                      </button>
                    </div>
                  )
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Navigation */}
      {!success && (
        <StickyCheckoutNavigation
          currentStep={currentStep}
          totalSteps={CHECKOUT_STEPS.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          canProceed={canProceedToNext()}
          isLastStep={currentStep === CHECKOUT_STEPS.length}
          isProcessing={isCheckingOut}
        />
      )}

      {/* Address Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSuccess={handleAddressAdded}
      />

      {/* Guest Customer Information Modal */}
      <GuestCustomerInfoModal
        isOpen={showGuestCustomerModal}
        onClose={() => setShowGuestCustomerModal(false)}
        onSuccess={(data) => {
          setGuestCustomerData(data)
          setShowGuestCustomerModal(false)
          // Automatically proceed to next step after successful submission
          setCurrentStep(2)
          // Scroll to top when proceeding to next step
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        initialData={guestCustomerData}
      />

      {/* Order Completion Modal */}
      {success && (
        <OrderCompletionModal
          isOpen={showOrderCompletionModal}
          onClose={() => {
            setShowOrderCompletionModal(false)
            setSuccess(null)
          }}
          orderNumber={success.orderNumber}
          orderId={success.orderId}
          paymentStatus={success.paymentStatus}
          paymentMethod={paymentMethod}
          guestEmail={!isAuthenticated ? guestCustomerData?.email : undefined}
          guestFirstName={!isAuthenticated ? guestCustomerData?.firstName : undefined}
          guestLastName={!isAuthenticated ? guestCustomerData?.lastName : undefined}
        />
      )}
    </div>
  )
}
