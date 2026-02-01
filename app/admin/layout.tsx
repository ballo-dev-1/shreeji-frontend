import type { Metadata } from 'next'
import { AuthProvider } from '@/app/contexts/AuthContext'

export const metadata: Metadata = {
  title: 'Shreeji Admin Dashboard',
  description: 'Content Management System for Shreeji Products',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

