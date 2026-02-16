'use client'

import { useEffect, useState } from 'react'
import { Gift, Clock } from 'lucide-react'
import clientApi from '@/app/lib/client/api'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import { getLoginUrl } from '@/app/lib/client/redirectToLogin'
import { useRouter } from 'next/navigation'

interface LoyaltyTransaction {
  id: number
  points: number
  type: 'earned' | 'redeemed' | string
  description?: string | null
  createdAt: string
}

export default function LoyaltyPage() {
  const { isAuthenticated, loading } = useClientAuth()
  const router = useRouter()
  const [points, setPoints] = useState<number>(0)
  const [history, setHistory] = useState<LoyaltyTransaction[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(getLoginUrl())
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  const loadData = async () => {
    try {
      setFetching(true)
      const [pointsRes, historyRes] = await Promise.all([
        clientApi.getLoyaltyPoints(),
        clientApi.getLoyaltyHistory(),
      ])
      setPoints(pointsRes.data?.points || 0)
      setHistory(historyRes.data || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load loyalty data')
    } finally {
      setFetching(false)
    }
  }

  if (loading || fetching) {
    return <div className="p-6 text-gray-500">Loading loyalty data…</div>
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Loyalty Points</h1>
        <p className="mt-1 text-sm text-gray-600">Earn points on every purchase. 1 point = 1 ngwee.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="col-span-1 rounded-lg bg-[var(--shreeji-primary)] p-6 text-white shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Your balance</p>
              <p className="mt-2 text-4xl font-bold">{points}</p>
              <p className="text-sm opacity-80">points (ngwee)</p>
            </div>
            <Gift className="h-12 w-12 opacity-60" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Points history</h2>
          <button
            onClick={loadData}
            className="text-sm text-[var(--shreeji-primary)] hover:underline"
          >
            Refresh
          </button>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No loyalty activity yet.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {history.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      tx.points >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{tx.description || tx.type}</p>
                    <p className="text-sm text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div
                  className={`text-lg font-semibold ${
                    tx.points >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {tx.points >= 0 ? '+' : ''}{tx.points}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
