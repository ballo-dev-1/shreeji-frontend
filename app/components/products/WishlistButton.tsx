'use client'

import { useState, useEffect } from 'react'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'
import toast from 'react-hot-toast'

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

    if (!isAuthenticated) {
      toast.error('Please login to add items to wishlist')
      return
    }

    try {
      setLoading(true)
      if (isInWishlist) {
        await clientApi.removeFromWishlist(productId)
        setIsInWishlist(false)
        toast.success('Removed from wishlist')
      } else {
        await clientApi.addToWishlist(productId)
        setIsInWishlist(true)
        toast.success('Added to wishlist')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update wishlist')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  if (checking) {
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
  const buttonTitle = backgroundColor ? undefined : (isInWishlist ? 'Remove from wishlist' : 'Add to wishlist')

  return (
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
  )
}

