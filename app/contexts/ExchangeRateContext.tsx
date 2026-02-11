'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fetchExchangeRate, getFallbackRate } from '@/app/lib/exchange-rate/api'
import api from '@/app/lib/admin/api'

interface ExchangeRateContextType {
  rate: number
  loading: boolean
  error: string | null
  lastUpdated: number | null
  quotaUsage: { count: number; month: string }
  refreshRate: () => Promise<void>
}

const ExchangeRateContext = createContext<ExchangeRateContextType | undefined>(undefined)

const CACHE_KEY = 'exchange_rate_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

interface CacheData {
  rate: number
  timestamp: number
  expiresAt: number
}

interface QuotaData {
  count: number
  month: string
}

async function getManualRateFromSettings(): Promise<number | null> {
  try {
    const response = await api.getSettingsByCategory('general')
    const settings = (response as any)?.data || response
    const rawValue = settings?.manualExchangeRateZmwPerUsd

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/contexts/ExchangeRateContext.tsx:getManualRateFromSettings',
        message: 'Manual exchange rate setting loaded',
        data: {
          hasSettings: !!settings,
          rawValue,
        },
        runId: 'run1',
        hypothesisId: 'H1',
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return null
    }

    const parsed = parseFloat(String(rawValue))
    if (Number.isNaN(parsed) || parsed <= 0) {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/contexts/ExchangeRateContext.tsx:getManualRateFromSettings',
          message: 'Manual exchange rate invalid, falling back',
          data: {
            rawValue,
            parsed,
          },
          runId: 'run1',
          hypothesisId: 'H2',
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
      return null
    }

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/contexts/ExchangeRateContext.tsx:getManualRateFromSettings',
        message: 'Manual exchange rate parsed successfully',
        data: {
          parsed,
        },
        runId: 'run1',
        hypothesisId: 'H1',
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

    return parsed
  } catch (error) {
    console.error('Failed to load manual exchange rate setting:', error)
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/contexts/ExchangeRateContext.tsx:getManualRateFromSettings:catch',
        message: 'Error loading manual exchange rate setting',
        data: {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
        runId: 'run1',
        hypothesisId: 'H3',
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    return null
  }
}

function shouldUseAdminQuota(): boolean {
  if (typeof window === 'undefined') return false

  const path = window.location.pathname
  const hasAdminToken = !!localStorage.getItem('admin_jwt')

  // Only use admin quota on authenticated admin pages, never on the login screen
  if (!path.startsWith('/admin')) return false
  if (path === '/admin/login') return false

  return hasAdminToken
}

// Quota functions now use backend API
async function getQuotaFromBackend(): Promise<QuotaData> {
  if (!shouldUseAdminQuota()) {
    const now = new Date()
    return {
      count: 0,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    }
  }

  try {
    const response = await api.getExchangeRateQuota()
    return response.data
  } catch (error) {
    console.error('Failed to fetch quota from backend:', error)
    // Fallback to default
    const now = new Date()
    return { count: 0, month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` }
  }
}

async function incrementQuotaOnBackend(): Promise<QuotaData> {
  if (!shouldUseAdminQuota()) {
    // When quota tracking is not active (e.g., on login or non-admin routes),
    // just return the current or default quota without hitting the admin API.
    return await getQuotaFromBackend()
  }

  try {
    const response = await api.incrementExchangeRateQuota()
    return response.data
  } catch (error) {
    console.error('Failed to increment quota on backend:', error)
    // Return current quota if increment fails
    return await getQuotaFromBackend()
  }
}

function getCachedRate(): CacheData | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const cacheData: CacheData = JSON.parse(cached)
      const now = Date.now()
      
      // Check if cache is still valid
      if (now < cacheData.expiresAt) {
        return cacheData
      }
    }
  } catch (error) {
    console.error('Failed to read cache from storage:', error)
  }

  return null
}

function setCachedRate(rate: number): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const now = Date.now()
    const cacheData: CacheData = {
      rate,
      timestamp: now,
      expiresAt: now + CACHE_DURATION,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch (error) {
    console.error('Failed to save cache to storage:', error)
  }
}

export function ExchangeRateProvider({ children }: { children: ReactNode }) {
  const [rate, setRate] = useState<number>(getFallbackRate())
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [quotaUsage, setQuotaUsage] = useState<QuotaData>({ count: 0, month: '' })

  const refreshRate = async () => {
    setLoading(true)
    setError(null)

    // 1) Prefer manual exchange rate from admin settings when configured
    const manualRate = await getManualRateFromSettings()
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/contexts/ExchangeRateContext.tsx:refreshRate',
        message: 'refreshRate evaluated manualRate',
        data: {
          manualRate,
        },
        runId: 'run1',
        hypothesisId: 'H1',
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

    if (manualRate && manualRate > 0) {
      setRate(manualRate)
      setLastUpdated(Date.now())

      // Keep quota display in sync without incrementing (no external API call)
      try {
        const quota = await getQuotaFromBackend()
        setQuotaUsage(quota)
      } catch (error) {
        console.error('Failed to fetch quota:', error)
      }

      setLoading(false)
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/contexts/ExchangeRateContext.tsx:refreshRate',
          message: 'Using manual exchange rate, skipping external API',
          data: {
            rate: manualRate,
          },
          runId: 'run1',
          hypothesisId: 'H1',
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
      return
    }

    // 2) Fallback to cached rate when available (no external API call)
    // Check cache first
    const cached = getCachedRate()
    if (cached) {
      setRate(cached.rate)
      setLastUpdated(cached.timestamp)
      setLoading(false)
      setError(null)

      // Still fetch quota from backend to display current usage
      try {
        const quota = await getQuotaFromBackend()
        setQuotaUsage(quota)
      } catch (error) {
        console.error('Failed to fetch quota:', error)
      }
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/contexts/ExchangeRateContext.tsx:refreshRate',
          message: 'Using cached exchange rate, skipping external API',
          data: {
            cachedRate: cached.rate,
          },
          runId: 'run1',
          hypothesisId: 'H2',
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
      return
    }

    // 3) Fetch from external API when no manual or cached rate exists
    const result = await fetchExchangeRate()
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e84e78e7-6a89-4f9d-aa7c-e6b9fffa749d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/contexts/ExchangeRateContext.tsx:refreshRate',
        message: 'Fetched exchange rate from external API',
        data: {
          success: result.success,
          rate: result.rate,
          error: result.error || null,
        },
        runId: 'run1',
        hypothesisId: 'H3',
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    
    // Increment quota only if API call was made (not using cache)
    try {
      const quota = await incrementQuotaOnBackend()
      setQuotaUsage(quota)
    } catch (error) {
      console.error('Failed to increment quota:', error)
      // Try to get current quota as fallback
      try {
        const quota = await getQuotaFromBackend()
        setQuotaUsage(quota)
      } catch (e) {
        console.error('Failed to fetch quota as fallback:', e)
      }
    }

    if (result.success) {
      setRate(result.rate)
      setLastUpdated(result.timestamp)
      setCachedRate(result.rate)
      setError(null)
    } else {
      // Use cached rate if available, otherwise fallback
      const cachedFallback = getCachedRate()
      if (cachedFallback) {
        setRate(cachedFallback.rate)
        setLastUpdated(cachedFallback.timestamp)
      } else {
        setRate(getFallbackRate())
        setLastUpdated(Date.now())
      }
      setError(result.error || 'Failed to fetch exchange rate')
    }

    setLoading(false)
  }

  useEffect(() => {
    // Initialize quota tracking from backend
    const loadQuota = async () => {
      try {
        const quota = await getQuotaFromBackend()
        setQuotaUsage(quota)
      } catch (error) {
        console.error('Failed to load quota:', error)
      }
    }
    
    loadQuota()
    
    // Load rate on mount
    refreshRate()
  }, [])

  // Update quota display when it changes (e.g., month changes)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const currentQuota = await getQuotaFromBackend()
        setQuotaUsage(currentQuota)
      } catch (error) {
        console.error('Failed to refresh quota:', error)
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  return (
    <ExchangeRateContext.Provider
      value={{
        rate,
        loading,
        error,
        lastUpdated,
        quotaUsage,
        refreshRate,
      }}
    >
      {children}
    </ExchangeRateContext.Provider>
  )
}

export function useExchangeRate(): ExchangeRateContextType {
  const context = useContext(ExchangeRateContext)
  if (context === undefined) {
    throw new Error('useExchangeRate must be used within an ExchangeRateProvider')
  }
  return context
}
