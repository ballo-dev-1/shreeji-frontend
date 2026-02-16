'use client'

import {
  addCartItem,
  Cart,
  CheckoutAddressInput,
  CheckoutCustomerInput,
  checkoutCart,
  CheckoutResponse,
  clearCart as clearRemoteCart,
  createCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '@/app/lib/ecommerce/api'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useClientAuth } from './ClientAuthContext'

const CART_STORAGE_KEY = 'shreeji_cart_id'
const USER_CART_STORAGE_KEY = 'shreeji_user_cart_id'

export interface CheckoutInput {
  customer: CheckoutCustomerInput
  shippingAddress: CheckoutAddressInput
  billingAddress?: CheckoutAddressInput
  paymentMethod: string
  couponCode?: string
  cardDetails?: {
    cardId?: string
    number?: string
    expiryMonth?: string
    expiryYear?: string
    cvv?: string
    cardholderName?: string
  }
  mobileMoneyDetails?: {
    provider: 'mtn' | 'airtel' | 'zamtel' | 'orange'
    phoneNumber: string
  }
  notes?: string
}

interface CartContextValue {
  cart: Cart | null
  loading: boolean
  updating: boolean
  error: string | null
  isCheckingOut: boolean
  addItem: (productId: number | string, quantity?: number, variantId?: number) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
  checkout: (input: CheckoutInput) => Promise<CheckoutResponse>
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useClientAuth()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ensureCartExists = useCallback(async (): Promise<string> => {
    if (cart?.id) {
      return cart.id
    }

    // Use user-specific cart storage if authenticated
    const storageKey = isAuthenticated && user?.id 
      ? `${USER_CART_STORAGE_KEY}_${user.id}` 
      : CART_STORAGE_KEY

    const storedId = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null

    if (storedId) {
      try {
        const existing = await getCart(storedId)
        setCart(existing)
        return existing.id
      } catch (err) {
        console.error('Failed to load stored cart', err)
        if (typeof window !== 'undefined') {
          localStorage.removeItem(storageKey)
        }
      }
    }

    const newCart = await createCart()
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, newCart.id)
      // Clear guest cart if user just logged in
      if (isAuthenticated && storageKey !== CART_STORAGE_KEY) {
        const guestCartId = localStorage.getItem(CART_STORAGE_KEY)
        if (guestCartId && guestCartId !== newCart.id) {
          // Optionally merge guest cart items here
          // For now, just clear the guest cart
          localStorage.removeItem(CART_STORAGE_KEY)
        }
      }
    }
    setCart(newCart)
    return newCart.id
  }, [cart, isAuthenticated, user?.id])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        await ensureCartExists()
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to initialize cart')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [ensureCartExists, isAuthenticated, user?.id]) // Re-initialize when auth state changes

  const refreshCart = useCallback(async () => {
    try {
      const cartId = await ensureCartExists()
      const latest = await getCart(cartId)
      setCart(latest)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh cart')
    }
  }, [ensureCartExists])

  // Cross-tab synchronization: Listen for changes in other tabs
  useEffect(() => {
    if (!cart?.id) return

    // Listen for storage events (when localStorage changes in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      const storageKey = isAuthenticated && user?.id 
        ? `${USER_CART_STORAGE_KEY}_${user.id}` 
        : CART_STORAGE_KEY
      
      if (e.key === storageKey && e.newValue) {
        // Cart ID changed in another tab, refresh cart
        refreshCart()
      }
    }

    // Listen for visibility change (when user switches back to this tab)
    const handleVisibilityChange = () => {
      if (!document.hidden && cart?.id) {
        // Tab became visible, refresh cart to get latest data
        refreshCart()
      }
    }

    // Listen for focus events (when tab regains focus)
    const handleFocus = () => {
      if (cart?.id) {
        refreshCart()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('focus', handleFocus)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [refreshCart, cart?.id, isAuthenticated, user?.id])

  const addItem = useCallback(
    async (productId: number | string, quantity = 1, variantId?: number) => {
      setUpdating(true)
      setError(null)
      try {
        const cartId = await ensureCartExists()
        const updated = await addCartItem(cartId, productId, quantity, variantId)
        setCart(updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to add item')
        throw err
      } finally {
        setUpdating(false)
      }
    },
    [ensureCartExists],
  )

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      setUpdating(true)
      setError(null)
      try {
        const cartId = await ensureCartExists()
        const updated = await updateCartItem(cartId, itemId, quantity)
        
        // Preserve original item order by mapping old order to new items
        if (cart?.items && updated.items) {
          const itemOrderMap = new Map(cart.items.map((item, index) => [item.id, index]))
          const sortedItems = [...updated.items].sort((a, b) => {
            const aIndex = itemOrderMap.get(a.id) ?? Infinity
            const bIndex = itemOrderMap.get(b.id) ?? Infinity
            return aIndex - bIndex
          })
          
          // If new items exist (shouldn't happen on update, but handle it)
          updated.items.forEach((newItem) => {
            if (!itemOrderMap.has(newItem.id)) {
              sortedItems.push(newItem)
            }
          })
          
          setCart({ ...updated, items: sortedItems })
        } else {
        setCart(updated)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to update item')
        throw err
      } finally {
        setUpdating(false)
      }
    },
    [ensureCartExists, cart?.items],
  )

  const removeItem = useCallback(
    async (itemId: string) => {
      setUpdating(true)
      setError(null)
      try {
        // Validate itemId
        if (!itemId || typeof itemId !== 'string') {
          console.error('Invalid itemId:', itemId, typeof itemId)
          setError('Invalid item ID. Please refresh the page.')
          return
        }

        // Validate itemId exists in cart
        const cartItem = cart?.items.find(item => item.id === itemId)
        if (!cartItem) {
          console.error('Item not found in cart:', {
            itemId,
            itemIdType: typeof itemId,
            cartItems: cart?.items.map(i => ({ id: i.id, idType: typeof i.id }))
          })
          setError('Item not found in cart. Please refresh the page.')
          return
        }
        
        const cartId = await ensureCartExists()
        try {
          const updated = await removeCartItem(cartId, itemId)
          setCart(updated)
        } catch (err: any) {
          // If we get a UUID validation error or 400 Bad Request from backend, refresh cart and try again
          // This handles cases where cart has old data with numeric IDs
          const isInvalidIdError = 
            err.message?.includes('UUID') || 
            err.message?.includes('uuid') || 
            err.message?.includes('itemId must be') ||
            err.message?.includes('(400)') ||
            (err.message?.includes('Bad Request') && err.message?.includes('400'));
            
          if (isInvalidIdError) {
            console.warn('Invalid item ID format detected, refreshing cart...', itemId)
            // Refresh cart to get latest data with proper UUIDs
            await refreshCart()
            
            // Get the refreshed cart to find the correct item ID
            const refreshedCartId = await ensureCartExists()
            const refreshedCart = await getCart(refreshedCartId)
            
            // Try to find the item by productId from the old item
            const oldItem = cart?.items.find(item => item.id === itemId)
            if (oldItem) {
              const newItem = refreshedCart.items.find(item => item.productId === oldItem.productId)
              if (newItem && newItem.id !== itemId) {
                // Found item with correct UUID, try removing with correct ID
                console.log('Retrying with correct item ID:', newItem.id)
                const updated = await removeCartItem(refreshedCartId, newItem.id)
                setCart(updated)
                return
              }
            }
            
            // If we can't find it, the cart might be corrupted - clear it
            console.warn('Could not find item after refresh, clearing cart...')
            const cartIdToClear = await ensureCartExists()
            const clearedCart = await clearRemoteCart(cartIdToClear)
            setCart(clearedCart)
            throw new Error('Cart had invalid data. Your cart has been cleared. Please add items again.')
          }
          throw err
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unable to remove item'
        console.error('Remove item error:', {
          error: err,
          itemId,
          itemIdType: typeof itemId,
          cartItems: cart?.items.map(i => ({ id: i.id, idType: typeof i.id }))
        })
        setError(errorMessage)
      } finally {
        setUpdating(false)
      }
    },
    [ensureCartExists, cart, refreshCart],
  )

  const clearCart = useCallback(async () => {
    setUpdating(true)
    setError(null)
    try {
      const cartId = await ensureCartExists()
      const updated = await clearRemoteCart(cartId)
      setCart(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to clear cart')
      throw err
    } finally {
      setUpdating(false)
    }
  }, [ensureCartExists])

  const checkout = useCallback(
    async (input: CheckoutInput) => {
      setIsCheckingOut(true)
      setError(null)
      try {
        const cartId = await ensureCartExists()
        const result = await checkoutCart({
          cartId,
          ...input,
          billingAddress: input.billingAddress ?? input.shippingAddress,
        })

        // Only clear cart if payment is successful or pending (not failed)
        const paymentStatus = result.paymentStatus?.toLowerCase()
        const shouldClearCart = 
          paymentStatus === 'approved' || 
          paymentStatus === 'completed' || 
          paymentStatus === 'pending'

        if (shouldClearCart) {
          // Clear cart storage (user-specific or guest)
          if (typeof window !== 'undefined') {
            const storageKey = isAuthenticated && user?.id 
              ? `${USER_CART_STORAGE_KEY}_${user.id}` 
              : CART_STORAGE_KEY
            localStorage.removeItem(storageKey)
          }
          setCart(null)
          await ensureCartExists()
        }

        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Checkout failed'
        setError(message)
        throw err
      } finally {
        setIsCheckingOut(false)
      }
    },
    [ensureCartExists, isAuthenticated, user?.id],
  )

  const value = useMemo(
    () => ({
      cart,
      loading,
      updating,
      error,
      isCheckingOut,
      addItem,
      updateItem,
      removeItem,
      clearCart,
      refreshCart,
      checkout,
    }),
    [cart, loading, updating, error, isCheckingOut, addItem, updateItem, removeItem, clearCart, refreshCart, checkout],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
