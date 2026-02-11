import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { ExchangeRateProvider, useExchangeRate } from '@/app/contexts/ExchangeRateContext'

// Mocks for admin API
const mockGetSettingsByCategory = jest.fn()
const mockGetExchangeRateQuota = jest.fn()
const mockIncrementExchangeRateQuota = jest.fn()

jest.mock('@/app/lib/admin/api', () => ({
  __esModule: true,
  default: {
    getSettingsByCategory: (...args: any[]) => mockGetSettingsByCategory(...args),
    getExchangeRateQuota: (...args: any[]) => mockGetExchangeRateQuota(...args),
    incrementExchangeRateQuota: (...args: any[]) => mockIncrementExchangeRateQuota(...args),
  },
}))

// Mocks for external exchange rate API
const mockFetchExchangeRate = jest.fn()
const mockGetFallbackRate = jest.fn(() => 18.89)

jest.mock('@/app/lib/exchange-rate/api', () => ({
  __esModule: true,
  fetchExchangeRate: (...args: any[]) => mockFetchExchangeRate(...args),
  getFallbackRate: (...args: any[]) => mockGetFallbackRate(...args),
}))

function RateConsumer() {
  const { rate, loading } = useExchangeRate()
  return (
    <div>
      <div data-testid="loading">{loading ? 'true' : 'false'}</div>
      <div data-testid="rate">{rate}</div>
    </div>
  )
}

describe('ExchangeRateProvider manual override', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uses manual exchange rate from settings when configured and skips external API', async () => {
    mockGetSettingsByCategory.mockResolvedValue({
      manualExchangeRateZmwPerUsd: 20,
    })
    mockGetExchangeRateQuota.mockResolvedValue({
      data: { count: 0, month: '2025-01' },
    })
    mockIncrementExchangeRateQuota.mockResolvedValue({
      data: { count: 1, month: '2025-01' },
    })

    const { getByTestId } = render(
      <ExchangeRateProvider>
        <RateConsumer />
      </ExchangeRateProvider>
    )

    await waitFor(() => {
      expect(getByTestId('loading').textContent).toBe('false')
    })

    expect(getByTestId('rate').textContent).toBe('20')
    expect(mockFetchExchangeRate).not.toHaveBeenCalled()
  })
})

