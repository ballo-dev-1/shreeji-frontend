import type { Metadata } from 'next'
import { ClientAuthProvider } from '@/app/contexts/ClientAuthContext'
import { CartProvider } from '@/app/contexts/CartContext'
import PortalLayoutContent from '@/app/components/portal/PortalLayoutContent'

export const metadata: Metadata = {
  title: 'Client Portal - Shreeji',
  description: 'Your personal client portal',
  robots: {
    index: false,
    follow: false,
  },
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClientAuthProvider>
      <CartProvider>
        <PortalLayoutContent>{children}</PortalLayoutContent>
      </CartProvider>
    </ClientAuthProvider>
  )
}

