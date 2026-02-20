import { render, screen, waitFor, act } from '@testing-library/react'

const mockVerifyDpoPayment = jest.fn()

jest.mock('@/app/lib/ecommerce/api', () => ({
  verifyDpoPayment: (...args: any[]) => mockVerifyDpoPayment(...args),
}))

const mockPush = jest.fn()
let mockSearchParamsMap: Record<string, string> = {}

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsMap[key] || null,
  }),
}))

jest.mock('@/app/contexts/ClientAuthContext', () => ({
  useClientAuth: () => ({
    isAuthenticated: false,
    user: null,
    loading: false,
  }),
}))

jest.mock('lucide-react', () => {
  const React = require('react')
  return new Proxy(
    {},
    {
      get: () => (props: any) => React.createElement('svg', props, null),
    },
  )
})

import CheckoutSuccessPage from '@/app/checkout/success/page'

describe('Checkout Success Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParamsMap = {}
  })

  it('should show loading state initially when TransactionToken is present', async () => {
    mockSearchParamsMap = { TransactionToken: 'test-token-123' }
    mockVerifyDpoPayment.mockReturnValue(new Promise(() => {}))

    await act(async () => {
      render(<CheckoutSuccessPage />)
    })

    expect(screen.getByText(/verifying/i)).toBeInTheDocument()
  })

  it('should call verifyDpoPayment with TransactionToken from URL', async () => {
    mockSearchParamsMap = { TransactionToken: 'my-token-abc' }
    mockVerifyDpoPayment.mockResolvedValue({
      success: true,
      orderId: 42,
      orderNumber: 'ORD-001',
      paymentStatus: 'approved',
      message: 'Payment verified successfully',
    })

    await act(async () => {
      render(<CheckoutSuccessPage />)
    })

    await waitFor(() => {
      expect(mockVerifyDpoPayment).toHaveBeenCalledWith('my-token-abc')
    })
  })

  it('should show success state with order number on approved payment', async () => {
    mockSearchParamsMap = { TransactionToken: 'token-paid' }
    mockVerifyDpoPayment.mockResolvedValue({
      success: true,
      orderId: 42,
      orderNumber: 'ORD-001',
      paymentStatus: 'approved',
      message: 'Payment verified successfully',
    })

    await act(async () => {
      render(<CheckoutSuccessPage />)
    })

    await waitFor(() => {
      expect(screen.getByText(/ORD-001/)).toBeInTheDocument()
    })

    expect(screen.getByText(/payment successful/i)).toBeInTheDocument()
  })

  it('should show error state on declined payment', async () => {
    mockSearchParamsMap = { TransactionToken: 'token-declined' }
    mockVerifyDpoPayment.mockResolvedValue({
      success: false,
      paymentStatus: 'declined',
      message: 'Payment declined',
    })

    await act(async () => {
      render(<CheckoutSuccessPage />)
    })

    await waitFor(() => {
      expect(
        screen.getByText(/not successful/i),
      ).toBeInTheDocument()
    })
  })

  it('should show error state when no TransactionToken in URL', async () => {
    mockSearchParamsMap = {} // No token

    await act(async () => {
      render(<CheckoutSuccessPage />)
    })

    await waitFor(() => {
      expect(
        screen.getByText(/no transaction token/i),
      ).toBeInTheDocument()
    })
  })

  it('should show error when verifyDpoPayment throws', async () => {
    mockSearchParamsMap = { TransactionToken: 'token-error' }
    mockVerifyDpoPayment.mockRejectedValue(new Error('Network Error'))

    await act(async () => {
      render(<CheckoutSuccessPage />)
    })

    await waitFor(() => {
      expect(
        screen.getByText(/network error/i),
      ).toBeInTheDocument()
    })
  })
})
