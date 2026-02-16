'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, LogOut, LogIn } from 'lucide-react'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import { getLoginUrl } from '@/app/lib/client/redirectToLogin'

function displayName(user) {
  const parts = [user?.firstName, user?.lastName].filter(Boolean)
  return parts.length ? parts.join(' ') : user?.email || ''
}

const HOVER_DELAY_MS = 150

export default function ProfileButton() {
  const router = useRouter()
  const { user, isAuthenticated, loading, logout } = useClientAuth()
  const [open, setOpen] = useState(true)
  const leaveTimeoutRef = useRef(null)

  const handleEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }
    setOpen(true)
  }

  const handleLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => setOpen(false), HOVER_DELAY_MS)
  }

  if (loading) {
    return null
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        className="relative flex items-center justify-center rounded-full p-2 transition-colors hover:bg-[var(--primary)] hover:text-white"
        aria-label={isAuthenticated ? 'Profile menu' : 'Sign in'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <User className="h-5 w-5" />
      </button>
      {open && (
        <div
          className="absolute -right-20 z-50 mt-2 w-fit origin-top-right rounded-lg text-white bg-[var(--shreeji-primary)] py-1 shadow-lg focus:outline-none"
          role="menu"
          aria-orientation="vertical"
        >
          {isAuthenticated && user ? (
            <>
              <div className="px-4">
                <p className="font-semibold truncate">
                  {displayName(user)}
                </p>
                <p className="mt-0.5 text-sm truncate">
                  {user.email}
                </p>
              </div>
              <div className="mt-3 border-t border-gray" />
            </>
          ) : null}
          <div className="px-2">
            {isAuthenticated ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  logout()
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-white hover:bg-white/20"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Sign out</span>
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  router.push(getLoginUrl())
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-white hover:bg-white/20"
              >
                <LogIn className="h-4 w-4 shrink-0" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

