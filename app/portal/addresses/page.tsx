'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'
import { Plus, MapPin, Edit2, Trash2, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface Address {
  id: string | number
  type?: string
  firstName: string
  lastName: string
  company?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state?: string
  postalCode: string
  country: string
  phone?: string
  isDefault?: boolean
}

export default function AddressesPage() {
  const { loading: authLoading, isAuthenticated } = useClientAuth()
  const router = useRouter()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [formData, setFormData] = useState({
    type: 'shipping' as 'shipping' | 'billing' | 'both',
    firstName: '',
    lastName: '',
    company: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Zambia',
    phone: '',
    isDefault: false,
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/portal/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses()
    }
  }, [isAuthenticated])

  const fetchAddresses = async () => {
    try {
      setLoading(true)
      const response = await clientApi.getAddresses()
      setAddresses(response.data || [])
    } catch (error: any) {
      console.error('Error fetching addresses:', error)
      toast.error('Failed to load addresses')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (address?: Address) => {
    if (address) {
      setEditingAddress(address)
      const addressType = address.type as 'shipping' | 'billing' | 'both' | undefined
      setFormData({
        type: (addressType && ['shipping', 'billing', 'both'].includes(addressType)) 
          ? addressType 
          : 'shipping',
        firstName: address.firstName || '',
        lastName: address.lastName || '',
        company: address.company || '',
        addressLine1: address.addressLine1 || '',
        addressLine2: address.addressLine2 || '',
        city: address.city || '',
        state: address.state || '',
        postalCode: address.postalCode || '',
        country: address.country || 'Zambia',
        phone: address.phone || '',
        isDefault: address.isDefault || false,
      })
    } else {
      setEditingAddress(null)
      setFormData({
        type: 'shipping',
        firstName: '',
        lastName: '',
        company: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Zambia',
        phone: '',
        isDefault: false,
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingAddress(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingAddress) {
        await clientApi.updateAddress(editingAddress.id.toString(), formData)
        toast.success('Address updated successfully')
      } else {
        await clientApi.createAddress(formData)
        toast.success('Address added successfully')
      }
      handleCloseModal()
      fetchAddresses()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save address')
    }
  }

  const handleDelete = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return
    }
    try {
      await clientApi.deleteAddress(id.toString())
      toast.success('Address deleted successfully')
      fetchAddresses()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete address')
    }
  }

  const handleSetDefault = async (id: string | number) => {
    try {
      await clientApi.updateAddress(id.toString(), { isDefault: true })
      toast.success('Default address updated')
      fetchAddresses()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update default address')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8]">
        <div className="space-y-4 animate-pulse">
          <div className="h-12 w-12 bg-gray-300 rounded-full mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <button
            onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-8 py-4 bg-[var(--shreeji-primary)] text-white rounded-2xl hover:opacity-90 transition-all shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Add Address
          </button>
        </div>

        {addresses.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-12 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No addresses saved</h3>
            <p className="text-gray-500 mb-6">Add your first address to get started</p>
            <button
              onClick={() => handleOpenModal()}
            className="px-8 py-4 bg-[var(--shreeji-primary)] text-white rounded-2xl hover:opacity-90 transition-all shadow-lg"
            >
              Add Address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addresses.map((address) => (
              <div
                key={address.id}
              className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-6 relative"
              >
                {address.isDefault && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    <Check className="h-3 w-3" />
                    Default
                  </span>
                )}
                <div className="pr-20">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {address.firstName} {address.lastName}
                  </h3>
                  {address.company && (
                    <p className="text-sm text-gray-600 mb-2">{address.company}</p>
                  )}
                  <p className="text-sm text-gray-600 mb-1">{address.addressLine1}</p>
                  {address.addressLine2 && (
                    <p className="text-sm text-gray-600 mb-1">{address.addressLine2}</p>
                  )}
                  <p className="text-sm text-gray-600 mb-1">
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">{address.country}</p>
                  {address.phone && (
                    <p className="text-sm text-gray-600">Phone: {address.phone}</p>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleOpenModal(address)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                  className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all"
                      title="Set as default"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(address.id)}
                className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-2xl hover:bg-red-100 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Address Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </h2>
              </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-3 border border-[#dddddd] rounded-2xl focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                    />
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-3 border border-[#dddddd] rounded-2xl focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                    />
                  </div>
                </div>

                <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-3 border border-[#dddddd] rounded-2xl focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                  />
                </div>

                <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="w-full px-4 py-3 border border-[#dddddd] rounded-2xl focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                  />
                </div>

                <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                className="w-full px-4 py-3 border border-[#dddddd] rounded-2xl focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 border border-[#dddddd] rounded-2xl focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                    />
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-3 border border-[#dddddd] rounded-2xl focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                    />
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full px-4 py-3 border border-[#dddddd] rounded-2xl focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-3 border border-[#dddddd] rounded-2xl focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                    />
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-[#dddddd] rounded-2xl focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="h-4 w-4 text-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] border-gray-300 rounded"
                  />
                  <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                    Set as default address
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                className="px-8 py-4 text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                className="px-8 py-4 bg-[var(--shreeji-primary)] text-white rounded-2xl hover:opacity-90 transition-all shadow-lg"
                  >
                    {editingAddress ? 'Update Address' : 'Add Address'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  )
}

