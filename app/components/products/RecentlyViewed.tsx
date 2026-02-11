'use client'

import { useEffect, useState } from 'react'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'
import ProductPreview from '@/components/products/ProductPreview'
import { WishlistItemSkeleton } from '@/app/components/ui/Skeletons'

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
    price?: number | string
    discountedPrice?: number | string
    currency?: string
    images?: Array<string | { url: string; alt?: string; isMain?: boolean }>
    tagline?: string
    category?: string
    subcategory?: string
    [key: string]: any // Allow additional fields from API
  }
  viewedAt: string
}

// Transform recently viewed item to ProductPreview format
const transformToProductPreview = (item: RecentlyViewedItem) => {
  // Extract image URLs (handle both string and object formats)
  const images: string[] = []
  if (item.product.images) {
    item.product.images.forEach((img) => {
      if (typeof img === 'string') {
        images.push(img)
      } else if (typeof img === 'object' && img !== null && img.url) {
        images.push(img.url)
      }
    })
  }

  // Get category/subcategory from product or parse from slug
  let category = item.product.category || ''
  let subcategory = item.product.subcategory || undefined
  
  // If category not in product, try to parse from slug
  if (!category && item.product.slug) {
    const slugParts = item.product.slug.split('/').filter(Boolean)
    if (slugParts.length >= 2) {
      category = slugParts[0]
      if (slugParts.length >= 3) {
        subcategory = slugParts[1]
      }
    }
  }

  // ProductPreview expects price as number (it will add "K" prefix itself)
  // Handle both number and string prices
  let price: number = 0
  const productPrice = (item.product as any).sellingPrice || (item.product as any).basePrice || item.product.price
  if (productPrice !== undefined && productPrice !== null) {
    if (typeof productPrice === 'string') {
      // Remove currency prefix if present and parse
      const priceStr = productPrice.replace(/^[A-Z]+\s*/, '').trim()
      price = parseFloat(priceStr) || 0
    } else if (typeof productPrice === 'number') {
      price = productPrice
    }
  }
  
  // Also handle discountedPrice if available
  let discountedPrice: number | undefined = undefined
  const productDiscountedPrice = item.product.discountedPrice
  if (productDiscountedPrice !== undefined && productDiscountedPrice !== null && productDiscountedPrice !== '0.00') {
    if (typeof productDiscountedPrice === 'string') {
      const discountedPriceStr = productDiscountedPrice.replace(/^[A-Z]+\s*/, '').trim()
      const parsed = parseFloat(discountedPriceStr)
      if (!isNaN(parsed) && parsed > 0) {
        discountedPrice = parsed
      }
    } else if (typeof productDiscountedPrice === 'number' && productDiscountedPrice > 0) {
      discountedPrice = productDiscountedPrice
    }
  }

  const transformed = {
    id: item.product.id,
    documentId: item.product.id.toString(),
    name: item.product.name,
    images: images.length > 0 ? images : ['/images/placeholder-product.png'],
    price: price, // Pass as number, ProductPreview will format with "K"
    discountedPrice: discountedPrice,
    tagline: item.product.tagline || undefined,
    category: category || 'products',
    subcategory: subcategory || undefined,
    slug: item.product.slug,
  }

  return transformed
}

export default function RecentlyViewed({ limit = 8, className = '' }: RecentlyViewedProps) {
  const { isAuthenticated } = useClientAuth()
  const [items, setItems] = useState<RecentlyViewedItem[]>([])
  const [loading, setLoading] = useState(true)

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

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Recently Viewed</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <WishlistItemSkeleton key={i} />
            ))}
      </div>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm mt-4">No recently viewed products yet</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item, index) => {
            const product = transformToProductPreview(item)

            return (
              <div key={item.id} className="relative">
                <ProductPreview product={product} index={index} additionalClass="" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

