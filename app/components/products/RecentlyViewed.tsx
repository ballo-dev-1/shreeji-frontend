'use client'

import { useEffect, useRef, useState } from 'react'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'
import Image from 'next/image'
import Link from 'next/link'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'
import WishlistButton from '@/app/components/products/WishlistButton'

interface RecentlyViewedProps {
  limit?: number
  className?: string
}

interface RecentlyViewedItem {
  id: number
  productId: number
  product: {
    id: number
    name: string
    slug: string
    price?: number
    discountedPrice?: number
    currency?: string
    images?: Array<string | { url: string; isMain?: boolean }>
  }
  viewedAt: string
}

const normalizeImageUrl = (url?: string) => {
  if (!url || typeof url !== 'string') return '/products/placeholder.png'
  let trimmed = url.trim()
  if (!trimmed) return '/products/placeholder.png'
  // Convert HTTP to HTTPS for mixed content security
  // For image server that doesn't support HTTPS, proxy through Next.js
  if (trimmed.startsWith('http://164.92.249.220:9000/')) {
    // Extract the path after the base URL
    const imagePath = trimmed.replace('http://164.92.249.220:9000/', '');
    trimmed = `/api/images/${imagePath}`;
  } else if (trimmed.startsWith('http://')) {
    // For other HTTP URLs, try to convert to HTTPS
    trimmed = trimmed.replace('http://', 'https://');
  }
  if (trimmed.startsWith('http')) return trimmed
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

const convertImagePath = (url: string): string => {
  if (!url || typeof url !== 'string') return url
  if (url.startsWith('http')) return url
  // Keep explicit product paths as-is to avoid mismatched filenames
  if (url.startsWith('/products/')) return url
  if (!url.startsWith('/products/')) return url

  const pathMatch = url.match(/\/products\/(.+)$/)
  if (!pathMatch) return url

  let filename = pathMatch[1]
  const extension = filename.match(/\.(png|jpg|jpeg|webp|gif)$/i)?.[0] || ''
  let baseFilename = filename.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '')

  const hasCamelCase = /[a-z][A-Z]/.test(baseFilename)
  const hasUnderscores = baseFilename.includes('_')
  const hasParentheses = baseFilename.includes('(') && baseFilename.includes(')')
  const hasSpaces = baseFilename.includes(' ') || url.includes('%20')

  // If filename already has spaces or parentheses, assume it is already normalized
  if (hasSpaces || hasParentheses) return url

  if (hasCamelCase) {
    baseFilename = baseFilename.replace(/([a-z])([A-Z])/g, '$1 $2')
  }

  // Insert space between letters and trailing numbers (IdeaPad3 -> IdeaPad 3)
  baseFilename = baseFilename.replace(/([a-zA-Z])(\d+)/g, '$1 $2')

  if (hasUnderscores && !hasParentheses) {
    baseFilename = baseFilename.replace(/_(\d+)\s*$/, ' ($1)')
  }

  baseFilename = baseFilename.replace(/_/g, ' ')
  baseFilename = baseFilename.replace(/\b(g)(\d+)\b/gi, 'G$2')
  baseFilename = baseFilename.replace(/\s+/g, ' ').trim()

  return `/products/${baseFilename}${extension}`
}

const getImageUrl = (product: RecentlyViewedItem['product']) => {
  if (!product.images || product.images.length === 0) {
    return '/products/placeholder.png'
  }

  const firstImage = product.images[0]
  let rawUrl: string | undefined

  if (typeof firstImage === 'string') {
    rawUrl = firstImage
  } else if (typeof firstImage === 'object' && firstImage !== null) {
    const mainImage = product.images.find(
      (img: any) => typeof img === 'object' && img !== null && img.isMain
    ) as { url: string; isMain?: boolean } | undefined

    rawUrl = mainImage?.url || (firstImage as any).url
  }

  if (!rawUrl) return '/products/placeholder.png'

  const normalized = normalizeImageUrl(rawUrl)

  if (normalized.startsWith('/products/') && !normalized.startsWith('http')) {
    return convertImagePath(normalized)
  }

  return normalized
}

function RecentlyViewedCard({ item }: { item: RecentlyViewedItem }) {
  const imageUrl = getImageUrl(item.product)
  // Only use discountedPrice if it's a valid positive number
  const price = (item.product.discountedPrice && item.product.discountedPrice > 0)
    ? item.product.discountedPrice
    : item.product.price
  const currency = item.product.currency || 'ZMW'

  const href = item.product.slug
    ? `/products/${encodeURIComponent(item.product.slug)}`
    : '#'

  return (
    <Link
      href={href}
      className="group relative flex flex-col h-full rounded-2xl p-3 pt-10 transition overflow-visible shadow-sm"
    >
      <div className="absolute bottom-0 left-0 w-full h-[65%] bg-[var(--shreeji-primary)] rounded-xl z-[0]" />
      <div className="block flex-shrink-0 overflow-visible z-[1] cursor-pointer">
        <div className="aspect-[4/3] relative mb-3 overflow-visible">
          <Image
            src={imageUrl}
            alt={item.product.name}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105 overflow-visible"
            sizes="(max-width: 768px) 100vw, 25vw"
            unoptimized={imageUrl?.startsWith?.('http')}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/products/placeholder.png'
            }}
          />
          {item.product.id && (
            <div className="absolute top-2 right-2 z-10">
              <WishlistButton productId={item.product.id} size="sm" />
            </div>
          )}
        </div>

        <div className="space-y-1 text-center my-3 min-h-[60px]">
          <p className="font-bold text-xl py-3 text-white line-clamp-1 h-[2.5rem]">
            {item.product.name}
          </p>
          {price !== undefined ? (
            <div className="flex items-center justify-center space-x-2 text-sm h-5">
              <span className="text-[var(--shreeji-primary)] font-semibold text-lg">
                {currencyFormatter(Number(price || 0), currency || 'ZMW')}
              </span>
            </div>
          ) : (
            <div className="h-5" />
          )}
        </div>
      </div>
    </Link>
  )
}

export default function RecentlyViewed({ limit = 8, className = '' }: RecentlyViewedProps) {
  const { isAuthenticated } = useClientAuth()
  const [items, setItems] = useState<RecentlyViewedItem[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAuthenticated) {
      loadRecentlyViewed()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const loadRecentlyViewed = async () => {
    try {
      setLoading(true)
      const response = await clientApi.getRecentlyViewed()
      const allItems = response.data || []
      
      // Deduplicate by productId, keeping only the most recent view for each product
      const productMap = new Map<number, RecentlyViewedItem>()
      
      allItems.forEach((item: RecentlyViewedItem) => {
        const existing = productMap.get(item.productId)
        if (!existing) {
          productMap.set(item.productId, item)
        } else {
          // Keep the one with the most recent viewedAt timestamp
          const existingDate = new Date(existing.viewedAt)
          const currentDate = new Date(item.viewedAt)
          if (currentDate > existingDate) {
            productMap.set(item.productId, item)
          }
        }
      })
      
      // Convert map to array, sort by viewedAt (most recent first), and limit
      const deduplicatedItems = Array.from(productMap.values())
        .sort((a, b) => {
          const dateA = new Date(a.viewedAt)
          const dateB = new Date(b.viewedAt)
          return dateB.getTime() - dateA.getTime() // Most recent first
        })
        .slice(0, limit)
      
      setItems(deduplicatedItems)
    } catch (error) {
      console.error('Failed to load recently viewed:', error)
    } finally {
      setLoading(false)
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth',
      })
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Recently Viewed</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="z-10 bg-white shadow-lg rounded-full p-2 h-10 w-10 flex items-center justify-center hover:shadow-xl transition-shadow border border-gray-200"
            aria-label="Scroll left"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            className="z-10 bg-white shadow-lg rounded-full p-2 h-10 w-10 flex items-center justify-center hover:shadow-xl transition-shadow border border-gray-200"
            aria-label="Scroll right"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto overflow-y-visible scroll-smooth pb-2 scrollbar-hide"
      >
        {loading
          ? [...Array(limit)].map((_, i) => (
              <div
                key={i}
                className={`w-[240px] sm:w-[260px] lg:w-[280px] flex-shrink-0 ${i === 0 ? 'ml-1' : ''} ${i === limit - 1 ? 'mr-1' : ''}`}
              >
                <div className="animate-pulse h-full rounded-lg bg-gray-100 p-3">
                  <div className="aspect-[4/3] bg-gray-200 rounded" />
                  <div className="mt-4 h-4 bg-gray-200 rounded" />
                  <div className="mt-2 h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))
          : items.map((item, index) => (
              <div
                key={item.id}
                className={`w-[240px] sm:w-[260px] lg:w-[280px] flex-shrink-0 ${index === 0 ? 'ml-1' : ''} ${
                  index === items.length - 1 ? 'mr-1' : ''
                }`}
              >
                <RecentlyViewedCard item={item} />
              </div>
            ))}
      </div>

      {!loading && items.length === 0 && (
        <p className="text-gray-500 text-sm mt-4">No recently viewed products yet</p>
      )}
    </div>
  )
}

