'use client'

import { useExchangeRate } from '@/app/contexts/ExchangeRateContext'

const QUOTA_LIMIT = 1500

export default function ExchangeRateQuotaBanner() {
  const { quotaUsage } = useExchangeRate()
  const { count, month } = quotaUsage
  const percentage = (count / QUOTA_LIMIT) * 100
  const isWarning = percentage >= 80
  const isCritical = percentage >= 95

  const getColorClasses = () => {
    if (isCritical) {
      return 'bg-red-600 text-white'
    }
    if (isWarning) {
      return 'bg-yellow-500 text-white'
    }
    return 'bg-blue-600 text-white'
  }

  const getProgressBarColor = () => {
    if (isCritical) {
      return 'bg-red-800'
    }
    if (isWarning) {
      return 'bg-yellow-600'
    }
    return 'bg-blue-500'
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 ${getColorClasses()} shadow-lg`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-shrink-0">
              <span className="text-sm font-medium">
                Exchange Rate API Quota
              </span>
            </div>
            <div className="flex-1 max-w-md">
              <div className="flex items-center justify-between text-xs mb-1">
                <span>{count} / {QUOTA_LIMIT} requests used</span>
                <span>{percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-black bg-opacity-20 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
            <div className="flex-shrink-0 text-xs opacity-90">
              Month: {month || '—'}
            </div>
          </div>
          {isWarning && (
            <div className="ml-4 text-xs font-semibold">
              {isCritical ? '⚠️ Critical: Approaching limit' : '⚠️ Warning: High usage'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
