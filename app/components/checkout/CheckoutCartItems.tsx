'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/app/contexts/CartContext'
import { currencyFormatter } from './currency-formatter'

export default function CheckoutCartItems() {
  const { cart, removeItem, updateItem } = useCart()

  const handleQuantityChange = async (itemId: string, quantity: number) => {
    if (quantity < 1) return
    await updateItem(itemId, quantity)
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className='mt-4 space-y-4 rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-500'>
        <p>Your cart is empty.</p>
        <Link
          href='/products'
          className='mt-4 inline-flex items-center justify-center rounded-full border border-[var(--shreeji-primary)] px-6 py-3 text-[var(--shreeji-primary)] transition hover:bg-[var(--shreeji-primary)] hover:text-white'
        >
          Browse products
        </Link>
      </div>
    )
  }

  return (
    <div className='mt-4 space-y-4'>
      {cart.items.map((item) => {
        const productImages = item.productSnapshot.images || []
        const mainImage = productImages.find((img) => img.isMain) || productImages[0]
        const imageUrl = mainImage?.url

        // Check if this is a variant (check for variantId or variantAttributes in productSnapshot)
        const productSnapshot = item.productSnapshot as any
        const variantId = (item as any).variantId || productSnapshot?.variantId
        const variantAttributes = productSnapshot?.variantAttributes || productSnapshot?.attributes || {}
        const isVariant = !!variantId || Object.keys(variantAttributes).length > 0
        
        // Format variant attributes as text (similar to inventory page)
        const variantAttributesText = Object.entries(variantAttributes)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ') || null

        return (
          <div
            key={item.id}
            className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
              isVariant 
                ? 'bg-gray-50 border-l-4 border-l-gray-300 pl-8 border-gray-200' 
                : 'border-gray-200'
            }`}
          >
            <div className='flex flex-1 items-center gap-4'>
              {imageUrl && (
                <div className='relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100'>
                  <Image
                    src={imageUrl}
                    alt={mainImage?.alt || item.productSnapshot.name || 'Product image'}
                    fill
                    className='object-cover'
                    unoptimized={imageUrl.startsWith('http') || imageUrl.startsWith('/api/')}
                    sizes='64px'
                  />
                </div>
              )}
              <div className='flex-1'>
                <p className='text-lg font-semibold text-gray-900'>{item.productSnapshot.name}</p>
                {isVariant && (
                  <p className='text-xs text-gray-400 font-medium'>Variant</p>
                )}
                <p className='text-sm text-gray-500'>
                  {variantAttributesText || `SKU: ${item.productSnapshot.sku}`}
                </p>
              </div>
            </div>
          <div className='flex items-center gap-3'>
            <label htmlFor={`qty-${item.id}`} className='text-sm text-gray-500'>
              Qty
            </label>
            <input
              id={`qty-${item.id}`}
              type='number'
              min={1}
              value={item.quantity}
              onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
              className='w-20 rounded-md border border-gray-300 px-2 py-1 text-center focus:border-[var(--shreeji-primary)] focus:outline-none'
            />
          </div>
          <div className='text-right'>
            <p className='text-base font-semibold text-gray-900'>{currencyFormatter(item.subtotal, cart.currency)}</p>
            <button
              type='button'
              className='text-sm text-red-500 hover:text-red-700'
              onClick={() => removeItem(item.id)}
            >
              Remove
            </button>
          </div>
        </div>
        )
      })}
    </div>
  )
}

