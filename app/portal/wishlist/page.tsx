'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'
import { HeartIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useCart } from '@/app/contexts/CartContext'
import { WishlistItemSkeleton } from '@/app/components/ui/Skeletons'

interface WishlistItem {
  id: number
  productId: number
  product: {
    id: number
    name: string
    slug: string
    price: number
    currency: string
    images?: string[]
    stockStatus?: string
  }
  createdAt: string
}

export default function WishlistPage() {
  const { loading: authLoading, isAuthenticated } = useClientAuth()
  const { addItem } = useCart()
  const router = useRouter()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<number | null>(null)
  const [addingToCart, setAddingToCart] = useState<number | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/portal/login')
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove from wishlist')
    } finally {
      setRemoving(null)
    }
  }

  const handleAddToCart = async (product: WishlistItem['product']) => {
    try {
      setAddingToCart(product.id)
      await addItem(product.id.toString(), 1)
      toast.success('Added to cart')
    } catch (error: any) {
      toast.error(error.message || 'Failed to add to cart')
    } finally {
      setAddingToCart(null)
    }
  }

  const normalizeImageUrl = (url?: string) => {
    if (!url) return '/images/placeholder-product.png'
    // Convert HTTP to HTTPS for mixed content security
    let normalizedUrl = url;
    if (normalizedUrl.startsWith('http://')) {
      normalizedUrl = normalizedUrl.replace('http://', 'https://');
    }
    if (normalizedUrl.startsWith('http')) return normalizedUrl
    return normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`
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
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] overflow-hidden hover:shadow-[0_0_25px_0_rgba(0,0,0,0.15)] transition-shadow"
            >
              <Link href={`/products/${item.product.slug}`}>
                <div className="relative aspect-square w-full">
                  <Image
                    src={normalizeImageUrl(item.product.images?.[0])}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    unoptimized={item.product.images?.[0]?.startsWith('http')}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/images/placeholder-product.png'
                    }}
                  />
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/products/${item.product.slug}`}>
                  <h3 className="text-lg font-semibold text-gray-900 hover:text-[var(--shreeji-primary)] transition-colors line-clamp-2">
                    {item.product.name}
                  </h3>
                </Link>
                <p className="mt-2 text-xl font-bold text-[var(--shreeji-primary)]">
                  {item.product.currency} {item.product.price?.toLocaleString()}
                </p>
                <div className="mt-4 flex items-center space-x-2">
                  <button
                    onClick={() => handleAddToCart(item.product)}
                    disabled={addingToCart === item.product.id || item.product.stockStatus === 'out-of-stock'}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-[var(--shreeji-primary)] text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ShoppingCartIcon className="h-5 w-5 mr-2" />
                    {addingToCart === item.product.id ? 'Adding...' : 'Add to Cart'}
                  </button>
                  <button
                    onClick={() => handleRemove(item.productId)}
                    disabled={removing === item.productId}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                    title="Remove from wishlist"
                  >
                    {removing === item.productId ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                    ) : (
                      <HeartIconSolid className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

