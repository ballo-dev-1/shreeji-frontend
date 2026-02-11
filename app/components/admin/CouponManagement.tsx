'use client'

import { useState, useEffect } from 'react'
import Layout from './Layout'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon,
  TrashIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import api from '@/app/lib/admin/api'
import toast from 'react-hot-toast'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'
import { mapFormToCouponPayload, type CouponFormData } from './couponMapper'
import { TableSkeleton } from '@/app/components/ui/Skeletons'

interface Coupon {
  id: number
  code: string
  name: string
  description?: string
  type: 'percentage' | 'fixed_amount'
  value: number
  minimumOrderAmount?: number
  maximumDiscountAmount?: number
  usageLimit?: number
  usageCount?: number
  validUntil?: string
  isActive: boolean
  applicableProducts?: number[]
  applicableCategories?: string[]
}

export default function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'inactive'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    fetchCoupons()
  }, [])

  useEffect(() => {
    filterCoupons()
  }, [coupons, searchTerm, statusFilter])

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.getCoupons({ 
        pagination: { page: 1, pageSize: 100 }
      })
      
      const couponsArray = response.data || []
      setCoupons(couponsArray)
      setFilteredCoupons(couponsArray)
    } catch (error: any) {
      console.error('Error fetching coupons:', error)
      setError(error.message || 'Failed to load coupons')
      toast.error('Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }

  const filterCoupons = () => {
    let filtered = [...coupons]

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(coupon =>
        coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coupon.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    const now = new Date()
    if (statusFilter === 'active') {
      filtered = filtered.filter(coupon => 
        coupon.isActive && 
        (!coupon.validUntil || new Date(coupon.validUntil) > now) &&
        (!coupon.usageLimit || (coupon.usageCount || 0) < coupon.usageLimit)
      )
    } else if (statusFilter === 'expired') {
      filtered = filtered.filter(coupon => 
        coupon.validUntil && new Date(coupon.validUntil) <= now
      )
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(coupon => !coupon.isActive)
    }

    setFilteredCoupons(filtered)
  }

  const handleDelete = async (couponId: number) => {
    if (!confirm('Are you sure you want to delete this coupon?')) {
      return
    }

    try {
      await api.deleteCoupon(couponId)
      toast.success('Coupon deleted successfully')
      fetchCoupons()
    } catch (error: any) {
      console.error('Error deleting coupon:', error)
      toast.error(error.message || 'Failed to delete coupon')
    }
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setIsEditMode(true)
    setShowCouponModal(true)
  }

  const handleAdd = () => {
    setEditingCoupon(null)
    setIsEditMode(false)
    setShowCouponModal(true)
  }

  const handleSaveSuccess = () => {
    setShowCouponModal(false)
    setEditingCoupon(null)
    fetchCoupons()
  }

  const getCouponStatus = (coupon: Coupon): string => {
    if (!coupon.isActive) return 'Inactive'
    if (coupon.validUntil && new Date(coupon.validUntil) <= new Date()) return 'Expired'
    if (coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit) return 'Exceeded'
    return 'Active'
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800'
      case 'Expired':
        return 'bg-red-100 text-red-800'
      case 'Exceeded':
        return 'bg-orange-100 text-orange-800'
      case 'Inactive':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Layout currentPage="Coupons" pageTitle="Coupon Management">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-64"></div>
          <TableSkeleton rows={8} columns={6} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPage="Coupons" pageTitle="Coupon Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage discount coupons for your store
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Coupon
          </button>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search coupons by code or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Coupons Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Code</th>
                  <th className="table-header">Description</th>
                  <th className="table-header">Discount</th>
                  <th className="table-header">Usage</th>
                  <th className="table-header">Expires</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCoupons.length > 0 ? (
                  filteredCoupons.map((coupon) => {
                    const status = getCouponStatus(coupon)
                    return (
                      <tr key={coupon.id} className="hover:bg-gray-50">
                        <td className="table-cell">
                          <div className="flex items-center">
                            <TagIcon className="w-5 h-5 text-primary-600 mr-2" />
                            <span className="font-medium text-primary-600">{coupon.code}</span>
                          </div>
                        </td>
                        <td className="table-cell text-gray-500">
                          {coupon.description || '-'}
                        </td>
                        <td className="table-cell">
                          {coupon.type === 'percentage' 
                            ? `${coupon.value}%`
                            : currencyFormatter(Number(coupon.value || 0))
                          }
                          {coupon.maximumDiscountAmount && coupon.type === 'percentage' && (
                            <span className="text-xs text-gray-500 ml-1">
                              (max {currencyFormatter(Number(coupon.maximumDiscountAmount || 0))})
                            </span>
                          )}
                        </td>
                        <td className="table-cell">
                          {coupon.usageCount || 0}
                          {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                        </td>
                        <td className="table-cell">
                          {coupon.validUntil 
                            ? new Date(coupon.validUntil).toLocaleDateString()
                            : 'No expiry'
                          }
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEdit(coupon)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(coupon.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="table-cell text-center text-gray-500 py-8">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'No coupons found matching your criteria'
                        : 'No coupons found. Create your first coupon to get started.'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coupon Modal */}
        {showCouponModal && (
          <CouponModal
            coupon={editingCoupon}
            isEditMode={isEditMode}
            onClose={() => {
              setShowCouponModal(false)
              setEditingCoupon(null)
            }}
            onSave={handleSaveSuccess}
          />
        )}
      </div>
    </Layout>
  )
}

// Coupon Modal Component
interface CouponModalProps {
  coupon: Coupon | null
  isEditMode: boolean
  onClose: () => void
  onSave: () => void
}

function CouponModal({ coupon, isEditMode, onClose, onSave }: CouponModalProps) {
  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    minPurchaseAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 0,
    expiresAt: '',
    isActive: true,
    applicableTo: 'all' as 'all' | 'categories' | 'products'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (coupon) {
      setFormData({
        code: coupon.code || '',
        description: coupon.description || '',
        discountType: coupon.type === 'percentage' ? 'percentage' : 'fixed',
        discountValue: coupon.value || 0,
        minPurchaseAmount: coupon.minimumOrderAmount || 0,
        maxDiscountAmount: coupon.maximumDiscountAmount || 0,
        usageLimit: coupon.usageLimit || 0,
        expiresAt: coupon.validUntil ? new Date(coupon.validUntil).toISOString().split('T')[0] : '',
        isActive: coupon.isActive !== undefined ? coupon.isActive : true,
        applicableTo: 'all'
      })
    } else {
      // Generate random code for new coupon
      const randomCode = `COUPON${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      setFormData({
        ...formData,
        code: randomCode
      })
    }
  }, [coupon])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = mapFormToCouponPayload(formData)

      if (isEditMode && coupon) {
        await api.updateCoupon(coupon.id, payload)
        toast.success('Coupon updated successfully')
      } else {
        await api.createCoupon(payload)
        toast.success('Coupon created successfully')
      }

      onSave()
    } catch (error: any) {
      console.error('Error saving coupon:', error)
      toast.error(error.message || 'Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {isEditMode ? 'Edit Coupon' : 'Create Coupon'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coupon Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="COUPON123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Coupon description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Type *
                    </label>
                    <select
                      required
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step={formData.discountType === 'percentage' ? '1' : '0.01'}
                      max={formData.discountType === 'percentage' ? '100' : undefined}
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Purchase (K)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.minPurchaseAmount}
                      onChange={(e) => setFormData({ ...formData, minPurchaseAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  {formData.discountType === 'percentage' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Discount (K)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.maxDiscountAmount}
                        onChange={(e) => setFormData({ ...formData, maxDiscountAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usage Limit
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Unlimited if 0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : isEditMode ? 'Update Coupon' : 'Create Coupon'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

