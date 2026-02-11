'use client'

import { useEffect, useMemo, useState } from 'react'
import Layout from './Layout'
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import api from '@/app/lib/admin/api'
import toast from 'react-hot-toast'

const ruleTypes = [
  { value: 'points_per_kwacha', label: 'Points per Kwacha spent' },
  { value: 'points_per_purchase', label: 'Fixed points per purchase' },
  { value: 'points_per_product', label: 'Points per product' },
  { value: 'points_per_category', label: 'Points per category' },
]

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const emptyForm = {
  name: '',
  description: '',
  ruleType: 'points_per_kwacha',
  pointsValue: 0.01,
  status: 'active',
  priority: 0,
  validFrom: '',
  validUntil: '',
  conditions: {
    productIds: [] as number[],
    categoryIds: [] as number[],
    minPurchaseAmount: undefined as number | undefined,
    maxPointsPerOrder: undefined as number | undefined,
  },
}

type FormState = typeof emptyForm

type LoyaltyRule = FormState & { id?: number }

export default function LoyaltyProgramSettings() {
  const [rules, setRules] = useState<LoyaltyRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<LoyaltyRule | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const modalTitle = useMemo(() => (editingRule ? 'Edit Rule' : 'Create Rule'), [editingRule])

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.getLoyaltyRules()
      setRules(res.data || [])
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to load loyalty rules'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingRule(null)
  }

  const openCreate = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (rule: LoyaltyRule) => {
    setEditingRule(rule)
    setForm({
      ...rule,
      validFrom: rule.validFrom ? rule.validFrom.toString().slice(0, 10) : '',
      validUntil: rule.validUntil ? rule.validUntil.toString().slice(0, 10) : '',
      conditions: {
        productIds: rule.conditions?.productIds || [],
        categoryIds: rule.conditions?.categoryIds || [],
        minPurchaseAmount: rule.conditions?.minPurchaseAmount,
        maxPointsPerOrder: rule.conditions?.maxPointsPerOrder,
      },
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload: any = {
        ...form,
        pointsValue: Number(form.pointsValue),
        priority: Number(form.priority),
        conditions: {
          ...form.conditions,
          minPurchaseAmount: form.conditions.minPurchaseAmount
            ? Number(form.conditions.minPurchaseAmount)
            : undefined,
          maxPointsPerOrder: form.conditions.maxPointsPerOrder
            ? Number(form.conditions.maxPointsPerOrder)
            : undefined,
        },
      }

      if (editingRule?.id) {
        await api.updateLoyaltyRule(editingRule.id, payload)
      } else {
        await api.createLoyaltyRule(payload)
      }
      setShowModal(false)
      resetForm()
      toast.success(editingRule ? 'Rule updated successfully' : 'Rule created successfully')
      fetchRules()
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to save rule'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id?: number) => {
    if (!id) return
    if (!confirm('Are you sure you want to delete this loyalty rule?')) return
    try {
      await api.deleteLoyaltyRule(id)
      toast.success('Rule deleted successfully')
      fetchRules()
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to delete rule'
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }

  if (loading) {
    return (
      <Layout currentPage="Loyalty Program" pageTitle="Loyalty Program Management">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-64"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPage="Loyalty Program" pageTitle="Loyalty Program Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loyalty Program</h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure how customers earn and redeem points. 1 point = 1 ngwee.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            New Rule
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Rules List */}
        <div className="card overflow-hidden">
          {rules.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No loyalty rules yet. Create your first rule to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {rules.map((rule) => {
                const ruleTypeLabel = ruleTypes.find((r) => r.value === rule.ruleType)?.label || rule.ruleType
                const getRuleIcon = () => {
                  switch (rule.ruleType) {
                    case 'points_per_kwacha':
                      return '💰'
                    case 'points_per_purchase':
                      return '🎁'
                    case 'points_per_product':
                      return '📦'
                    case 'points_per_category':
                      return '🏷️'
                    default:
                      return '⭐'
                  }
                }

                return (
                  <div 
                    key={rule.id} 
                    className="p-6 hover:bg-gray-50 transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary-500"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header Section */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-xl">
                            {getRuleIcon()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="text-lg font-semibold text-gray-900">{rule.name}</h4>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                                  rule.status === 'active'
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  rule.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                                }`}></span>
                                {rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}
                              </span>
                              {rule.priority > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-amber-50 text-amber-700 border border-amber-200">
                                  Priority: {rule.priority}
                                </span>
                              )}
                            </div>
                            {rule.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{rule.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Rule Details Grid */}
                        <div className="ml-13 mt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Rule Type
                              </div>
                              <div className="text-sm font-semibold text-gray-900">
                                {ruleTypeLabel}
                              </div>
                            </div>
                            
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                              <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                                Points Value
                              </div>
                              <div className="text-sm font-semibold text-blue-900">
                                {rule.pointsValue}
                                {rule.ruleType === 'points_per_kwacha' && (
                                  <span className="text-xs text-blue-600 ml-1">per ZMW</span>
                                )}
                              </div>
                            </div>

                            {rule.conditions?.minPurchaseAmount && (
                              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                                <div className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
                                  Min Purchase
                                </div>
                                <div className="text-sm font-semibold text-purple-900">
                                  ZMW {rule.conditions.minPurchaseAmount.toLocaleString()}
                                </div>
                              </div>
                            )}

                            {rule.conditions?.maxPointsPerOrder && (
                              <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                                <div className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">
                                  Max per Order
                                </div>
                                <div className="text-sm font-semibold text-orange-900">
                                  {rule.conditions.maxPointsPerOrder.toLocaleString()} pts
                                </div>
                              </div>
                            )}

                            {(rule.validFrom || rule.validUntil) && (
                              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100 md:col-span-2 lg:col-span-1">
                                <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">
                                  Validity
                                </div>
                                <div className="text-xs text-indigo-900 space-y-0.5">
                                  {rule.validFrom && (
                                    <div>From: {new Date(rule.validFrom).toLocaleDateString()}</div>
                                  )}
                                  {rule.validUntil && (
                                    <div>Until: {new Date(rule.validUntil).toLocaleDateString()}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Additional Conditions */}
                          {(rule.conditions?.productIds?.length > 0 || rule.conditions?.categoryIds?.length > 0) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {rule.conditions.productIds?.length > 0 && (
                                <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                                  {rule.conditions.productIds.length} Product{rule.conditions.productIds.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              {rule.conditions.categoryIds?.length > 0 && (
                                <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                                  {rule.conditions.categoryIds.length} Categor{rule.conditions.categoryIds.length !== 1 ? 'ies' : 'y'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => openEdit(rule)}
                          className="p-2.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all duration-200"
                          title="Edit Rule"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-2.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all duration-200"
                          title="Delete Rule"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" style={{ marginTop: '0' }}>
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">{modalTitle}</h4>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                title="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSave}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rule name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rule type</label>
                  <select
                    value={form.ruleType}
                    onChange={(e) => setForm({ ...form, ruleType: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    {ruleTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    rows={2}
                    placeholder="Optional description for this rule"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Points value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.pointsValue}
                    onChange={(e) => setForm({ ...form, pointsValue: parseFloat(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Example: 0.01 = 1 ngwee per kwacha.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    {statusOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min purchase (ZMW)</label>
                  <input
                    type="number"
                    value={form.conditions.minPurchaseAmount ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        conditions: { ...form.conditions, minPurchaseAmount: e.target.value ? Number(e.target.value) : undefined },
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max points per order</label>
                  <input
                    type="number"
                    value={form.conditions.maxPointsPerOrder ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        conditions: { ...form.conditions, maxPointsPerOrder: e.target.value ? Number(e.target.value) : undefined },
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valid from</label>
                  <input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valid until</label>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </Layout>
  )
}
