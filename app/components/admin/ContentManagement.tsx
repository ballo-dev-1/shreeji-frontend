'use client'

import { useState, useEffect } from 'react'
import Layout from './Layout'
import { 
  PhotoIcon,
  DocumentTextIcon,
  MegaphoneIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import api from '@/app/lib/admin/api'
import toast from 'react-hot-toast'

interface Banner {
  id: string
  title: string
  subtitle?: string
  imageUrl: string
  videoUrl?: string
  linkUrl?: string
  isActive: boolean
  order: number
}

interface FAQ {
  id: string
  question: string
  answer: string
  category?: string
  order: number
}

interface PromotionalContent {
  id: string
  title: string
  description?: string
  imageUrl?: string
  linkUrl?: string
  startDate?: string
  endDate?: string
  isActive: boolean
}

export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState<'banners' | 'promos' | 'faq'>('banners')
  const [banners, setBanners] = useState<Banner[]>([])
  const [promos, setPromos] = useState<PromotionalContent[]>([])
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [modalType, setModalType] = useState<'banner' | 'promo' | 'faq'>('banner')

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    try {
      setLoading(true)
      // Fetch from settings API
      const [bannersData, promosData, faqsData] = (await Promise.all([
        api.getSettingsByCategory('content_banners').catch(() => ({ data: [] })),
        api.getSettingsByCategory('content_promos').catch(() => ({ data: [] })),
        api.getSettingsByCategory('content_faq').catch(() => ({ data: [] }))
      ])) as any[]

      setBanners(Array.isArray(bannersData?.data) ? bannersData.data : bannersData?.banners || [])
      setPromos(Array.isArray(promosData?.data) ? promosData.data : promosData?.promos || [])
      setFaqs(Array.isArray(faqsData?.data) ? faqsData.data : faqsData?.faqs || [])
    } catch (error: any) {
      console.error('Error fetching content:', error)
      toast.error('Failed to load content')
    } finally {
      setLoading(false)
    }
  }

  const saveContent = async (category: string, data: any) => {
    try {
      await api.updateSettings(category, data)
      toast.success('Content saved successfully')
      fetchContent()
      setShowModal(false)
      setEditingItem(null)
    } catch (error: any) {
      console.error('Error saving content:', error)
      toast.error(error.message || 'Failed to save content')
    }
  }

  const handleAdd = (type: 'banner' | 'promo' | 'faq') => {
    setModalType(type)
    setEditingItem(null)
    setShowModal(true)
  }

  const handleEdit = (item: any, type: 'banner' | 'promo' | 'faq') => {
    setModalType(type)
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = async (item: any, type: 'banner' | 'promo' | 'faq') => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const category = `content_${type === 'banner' ? 'banners' : type === 'promo' ? 'promos' : 'faq'}`
      const currentData = type === 'banner' ? banners : type === 'promo' ? promos : faqs
      const updated = currentData.filter((i: any) => i.id !== item.id)
      
      await saveContent(category, { 
        [type === 'banner' ? 'banners' : type === 'promo' ? 'promos' : 'faqs']: updated 
      })
    } catch (error: any) {
      toast.error('Failed to delete item')
    }
  }

  const moveItem = async (index: number, direction: 'up' | 'down', type: 'banner' | 'faq') => {
    const items = (type === 'banner' ? [...banners] : [...faqs]) as any[]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex < 0 || newIndex >= items.length) return

    const [removed] = items.splice(index, 1)
    items.splice(newIndex, 0, removed)
    
    // Update order numbers
    items.forEach((item, idx) => {
      item.order = idx + 1
    })

    const category = type === 'banner' ? 'content_banners' : 'content_faq'
    const key = type === 'banner' ? 'banners' : 'faqs'
    
    await saveContent(category, { [key]: items })
    
    if (type === 'banner') {
      setBanners(items)
    } else {
      setFaqs(items)
    }
  }

  if (loading) {
    return (
      <Layout currentPage="Content" pageTitle="Content Management">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-64"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPage="Content" pageTitle="Content Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage homepage banners, promotional content, and FAQ
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('banners')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'banners'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <PhotoIcon className="w-5 h-5 inline-block mr-2" />
              Homepage Banners
            </button>
            <button
              onClick={() => setActiveTab('promos')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'promos'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MegaphoneIcon className="w-5 h-5 inline-block mr-2" />
              Promotional Content
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'faq'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DocumentTextIcon className="w-5 h-5 inline-block mr-2" />
              FAQ
            </button>
          </nav>
        </div>

        {/* Content Sections */}
        <div className="card p-6">
          {activeTab === 'banners' && (
            <BannersSection
              banners={banners}
              onAdd={() => handleAdd('banner')}
              onEdit={(banner) => handleEdit(banner, 'banner')}
              onDelete={(banner) => handleDelete(banner, 'banner')}
              onMove={moveItem}
            />
          )}

          {activeTab === 'promos' && (
            <PromosSection
              promos={promos}
              onAdd={() => handleAdd('promo')}
              onEdit={(promo) => handleEdit(promo, 'promo')}
              onDelete={(promo) => handleDelete(promo, 'promo')}
            />
          )}

          {activeTab === 'faq' && (
            <FAQSection
              faqs={faqs}
              onAdd={() => handleAdd('faq')}
              onEdit={(faq) => handleEdit(faq, 'faq')}
              onDelete={(faq) => handleDelete(faq, 'faq')}
              onMove={moveItem}
            />
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <ContentModal
            type={modalType}
            item={editingItem}
            onClose={() => {
              setShowModal(false)
              setEditingItem(null)
            }}
            onSave={(data) => {
              const category = `content_${modalType === 'banner' ? 'banners' : modalType === 'promo' ? 'promos' : 'faq'}`
              const key = modalType === 'banner' ? 'banners' : modalType === 'promo' ? 'promos' : 'faqs'
              const currentItems = modalType === 'banner' ? banners : modalType === 'promo' ? promos : faqs
              
              let updated
              if (editingItem) {
                updated = currentItems.map((item: any) => 
                  item.id === editingItem.id ? { ...item, ...data } : item
                )
              } else {
                updated = [...currentItems, { 
                  ...data, 
                  id: Date.now().toString(),
                  order: currentItems.length + 1 
                }]
              }
              
              saveContent(category, { [key]: updated })
            }}
          />
        )}
      </div>
    </Layout>
  )
}

// Banners Section
function BannersSection({ banners, onAdd, onEdit, onDelete, onMove }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Homepage Banners</h3>
        <button onClick={onAdd} className="btn-primary flex items-center">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Banner
        </button>
      </div>
      <div className="space-y-4">
        {banners.length > 0 ? (
          banners.sort((a: Banner, b: Banner) => a.order - b.order).map((banner: Banner, index: number) => (
            <div key={banner.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => onMove(index, 'up', 'banner')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronUpIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onMove(index, 'down', 'banner')}
                    disabled={index === banners.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronDownIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{banner.title}</div>
                  {banner.subtitle && <div className="text-sm text-gray-500">{banner.subtitle}</div>}
                  <div className="text-xs text-gray-400 mt-1">Order: {banner.order}</div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {banner.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button onClick={() => onEdit(banner)} className="text-blue-600 hover:text-blue-700">
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button onClick={() => onDelete(banner)} className="text-red-600 hover:text-red-700">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No banners found. Create your first banner to get started.
          </div>
        )}
      </div>
    </div>
  )
}

// Promos Section
function PromosSection({ promos, onAdd, onEdit, onDelete }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Promotional Content</h3>
        <button onClick={onAdd} className="btn-primary flex items-center">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Promo
        </button>
      </div>
      <div className="space-y-4">
        {promos.length > 0 ? (
          promos.map((promo: PromotionalContent) => (
            <div key={promo.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{promo.title}</div>
                {promo.description && <div className="text-sm text-gray-500 mt-1">{promo.description}</div>}
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ml-4 ${promo.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {promo.isActive ? 'Active' : 'Inactive'}
              </span>
              <div className="flex items-center space-x-2 ml-4">
                <button onClick={() => onEdit(promo)} className="text-blue-600 hover:text-blue-700">
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button onClick={() => onDelete(promo)} className="text-red-600 hover:text-red-700">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No promotional content found. Create your first promo to get started.
          </div>
        )}
      </div>
    </div>
  )
}

// FAQ Section
function FAQSection({ faqs, onAdd, onEdit, onDelete, onMove }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h3>
        <button onClick={onAdd} className="btn-primary flex items-center">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add FAQ
        </button>
      </div>
      <div className="space-y-4">
        {faqs.length > 0 ? (
          faqs.sort((a: FAQ, b: FAQ) => a.order - b.order).map((faq: FAQ, index: number) => (
            <div key={faq.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex flex-col space-y-1 pt-1">
                    <button
                      onClick={() => onMove(index, 'up', 'faq')}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronUpIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onMove(index, 'down', 'faq')}
                      disabled={index === faqs.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronDownIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{faq.question}</div>
                    <div className="text-sm text-gray-500 mt-2">{faq.answer}</div>
                    {faq.category && (
                      <div className="text-xs text-gray-400 mt-2">Category: {faq.category}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button onClick={() => onEdit(faq)} className="text-blue-600 hover:text-blue-700">
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button onClick={() => onDelete(faq)} className="text-red-600 hover:text-red-700">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No FAQs found. Create your first FAQ to get started.
          </div>
        )}
      </div>
    </div>
  )
}

// Content Modal
interface ContentModalProps {
  type: 'banner' | 'promo' | 'faq'
  item: any
  onClose: () => void
  onSave: (data: any) => void
}

function ContentModal({ type, item, onClose, onSave }: ContentModalProps) {
  const [formData, setFormData] = useState<any>({
    title: '',
    subtitle: '',
    imageUrl: '',
    videoUrl: '',
    linkUrl: '',
    isActive: true,
    description: '',
    startDate: '',
    endDate: '',
    question: '',
    answer: '',
    category: ''
  })

  useEffect(() => {
    if (item) {
      setFormData(item)
    }
  }, [item])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
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
                  {item ? 'Edit' : 'Create'} {type === 'banner' ? 'Banner' : type === 'promo' ? 'Promo' : 'FAQ'}
                </h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {type === 'banner' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={formData.subtitle || ''}
                        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Image URL *</label>
                      <input
                        type="url"
                        required
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                      <input
                        type="url"
                        value={formData.videoUrl || ''}
                        onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                      <input
                        type="url"
                        value={formData.linkUrl || ''}
                        onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">Active</label>
                    </div>
                  </>
                )}

                {type === 'promo' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                      <input
                        type="url"
                        value={formData.imageUrl || ''}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                      <input
                        type="url"
                        value={formData.linkUrl || ''}
                        onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={formData.startDate || ''}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={formData.endDate || ''}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">Active</label>
                    </div>
                  </>
                )}

                {type === 'faq' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                      <input
                        type="text"
                        required
                        value={formData.question}
                        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Answer *</label>
                      <textarea
                        required
                        value={formData.answer}
                        onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        value={formData.category || ''}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="e.g., Shipping, Returns, Products"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {item ? 'Update' : 'Create'}
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

