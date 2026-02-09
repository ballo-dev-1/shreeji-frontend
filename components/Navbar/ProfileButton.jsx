'use client'

import Link from 'next/link'
import { User } from 'lucide-react'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'

export default function ProfileButton() {
  const { isAuthenticated, loading } = useClientAuth()

  // Show loading state or nothing while checking auth
  if (loading) {
    return null
  }

  // Link to dashboard if authenticated, login if not
  const href = isAuthenticated ? '/portal/dashboard' : '/portal/login'

  return (
    <Link
      href={href}
      className="relative flex items-center justify-center rounded-full p-2 transition-colors hover:bg-[var(--primary)] hover:text-white"
      aria-label={isAuthenticated ? 'Go to profile' : 'Sign in'}
    >
      <User className="h-5 w-5" />
    </Link>
  )
}

