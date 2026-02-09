'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/app/contexts/CartContext'

export default function CartButton() {
  const { cart, loading, updating } = useCart()
  const count = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  const disabled = loading || updating

  return (
    <Link
      href="/checkout"
      className={`relative flex items-center justify-center rounded-full p-2 transition-colors ${
        disabled ? 'pointer-events-none opacity-70' : 'hover:bg-[var(--primary)] hover:text-white'
      }`}
      aria-label="Go to cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-xs text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
