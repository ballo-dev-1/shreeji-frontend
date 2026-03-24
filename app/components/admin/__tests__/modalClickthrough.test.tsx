'use client'

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditProductModal from '../EditProductModal'
import AdminUserManagement from '../AdminUserManagement'
import api from '@/app/lib/admin/api'

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/app/contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({
    user: { id: 1, role: 'super_admin' },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}))

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/admin/users',
}))

jest.mock('lucide-react', () => {
  const React = require('react')
  return new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === '__esModule') return true
        return (props: any) => React.createElement('svg', { 'data-testid': `lucide-${String(prop)}`, ...props })
      },
    },
  )
})

jest.mock('@/app/contexts/ExchangeRateContext', () => ({
  __esModule: true,
  useExchangeRate: () => ({
    rate: 1,
    refreshRate: jest.fn(),
  }),
}))

jest.mock('../ProductVariantsManager', () => ({
  __esModule: true,
  default: () => <div data-testid="product-variants-manager" />,
}))

jest.mock('../ProductSEOEditor', () => ({
  __esModule: true,
  default: () => <div data-testid="product-seo-editor" />,
}))

jest.mock('../Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/products/product details', () => ({
  __esModule: true,
  default: () => <div data-testid="product-details" />,
}))

jest.mock('@/app/lib/admin/api', () => ({
  __esModule: true,
  default: {
    getBrands: jest.fn(),
    getProducts: jest.fn(),
    getSubcategories: jest.fn(),
    createSubcategory: jest.fn(),
    updateSubcategory: jest.fn(),
    getAdminUsers: jest.fn(),
    createAdminUser: jest.fn(),
    updateAdminUser: jest.fn(),
    deleteAdminUser: jest.fn(),
  },
}))

const mockedApi = api as jest.Mocked<typeof api>

describe('Modal clickthrough regression', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedApi.getBrands.mockResolvedValue({ data: [] } as any)
    mockedApi.getProducts.mockResolvedValue({
      data: [{ id: 1, category: 'Electronics', specs: {}, attributes: {} }],
    } as any)
    mockedApi.getSubcategories.mockResolvedValue({ data: [] } as any)
    mockedApi.createSubcategory.mockResolvedValue({ data: { id: 99, name: 'Laptops' } } as any)
    mockedApi.getAdminUsers.mockResolvedValue({ data: [] } as any)
  })

  it('keeps Add New Category modal open when clicking the category name input', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    const { container } = render(<EditProductModal isOpen={true} onClose={onClose} />)

    await screen.findByText('General Information')
    const categoryField = await waitFor(() => container.querySelector('#field-product-category'))
    expect(categoryField).toBeTruthy()

    const categoryButton = within(categoryField as HTMLElement).getByRole('button')
    await user.click(categoryButton)
    await user.click(await screen.findByText('+ Add new category'))

    expect(await screen.findByText('Add New Category')).toBeInTheDocument()

    await user.click(screen.getByPlaceholderText('Enter category name'))
    expect(screen.getByText('Add New Category')).toBeInTheDocument()

    const nestedBackdrop = container.querySelector('.z-\\[60\\] .bg-gray-500.bg-opacity-75')
    expect(nestedBackdrop).toBeTruthy()
    fireEvent.click(nestedBackdrop as HTMLElement)

    await waitFor(() => {
      expect(screen.queryByText('Add New Category')).not.toBeInTheDocument()
    })
  })

  it('keeps Admin User modal open on input click but closes on backdrop click', async () => {
    const user = userEvent.setup()
    const { container } = render(<AdminUserManagement />)

    await user.click(await screen.findByRole('button', { name: /add admin user/i }))
    expect(await screen.findByText('Create Admin User')).toBeInTheDocument()

    const modalTitle = screen.getByText('Create Admin User')
    const modalPanel = modalTitle.closest('.relative.z-10')
    expect(modalPanel).toBeTruthy()
    const emailInput = (modalPanel as HTMLElement).querySelector('input[type="email"]') as HTMLElement
    expect(emailInput).toBeTruthy()
    await user.click(emailInput)
    expect(screen.getByText('Create Admin User')).toBeInTheDocument()

    const backdrop = await waitFor(() =>
      container.querySelector('.fixed.inset-0.bg-gray-500.bg-opacity-75.transition-opacity'),
    )
    expect(backdrop).toBeTruthy()
    fireEvent.click(backdrop as HTMLElement)

    await waitFor(() => {
      expect(screen.queryByText('Create Admin User')).not.toBeInTheDocument()
    })
  })

  it('allows adding subcategory when selected category is a string value', async () => {
    const user = userEvent.setup()
    render(
      <EditProductModal
        isOpen={true}
        onClose={jest.fn()}
        product={{
          id: 1,
          name: 'Test Product',
          slug: 'test-product',
          category: 'Electronics',
          subcategory: '',
          brand: 'Test Brand',
          price: '100',
          images: [],
          isActive: true,
        } as any}
      />,
    )

    await screen.findByText('General Information')

    await user.click(screen.getByRole('button', { name: /select subcategory/i }))
    await user.click(await screen.findByText('+ Add new subcategory'))

    expect(await screen.findByText('Add New Subcategory')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Enter subcategory name'), 'Laptops')
    await user.click(screen.getByRole('button', { name: /add subcategory/i }))

    await waitFor(() => {
      expect(screen.queryByText('Invalid category selected')).not.toBeInTheDocument()
    })
    expect(mockedApi.createSubcategory).toHaveBeenCalled()
  })
})
