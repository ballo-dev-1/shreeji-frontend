'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import PortalNav from '@/app/components/portal/PortalNav'
import PortalHeader from '@/app/components/portal/PortalHeader'
import ProtectedRoute from '@/app/components/portal/ProtectedRoute'
import { FullPagePortalLoadingSkeleton } from '@/app/components/ui/Skeletons'

export default function PortalLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, loading } = useClientAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light')

  // Apply theme to HTML element
  const applyTheme = (themeValue: 'light' | 'dark' | 'auto') => {
    if (typeof window === 'undefined') return
    
    const htmlElement = document.documentElement
    
    if (themeValue === 'dark') {
      htmlElement.classList.add('dark')
    } else if (themeValue === 'light') {
      htmlElement.classList.remove('dark')
    } else if (themeValue === 'auto') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        htmlElement.classList.add('dark')
      } else {
        htmlElement.classList.remove('dark')
      }
    }
  }

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = (localStorage.getItem('portal-theme') as 'light' | 'dark' | 'auto') || 'light'
    setTheme(savedTheme)
    applyTheme(savedTheme)
  }, [])

  // Listen for theme changes from settings
  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      const newTheme = event.detail as 'light' | 'dark' | 'auto'
      setTheme(newTheme)
      applyTheme(newTheme)
      localStorage.setItem('portal-theme', newTheme)
    }

    window.addEventListener('themeChanged' as any, handleThemeChange as EventListener)
    return () => {
      window.removeEventListener('themeChanged' as any, handleThemeChange as EventListener)
    }
  }, [])

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        const htmlElement = document.documentElement
        if (e.matches) {
          htmlElement.classList.add('dark')
        } else {
          htmlElement.classList.remove('dark')
        }
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  // Check for redirect after authentication
  // This handles redirects when user authenticates via modal
  // Runs whenever user is authenticated and on a portal page
  useEffect(() => {
    if (!loading && isAuthenticated && typeof window !== 'undefined') {
      const shouldRedirect = localStorage.getItem('shouldRedirectAfterAuth') === 'true'
      const returnUrl = localStorage.getItem('authReturnUrl')
      const currentPath = window.location.pathname
      
      console.log('[PortalLayoutContent] Redirect check:', { shouldRedirect, returnUrl, currentPath, isAuthenticated, loading })
      
      // Only redirect if:
      // 1. Flag is set (user authenticated via modal)
      // 2. ReturnUrl exists
      // 3. ReturnUrl is NOT a portal page (to prevent redirect loops)
      // 4. We're currently on a portal page (user was redirected here or navigated here)
      if (shouldRedirect && returnUrl && currentPath.startsWith('/portal/')) {
        const isPortalPage = returnUrl.startsWith('/portal/')
        const isAuthPage = returnUrl.startsWith('/portal/login') || 
                          returnUrl.startsWith('/portal/register') ||
                          returnUrl.startsWith('/portal/forgot-password') ||
                          returnUrl.startsWith('/portal/reset-password')
        
        console.log('[PortalLayoutContent] Evaluating redirect:', { isPortalPage, isAuthPage, returnUrl, currentPath })
        
        // Only redirect if it's not a portal page
        if (!isPortalPage) {
          console.log('[PortalLayoutContent] Redirecting to:', returnUrl)
          // Clear the flags before redirecting
          localStorage.removeItem('shouldRedirectAfterAuth')
          localStorage.removeItem('authReturnUrl')
          
          // Redirect to the stored URL
          router.replace(returnUrl)
        } else if (!isAuthPage) {
          // If it's a portal page (but not auth), clear flags but don't redirect
          // User intentionally navigated to portal, so stay there
          console.log('[PortalLayoutContent] Clearing flags - portal page')
          localStorage.removeItem('shouldRedirectAfterAuth')
          localStorage.removeItem('authReturnUrl')
        }
        // If it's an auth page, keep the flags in case user needs to complete auth flow
      }
    }
  }, [loading, isAuthenticated, router, pathname])

  // Show full-width layout for login and register pages when not authenticated
  const isAuthPage = pathname === '/portal/login' || 
                     pathname === '/portal/register' ||
                     pathname === '/portal/forgot-password' ||
                     pathname?.startsWith('/portal/reset-password')
  const showSidebar = isAuthenticated && !isAuthPage

  // Get page title from pathname
  const getPageTitle = () => {
    if (pathname === '/portal/dashboard') return 'Dashboard'
    if (pathname === '/portal/orders') return 'Order Management'
    if (pathname === '/portal/profile') return 'Profile'
    if (pathname === '/portal/settings') return 'Settings'
    if (pathname === '/portal/addresses') return 'Address Management'
    return 'Dashboard'
  }

  if (loading) {
    return <FullPagePortalLoadingSkeleton />
  }

  if (isAuthPage && !isAuthenticated) {
    // Full-width layout for login/register pages - no sidebar or header
    return <div className="min-h-screen bg-[#f5f1e8]">{children}</div>
  }

  // For protected routes, wrap with ProtectedRoute
  if (!isAuthPage) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-[whitesmoke] dark:bg-[#131313]">
          {/* Sidebar */}
          {showSidebar && (
            <>
              <PortalNav sidebarOpen={sidebarOpen} />
              {/* Sidebar overlay for mobile */}
              {sidebarOpen && (
                <div 
                  className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}
            </>
          )}

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden rounded-2xl m-2 ml-0">
            {/* Page content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white dark:bg-[whitesmoke]">
              {/* Header */}
              {showSidebar && (
                <PortalHeader 
                  currentPage={getPageTitle()}
                  pageTitle={getPageTitle()}
                  onMenuClick={() => setSidebarOpen(true)}
                />
              )}
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Fallback for auth pages
  return <div className="min-h-screen bg-[#f5f1e8]">{children}</div>
}

