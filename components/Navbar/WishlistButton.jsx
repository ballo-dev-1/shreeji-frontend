'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import { getLoginUrl } from '@/app/lib/client/redirectToLogin'
import clientApi from '@/app/lib/client/api'

export default function WishlistButton() {
  const { isAuthenticated, loading: authLoading } = useClientAuth()
  const pathname = usePathname()
  const [wishlistCount, setWishlistCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadWishlistCount = async () => {
    try {
      setLoading(true)
      const response = await clientApi.getWishlist()
      const count = response.data?.length || 0
      setWishlistCount(count)
    } catch (error) {
      // Silently fail - user might not have wishlist access
      setWishlistCount(0)
    } finally {
      setLoading(false)
    }
  }

  // Load count when auth state changes
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadWishlistCount()
    } else {
      setWishlistCount(0)
    }
  }, [isAuthenticated, authLoading])

  // Refresh count when route changes (e.g., coming back from wishlist page)
  useEffect(() => {
    if (isAuthenticated && !authLoading && pathname) {
      loadWishlistCount()
    }
  }, [pathname])

  // Refresh count on window focus (similar to cart context)
  useEffect(() => {
    if (!isAuthenticated || authLoading) return

    const handleFocus = () => {
      loadWishlistCount()
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [isAuthenticated, authLoading])

  // Listen for custom wishlist change events
  useEffect(() => {
    if (!isAuthenticated || authLoading) return

    const handleWishlistChange = () => {
      loadWishlistCount()
    }

    window.addEventListener('wishlist-changed', handleWishlistChange)
    return () => {
      window.removeEventListener('wishlist-changed', handleWishlistChange)
    }
  }, [isAuthenticated, authLoading])

  // Show loading state or nothing while checking auth
  if (authLoading) {
    return null
  }

  // Link to wishlist if authenticated, login with return URL if not
  const href = isAuthenticated ? '/portal/wishlist' : getLoginUrl()

  return (
    <Link
      href={href}
      className="relative flex items-center justify-center rounded-full p-2 transition-colors hover:bg-[var(--primary)] hover:text-white"
      aria-label={isAuthenticated ? 'Go to wishlist' : 'Sign in to view wishlist'}
    >
      <Heart className="h-5 w-5" />
      {isAuthenticated && wishlistCount > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-xs text-white">
          {wishlistCount > 99 ? '99+' : wishlistCount}
        </span>
      )}
    </Link>
  )
}
