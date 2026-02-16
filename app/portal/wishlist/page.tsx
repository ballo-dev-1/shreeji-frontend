'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import { getLoginUrl } from '@/app/lib/client/redirectToLogin'
import clientApi from '@/app/lib/client/api'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { WishlistItemSkeleton } from '@/app/components/ui/Skeletons'
import ProductPreview from '@/components/products/ProductPreview'

interface WishlistItem {
  id: number
  productId: number
  product: {
    id: number
    name: string
    slug: string
    price: number | string // Can be number or string from API
    currency: string
    images?: Array<string | { url: string; alt?: string; isMain?: boolean }>
    stockStatus?: string
    tagline?: string
    discountedPrice?: number | string
    category?: string
    subcategory?: string
    [key: string]: any // Allow additional fields from API
  }
  createdAt: string
}

export default function WishlistPage() {
  const { loading: authLoading, isAuthenticated } = useClientAuth()
  const router = useRouter()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<number | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(getLoginUrl())
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadWishlist()
    }
  }, [isAuthenticated])

  const loadWishlist = async () => {
    try {
      setLoading(true)
      const response = await clientApi.getWishlist()
      setItems(response.data || [])
    } catch (error: any) {
      console.error('Failed to load wishlist:', error)
      toast.error(error.message || 'Failed to load wishlist')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (productId: number) => {
    try {
      setRemoving(productId)
      await clientApi.removeFromWishlist(productId)
      toast.success('Removed from wishlist')
      loadWishlist()
      // Dispatch event to notify navbar to refresh count
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wishlist-changed'))
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove from wishlist')
    } finally {
      setRemoving(null)
    }
  }

  // Transform wishlist item to ProductPreview format
  const transformToProductPreview = (item: WishlistItem) => {
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
    // API returns sellingPrice or basePrice, not price
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
    const productDiscountedPrice = (item.product as any).discountedPrice
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f5f1e8] pt-24">
        <div className="space-y-6 pb-24">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <WishlistItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
        <p className="mt-2 text-sm text-gray-500">
          Save your favorite products for later
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-12 text-center">
          <HeartIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Your wishlist is empty</h3>
          <p className="mt-2 text-sm text-gray-500">
            Start adding products you love to your wishlist
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-2xl text-white bg-[var(--shreeji-primary)] hover:opacity-90"
          >
            Browse Products
          </Link>
        </div>
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

