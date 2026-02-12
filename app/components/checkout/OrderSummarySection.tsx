'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag, X, Minus, Plus } from 'lucide-react'
import { useCart } from '@/app/contexts/CartContext'
import { currencyFormatter } from './currency-formatter'
import { getProductImages, getMainProductImage, normalizeImageUrl } from '@/app/lib/admin/image-mapping'

// Process image URL to ensure it's properly formatted for Next.js Image component
function processImageUrl(url: string): string {
  if (!url) return url
  url = normalizeImageUrl(url)
  if (url.startsWith('http')) return url
  if (!url.startsWith('/')) url = `/${url}`
  url = url.replace(/^\/\//, '/')
  if (url.includes(' ') && !url.includes('%20')) {
    const urlParts = url.split('/')
    const filename = urlParts[urlParts.length - 1]
    if (filename && filename.includes(' ')) {
      urlParts[urlParts.length - 1] = encodeURIComponent(filename)
      url = urlParts.join('/')
    }
  }
  return url
}

export default function OrderSummarySection() {
  const { cart, updateItem, removeItem } = useCart()

  const handleQuantityChange = async (itemId: string, delta: number) => {
    const item = cart?.items.find((i) => i.id === itemId)
    if (!item) return
    const newQuantity = item.quantity + delta
    if (newQuantity < 1) return
    await updateItem(itemId, newQuantity)
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className='space-y-4 rounded-lg border-4 border-dashed border-white p-6 text-center text-gray-500'>
        <p>Your cart is empty.</p>
        <Link
          href='/products'
          className='mt-4 inline-flex items-center justify-center rounded-full border border-[var(--shreeji-primary)] px-6 py-3 text-[var(--shreeji-primary)] transition hover:bg-[var(--shreeji-primary)] hover:text-white'
        >
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className='space-y-4 rounded-lg border-t-4 border-[var(--shreeji-primary)] bg-white p-6 shadow-sm'>
      <div className='mb-6'>
        <div className='flex items-center gap-3'>
          <ShoppingBag className='h-5 w-5 text-[#544829]' />
          <h2 className='text-xl font-semibold text-gray-900'>Order Summary</h2>
        </div>
        <p className='mt-1 text-sm text-gray-500'>Review your order details before proceeding</p>
      </div>

      {/* Column Headers */}
      <div className='hidden sm:flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3'>
        <div className='w-16 flex-shrink-0'></div>
        <div className='flex-1'>
          <span className='text-sm font-medium text-gray-700'>Product</span>
        </div>
        <div className='text-center min-w-[100px]'>
          <span className='text-sm font-medium text-gray-700'>Unit Price</span>
        </div>
        <div className='text-center min-w-[120px]'>
          <span className='text-sm font-medium text-gray-700'>Quantity</span>
        </div>
        <div className='flex items-center gap-4'>
          <div className='text-right min-w-[100px]'>
            <span className='text-sm font-medium text-gray-700'>Total Price</span>
          </div>
          <div className='w-6'></div>
        </div>
      </div>

      <div className='space-y-4'>
        {cart.items.map((item) => {
          // Check if this is a variant first (needed for pricing logic)
          const productSnapshot = item.productSnapshot as any
          const variantId = (item as any).variantId || productSnapshot?.variantId
          const variantAttributes = productSnapshot?.variantAttributes || productSnapshot?.attributes || {}
          const isVariant = !!variantId || Object.keys(variantAttributes).length > 0
          
          // Use unitPrice from the cart item (which contains variant price if it's a variant)
          const unitPrice = item.unitPrice
          const originalPrice = item.productSnapshot.price
          
          // Discount logic:
          // - For variants: unitPrice is already the correct price to display
          //   Don't show discount based on original product price
          // - For non-variants: Show discount if productSnapshot has discountedPrice
          let displayPrice = unitPrice || originalPrice
          let discountedPrice = displayPrice
          let discount = 0
          let discountPercent = 0
          
          if (isVariant) {
            // For variants, unitPrice is already the correct price to display
            // Don't show discount based on original product price
            displayPrice = unitPrice
            discountedPrice = displayPrice
          } else {
            // For non-variants, check if there's a product discount
            discountedPrice = (item.productSnapshot.discountedPrice && item.productSnapshot.discountedPrice > 0) 
              ? item.productSnapshot.discountedPrice 
              : displayPrice
            discount = originalPrice - discountedPrice
            discountPercent = discount > 0 ? Math.round((discount / originalPrice) * 100) : 0
            // Update displayPrice to show discounted price if available
            displayPrice = discountedPrice
          }

          // Get the main image or first available image
          // Try image mapping utility first for accurate filenames, then fallback to backend images
          let imageUrl = null
          let mainImage: any = null
          
          // First, try to get the correct image from image mapping utility (has correct filenames)
          const mappedImageUrl = getMainProductImage(item.productSnapshot.name)
          if (mappedImageUrl && mappedImageUrl !== '/public/products/placeholder.png') {
            imageUrl = mappedImageUrl
          } else {
            // Fallback to backend images if mapping doesn't have it
            const productImages = item.productSnapshot?.images || (item as any).images || []
            
            // Debug: Log image data to help diagnose issues
            if (productImages.length === 0) {
              console.log('No images found for item:', {
                itemId: item.id,
                productName: item.productSnapshot.name,
                productSnapshot: item.productSnapshot,
                itemImages: (item as any).images,
              })
            }
            
            mainImage = productImages.find((img: any) => img?.isMain) || productImages[0]
            
            // Handle different image formats - could be object with url property or string
            if (mainImage) {
              if (typeof mainImage === 'string') {
                imageUrl = mainImage
              } else if (mainImage?.url) {
                imageUrl = mainImage.url
              }
            }
          }
          
          // Process and format the image URL for Next.js Image component
          if (imageUrl) {
            imageUrl = processImageUrl(imageUrl)
          }
          
          // Format variant attributes as text (similar to inventory page)
          const variantAttributesText = Object.entries(variantAttributes)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ') || null

          // Extract product variant/subtitle (using variant attributes if available, otherwise SKU)
          const productSubtitle = variantAttributesText 
            ? variantAttributesText 
            : (item.productSnapshot.sku || 'Shreeji')

          return (
            <div 
              key={item.id} 
              className={`flex items-center gap-4 px-4 py-5 ${
                isVariant 
                  ? 'bg-gray-50 pl-12 border-l-4 border-gray-300' 
                  : 'bg-white'
              }`}
            >
              {/* Product Image - Small thumbnail */}
              <div className='relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100'>
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={typeof mainImage === 'object' ? mainImage?.alt : item.productSnapshot.name || 'Product image'}
                    fill
                    className='object-cover'
                    unoptimized={imageUrl.startsWith('http') || imageUrl.startsWith('/products/')}
                    sizes='64px'
                    onError={(e) => {
                      console.error('Image failed to load:', imageUrl)
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center bg-gray-200 text-xs text-gray-400'>
                    No Image
                  </div>
                )}
              </div>

              {/* Product Information - Left Side */}
              <div className='flex-1 min-w-0'>
                <h3 className='font-bold text-gray-900 text-base leading-tight'>{item.productSnapshot.name}</h3>
                {isVariant && (
                  <p className='text-xs text-gray-400 mt-0.5 font-medium'>Variant</p>
                )}
                <p className='text-sm text-gray-500 mt-0.5'>{productSubtitle}</p>
                  </div>
                  
              {/* Unit Price - Middle */}
              <div className='text-center min-w-[100px]'>
                <p className='text-sm font-semibold text-gray-900'>
                  {currencyFormatter(displayPrice, cart.currency)}
                </p>
                {/* Only show strikethrough price for non-variants with discount */}
                {!isVariant && discount > 0 && discountedPrice < originalPrice && (
                  <p className='text-xs text-gray-500 line-through mt-0.5'>
                    {currencyFormatter(originalPrice, cart.currency)}
                  </p>
                )}
              </div>

              {/* Quantity Selector - Middle */}
              <div className='flex items-center justify-center gap-1 min-w-[120px]'>
                <button
                  type='button'
                  onClick={() => handleQuantityChange(item.id, -1)}
                  className='flex h-8 w-8 items-center justify-center text-gray-600 hover:text-gray-900 transition-colors'
                  aria-label='Decrease quantity'
                >
                  <Minus className='h-4 w-4' strokeWidth={2} />
                </button>
                <span className='min-w-[2rem] text-center text-sm font-medium text-gray-900'>
                  {item.quantity}
                </span>
                <button
                  type='button'
                  onClick={() => handleQuantityChange(item.id, 1)}
                  className='flex h-8 w-8 items-center justify-center text-gray-600 hover:text-gray-900 transition-colors'
                  aria-label='Increase quantity'
                >
                  <Plus className='h-4 w-4' strokeWidth={2} />
                </button>
              </div>

              {/* Pricing & Actions - Right Side */}
              <div className='flex items-center gap-4'>
                {/* Price - Bold */}
                <div className='text-right'>
                  <p className='font-bold text-gray-900 text-base'>
                    {currencyFormatter(displayPrice * item.quantity, cart.currency)}
                  </p>
                </div>

                {/* Remove Button - Simple X Icon */}
                <button
                  type='button'
                  onClick={() => removeItem(item.id)}
                  className='flex h-6 w-6 items-center justify-center text-gray-400 hover:text-gray-600 transition-colors'
                  aria-label='Remove item'
                >
                  <X className='h-4 w-4' strokeWidth={2} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add More Products Button */}
      <div className='mt-6 pt-6 border-t border-gray-200 flex justify-end'>
        <Link
          href='/products'
          className='text-sm flex w-fit items-center justify-center gap-2 rounded-lg border-2 border-[var(--shreeji-primary)] bg-white px-2 py-1 text-[var(--shreeji-primary)] transition hover:bg-[var(--shreeji-primary)] hover:text-white font-medium'
        >
          <Plus className='h-5 w-5' />
          Add More Products
        </Link>
      </div>
    </div>
  )
}

