'use client'

import { useState, useEffect } from 'react'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'
import clientAuth from '@/app/lib/client/auth'
import toast from 'react-hot-toast'
import AuthModal from '@/app/components/portal/AuthModal'

interface WishlistButtonProps {
  productId: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  backgroundColor?: string
}

export default function WishlistButton({ productId, className = '', size = 'md', backgroundColor }: WishlistButtonProps) {
  const { isAuthenticated } = useClientAuth()
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      checkWishlistStatus()
    } else {
      setChecking(false)
    }
  }, [isAuthenticated, productId])

  const checkWishlistStatus = async () => {
    try {
      setChecking(true)
      const response = await clientApi.checkInWishlist(productId)
      setIsInWishlist(response.inWishlist)
    } catch (error) {
      setIsInWishlist(false)
    } finally {
      setChecking(false)
    }
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Verify actual authentication state - check both context and stored token/user
    // This prevents issues where context state is stale but token is invalid/expired
    // Check stored token and user without making API call (API will validate if needed)
    const hasToken = clientAuth.isAuthenticated()
    const storedUser = clientAuth.getStoredUser()
    const isActuallyAuthenticated = isAuthenticated && hasToken && !!storedUser

    if (!isActuallyAuthenticated) {
      setShowAuthModal(true)
      return
    }

    try {
      setLoading(true)
      if (isInWishlist) {
        await clientApi.removeFromWishlist(productId)
        setIsInWishlist(false)
        toast.success('Removed from wishlist')
        // Dispatch event to notify navbar to refresh count
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wishlist-changed'))
        }
      } else {
        await clientApi.addToWishlist(productId)
        setIsInWishlist(true)
        toast.success('Added to wishlist')
        // Dispatch event to notify navbar to refresh count
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wishlist-changed'))
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update wishlist')
    } finally {
      setLoading(false)
    }
  }

  const handleAuthSuccess = async () => {
    // After successful authentication, try to add to wishlist
    try {
      setLoading(true)
      await clientApi.addToWishlist(productId)
      setIsInWishlist(true)
      toast.success('Added to wishlist')
      // Dispatch event to notify navbar to refresh count
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wishlist-changed'))
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add to wishlist')
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  if (checking && isAuthenticated) {
    return (
      <button
        type="button"
        className={`${sizeClasses[size]} ${className} flex items-center justify-center`}
        disabled
      >
        <HeartIcon className="h-full w-full text-gray-300 animate-pulse" />
      </button>
    )
  }

  // When backgroundColor is provided:
  // - Not in wishlist: border only (stroke), no fill
  // - In wishlist: filled (fill and stroke both use backgroundColor)
  const heartIconStyle = backgroundColor ? (
    isInWishlist 
      ? {
          fill: backgroundColor,
          stroke: backgroundColor,
          color: backgroundColor
        }
      : {
          fill: 'none',
          stroke: backgroundColor,
          color: backgroundColor
        }
  ) : {}

  const textColorClasses = backgroundColor 
    ? '' 
    : isInWishlist
      ? 'text-red-500 hover:text-red-600'
      : 'text-gray-400 hover:text-red-500'

  // When backgroundColor is provided, suppress button's own title to let wrapper handle tooltip
  // Otherwise, use the button's own title
  const buttonTitle = backgroundColor 
    ? undefined 
    : !isAuthenticated 
      ? 'Login to add to wishlist'
      : isInWishlist 
        ? 'Remove from wishlist' 
        : 'Add to wishlist'

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`${sizeClasses[size]} ${className} flex items-center justify-center transition-colors ${textColorClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
        title={buttonTitle}
      >
        {loading ? (
          <HeartIcon 
            className="h-full w-full animate-pulse" 
            style={{
              color: backgroundColor ? '#e5e7eb' : '#d1d5db',
              fill: 'none',
              stroke: backgroundColor ? '#e5e7eb' : '#d1d5db'
            }} 
          />
        ) : isInWishlist ? (
          <HeartIconSolid className="h-full w-full" style={heartIconStyle} />
        ) : (
          <HeartIcon className="h-full w-full" style={heartIconStyle} />
        )}
      </button>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode="login"
        onSuccess={handleAuthSuccess}
      />
    </>
  )
}

