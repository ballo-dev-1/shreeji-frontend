'use client'

import { useEffect, useState, useRef } from 'react'
import clientApi from '@/app/lib/client/api'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import { useCart } from '@/app/contexts/CartContext'
import toast from 'react-hot-toast'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'
import WishlistButton from '@/app/components/products/WishlistButton'

interface ProductRecommendation {
  id: number
  name: string
  slug?: string
  category?: string
  subcategory?: string | { id: number; name: string; urlPath?: string }
  subcategoryId?: number
  images?: Array<string | { url: string; alt?: string; isMain?: boolean }>
  price?: number
  sellingPrice?: number
  discountedPrice?: number
}

interface ProductRecommendationsProps {
  productId: number
}

export default function ProductRecommendations({ productId }: ProductRecommendationsProps) {
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<{
    customersAlsoBought: ProductRecommendation[]
    youMayLike: ProductRecommendation[]
    related: ProductRecommendation[]
  }>({
    customersAlsoBought: [],
    youMayLike: [],
    related: [],
  })

  useEffect(() => {
    if (!productId) return

    // Reset state when product changes
    setHasLoaded(false)
    setLoading(true)

    const load = async () => {
      try {
        setLoading(true)
        const res = await clientApi.getProductRecommendations(productId)
        setData({
          customersAlsoBought: res.customersAlsoBought || [],
          youMayLike: res.youMayLike || [],
          related: res.related || [],
        })
      } catch (err) {
        console.error('Failed to load recommendations', err)
      } finally {
        setLoading(false)
      }
    }

    // Use Intersection Observer to load only when component is about to be visible
    // Fallback to immediate load if IntersectionObserver is not supported
    if (typeof IntersectionObserver === 'undefined') {
      load()
      setHasLoaded(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasLoaded(true)
          load()
          observer.disconnect() // Only load once
        }
      },
      { 
        rootMargin: '200px' // Start loading 200px before component becomes visible
      }
    )

    const currentContainer = containerRef.current
    if (currentContainer) {
      observer.observe(currentContainer)
    } else {
      // If ref isn't ready yet, try again on next tick
      const timeoutId = setTimeout(() => {
        if (containerRef.current) {
          observer.observe(containerRef.current)
        }
      }, 0)
      
      return () => {
        clearTimeout(timeoutId)
        observer.disconnect()
      }
    }

    return () => {
      observer.disconnect()
    }
  }, [productId])

  // Combine all recommendations, prioritizing related products first, then youMayLike, then customersAlsoBought
  // Remove duplicates based on product ID
  const combinedProducts = (() => {
    const seenIds = new Set<number>()
    const combined: ProductRecommendation[] = []

    // Add related products first (highest priority)
    data.related.forEach((product) => {
      if (!seenIds.has(product.id)) {
        seenIds.add(product.id)
        combined.push(product)
      }
    })

    // Add youMayLike products second
    data.youMayLike.forEach((product) => {
      if (!seenIds.has(product.id)) {
        seenIds.add(product.id)
        combined.push(product)
      }
    })

    // Add customersAlsoBought products last
    data.customersAlsoBought.forEach((product) => {
      if (!seenIds.has(product.id)) {
        seenIds.add(product.id)
        combined.push(product)
      }
    })

    return combined
  })()

  const hasAny = combinedProducts.length > 0

  // Return a container div for intersection observer even when loading/empty
  return (
    <div ref={containerRef} className="mt-12">
      {loading ? null : hasAny ? (
        <RecommendationSection title="Explore More" products={combinedProducts} />
      ) : null}
    </div>
  )
}

interface RecommendationSectionProps {
  title: string
  products: ProductRecommendation[]
}

function RecommendationSection({ title, products }: RecommendationSectionProps) {
  if (!products || products.length === 0) return null

  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div className="relative">
        <div className="flex justify-between items-center mb-4 -mt-10">
         <h3 className="text-5xl font-bold px-5 md:px-10 bg-gradient-to-r from-[#ffffff] via-[#d7cfc0] to-[#ffffff] text-transparent bg-clip-text shimmer-text">
           {title}
         </h3>
        <div className="flex gap-2 px-5 md:px-10">
          <button
            onClick={() => scroll('left')}
            className="z-10 bg-white shadow-lg rounded-full p-2 h-12 w-12 flex items-center justify-center hover:shadow-xl transition-shadow border border-gray-200"
            aria-label="Scroll left"
          >
            <ChevronLeft strokeWidth={3} className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="z-10 bg-white shadow-lg rounded-full p-2 h-12 w-12 flex items-center justify-center hover:shadow-xl transition-shadow border border-gray-200"
            aria-label="Scroll right"
          >
            <ChevronRight strokeWidth={3} className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto overflow-y-visible scroll-smooth pb-2 scrollbar-hide"
      >
        {products.map((p, index) => (
          <div 
            key={p.id} 
            className={`w-[240px] sm:w-[260px] lg:w-[280px] flex-shrink-0 ${index === 0 ? 'ml-6' : ''} ${index === products.length - 1 ? 'mr-6' : ''}`}
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductCard({ product }: { product: ProductRecommendation }) {
  const [addingToCart, setAddingToCart] = useState(false)
  const { addItem } = useCart()
  
  // Handle both string and object image formats
  const firstImage = product.images?.[0]
  const imageUrl = typeof firstImage === 'string' 
    ? firstImage 
    : firstImage?.url || '/products/placeholder.png'
  
  // Only use discountedPrice if it's a valid positive number
  // Otherwise fall back to sellingPrice or price
  const price = (product.discountedPrice && product.discountedPrice > 0)
    ? product.discountedPrice
    : (product.sellingPrice ?? product.price)
  
  // Original price should only show if there's a valid discounted price
  const original = (product.discountedPrice && product.discountedPrice > 0)
    ? (product.sellingPrice ?? product.price)
    : undefined

  // Extract subcategory name - handle both object and string formats
  const getSubcategoryName = (): string | null => {
    const subcat = product.subcategory || (product as any)['subcategory'] || (product as any)?.subCategory
    if (!subcat) return null
    
    // If it's an object with a name property (from API with relation)
    if (typeof subcat === 'object' && subcat !== null && 'name' in subcat) {
      return subcat.name
    }
    
    // If it's already a string
    if (typeof subcat === 'string') {
      return subcat
    }
    
    return null
  }

  const subcategoryName = getSubcategoryName()

  const href = subcategoryName && product.category && product.name
    ? `/products/${encodeURIComponent(product.category)}/${encodeURIComponent(subcategoryName)}/${encodeURIComponent(product.name)}`
    : product.category && product.name
      ? `/products/${encodeURIComponent(product.category)}/${encodeURIComponent(product.name)}`
      : product.slug
        ? `/products/${encodeURIComponent(product.slug)}`
        : '#'

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!product.id) {
      toast.error('Product ID is missing')
      return
    }

    setAddingToCart(true)
    try {
      await addItem(product.id.toString(), 1)
      toast.success('Product added to cart!')
    } catch (error: any) {
      console.error('Failed to add to cart:', error)
      toast.error(error.message || 'Failed to add product to cart')
    } finally {
      setAddingToCart(false)
    }
  }

  return (
    <div className="group relative flex flex-col h-full rounded-lg p-3 pt-10  transition overflow-visible">
      <div className="absolute bottom-0 left-0 w-full h-[65%] bg-[beige] rounded-lg z-[0]"/>
      <Link href={href} className="block flex-shrink-0 overflow-visible z-[1] cursor-pointer">
        <div className="aspect-[4/3] relative mb-3 rounded overflow-visible">
          <Image
            src={imageUrl || '/products/placeholder.png'}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105 overflow-visible"
            sizes="(max-width: 768px) 100vw, 25vw"
            unoptimized={imageUrl?.startsWith?.('http')}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/products/placeholder.png'
            }}
          />
        </div>
        
        <div className="space-y-1 text-center my-3 min-h-[60px]">
        <p className="font-bold text-xl py-3 text-[#544829] line-clamp-1 h-[2.5rem]">{product.name}</p>
          {price !== undefined ? (
            <div className="flex items-center justify-center space-x-2 text-sm h-5">
              <span className="text-[var(--shreeji-primary)] font-semibold text-lg">
                {currencyFormatter(Number(price || 0))}
              </span>
              {original !== undefined && (
                <span className="text-gray-500 line-through">{currencyFormatter(Number(original || 0))}</span>
              )}
            </div>
          ) : (
            <div className="h-5"></div>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-1.5 sm:gap-2 w-full mt-auto z-[1]">
        <button
          onClick={handleAddToCart}
          disabled={addingToCart || !product.id}
          className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl bg-[var(--shreeji-primary)] px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 text-xs sm:text-sm md:text-base"
        >
          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="truncate">{addingToCart ? 'Adding...' : 'Add to Cart'}</span>
        </button>
        {product.id && (
          <div 
            className="flex items-center justify-center gap-2 rounded-2xl p-0 mx-0.5 sm:mx-1 text-black transition hover:opacity-90 cursor-pointer flex-shrink-0"
            title="Add to wishlist"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Trigger click on the wishlist button
              const wishlistBtn = e.currentTarget.querySelector('button');
              if (wishlistBtn && !wishlistBtn.disabled) {
                wishlistBtn.click();
              }
            }}
          >
            <WishlistButton productId={product.id} size="sm" className="!h-7 !w-auto sm:!h-8" backgroundColor="var(--shreeji-primary)" />
          </div>
        )}
      </div>
    </div>
  )
}

