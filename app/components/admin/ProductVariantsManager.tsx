'use client'

import React, { useState, useEffect, useRef, Fragment } from 'react'
import { Transition } from '@headlessui/react'
import { useExchangeRate } from '@/app/contexts/ExchangeRateContext'
import api from '@/app/lib/admin/api'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  ChevronDownIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { generateVariantSKU, generateUniqueVariantSKU } from '@/utils/sku-generator'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'

interface ProductVariant {
  id: number
  sku: string
  specs: Record<string, string>
  attributes?: Record<string, any>
  price?: number
  basePrice?: number
  taxRate?: number
  discountPercent?: number
  discountedPrice?: number
  stockQuantity: number
  stockStatus: string
  minStockLevel?: number
  images?: Array<{ url: string; alt?: string }>
  isActive: boolean
}

interface ProductVariantsManagerProps {
  productId: number
  productName: string
}

// Helper function to find matching variant attribute key (case-insensitive)
const findMatchingVariantKey = (specKey: string, variantAttributeKeys: string[]) => {
  return variantAttributeKeys.find(
    (variantKey) => variantKey.toLowerCase() === specKey.toLowerCase()
  )
}

// Helper function to generate all variant combinations
const generateVariantCombinations = (productSpecs: Record<string, string[]>) => {
  const specKeys = Object.keys(productSpecs)
  if (specKeys.length === 0) return []

  const combinations: Record<string, string>[] = []
  
  const generate = (current: Record<string, string>, index: number) => {
    if (index === specKeys.length) {
      combinations.push({ ...current })
      return
    }
    
    const specKey = specKeys[index]
    const values = productSpecs[specKey]
    
    values.forEach(value => {
      generate({ ...current, [specKey]: value }, index + 1)
    })
  }
  
  generate({}, 0)
  return combinations
}

export default function ProductVariantsManager({ productId, productName }: ProductVariantsManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null)
  const [bulkEditing, setBulkEditing] = useState(false)
  const [selectedVariants, setSelectedVariants] = useState<number[]>([])
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkDiscount, setBulkDiscount] = useState('')
  const [product, setProduct] = useState<any>(null)
  const [missingCombinations, setMissingCombinations] = useState<any[]>([])
  const [coverageStats, setCoverageStats] = useState({
    totalPossible: 0,
    existing: 0,
    missing: 0,
    percentage: 0
  })

  useEffect(() => {
    loadVariants()
    loadProduct()
  }, [productId])

  // Calculate missing combinations
  useEffect(() => {
    const calculateMissingCombinations = () => {
      if (!product?.specs || variants.length === 0) {
        setMissingCombinations([])
        setCoverageStats({
          totalPossible: 0,
          existing: 0,
          missing: 0,
          percentage: 0
        })
        return
      }

      // Get product default values (for reference, but not included in combinations)
      const productDefaults: Record<string, string> = {}
      Object.entries(product.specs).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          productDefaults[key] = value
        }
      })

      // Get variant attribute keys (specs that have variants)
      const variantAttributeKeys = Array.from(
        new Set(variants.flatMap((v) => Object.keys(v.attributes || v.specs || {})))
      )

      // Get variant values ONLY (not product defaults)
      // Only include specs that have at least 2 different variant values
      const variantSpecValues: Record<string, Set<string>> = {}
      
      variants.forEach(variant => {
        Object.entries(variant.attributes || variant.specs || {}).forEach(([key, value]) => {
          const matchingKey = findMatchingVariantKey(key, variantAttributeKeys)
          if (matchingKey) {
            if (!variantSpecValues[key]) {
              variantSpecValues[key] = new Set()
            }
            variantSpecValues[key].add(String(value))
          }
        })
      })

      // Filter to only specs that have at least 2 variant values
      // (If a spec only has 1 variant value, no combinations needed)
      const relevantSpecs: Record<string, string[]> = {}
      Object.entries(variantSpecValues).forEach(([key, values]) => {
        // Only include if there are at least 2 different variant values
        if (values.size >= 2) {
          relevantSpecs[key] = Array.from(values)
        }
      })

      if (Object.keys(relevantSpecs).length === 0) {
        setMissingCombinations([])
        setCoverageStats({
          totalPossible: 0,
          existing: 0,
          missing: 0,
          percentage: 100
        })
        return
      }

      // Generate all possible combinations (only using variant values)
      const allCombinations = generateVariantCombinations(relevantSpecs)

      // Find missing combinations
      // A combination is missing if no variant matches ALL its spec values
      const missing = allCombinations.filter(combination => {
        return !variants.some(variant => {
          const variantAttrs = variant.attributes || variant.specs || {}
          return Object.keys(combination).every(key => {
            const matchingKey = findMatchingVariantKey(key, Object.keys(variantAttrs))
            return matchingKey && variantAttrs[matchingKey] === combination[key]
          })
        })
      })

      setMissingCombinations(missing)
      
      // Calculate coverage
      const total = allCombinations.length
      const existing = total - missing.length
      const percentage = total > 0 ? Math.round((existing / total) * 100) : 100
      
      setCoverageStats({
        totalPossible: total,
        existing,
        missing: missing.length,
        percentage
      })
    }

    calculateMissingCombinations()
  }, [variants, product])

  const loadProduct = async () => {
    try {
      const response = await api.getProduct(productId)
      setProduct(response.data)
    } catch (error) {
      console.error('Failed to load product:', error)
    }
  }

  const loadVariants = async () => {
    try {
      setLoading(true)
      const response = await api.getProductVariants(productId)
      // Map backend attributes to specs for frontend
      const variants = (response.data || []).map((variant: any) => ({
        ...variant,
        specs: variant.attributes || variant.specs || {}
      }))
      setVariants(variants)
    } catch (error: any) {
      console.error('Failed to load variants:', error)
      toast.error(error.message || 'Failed to load variants')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVariant = async (variantData: any) => {
    try {
      await api.createProductVariant(productId, variantData)
      toast.success('Variant created successfully')
      setIsCreating(false)
      loadVariants()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create variant')
      throw error
    }
  }

  const handleUpdateVariant = async (variantId: number, variantData: any) => {
    try {
      await api.updateProductVariant(productId, variantId, variantData)
      toast.success('Variant updated successfully')
      // Don't set editingVariantId here - let the form handle it
      loadVariants()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update variant')
      throw error
    }
  }

  const handleDeleteVariant = async (variantId: number) => {
    if (!confirm('Are you sure you want to delete this variant?')) {
      return
    }

    try {
      await api.deleteProductVariant(productId, variantId)
      toast.success('Variant deleted successfully')
      loadVariants()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete variant')
    }
  }

  const handleGenerateAllCombinations = async () => {
    if (!product?.specs) {
      toast.error('Product must have specs defined first')
      return
    }

    // Extract all possible values for each spec from existing variants
    const specValues: Record<string, Set<string>> = {}
    
    variants.forEach(variant => {
      Object.entries(variant.attributes || variant.specs || {}).forEach(([key, value]) => {
        if (!specValues[key]) {
          specValues[key] = new Set()
        }
        specValues[key].add(String(value))
      })
    })

    // Also include product spec values
    if (product.specs) {
      Object.entries(product.specs).forEach(([key, value]) => {
        if (!specValues[key]) {
          specValues[key] = new Set()
        }
        if (value && typeof value === 'string') {
          specValues[key].add(value)
        }
      })
    }

    // Convert to arrays
    const productSpecs: Record<string, string[]> = {}
    Object.entries(specValues).forEach(([key, values]) => {
      productSpecs[key] = Array.from(values)
    })

    if (Object.keys(productSpecs).length === 0) {
      toast.error('No spec values found. Create at least one variant with attributes first.')
      return
    }

    const combinations = generateVariantCombinations(productSpecs)
    
    if (combinations.length === 0) {
      toast.error('No combinations to generate.')
      return
    }

    if (!confirm(`This will create ${combinations.length} variant combinations. Continue?`)) {
      return
    }

    try {
      let created = 0
      let skipped = 0
      
      for (const combination of combinations) {
        // Check if variant already exists
        const exists = variants.some(v => {
          return Object.keys(combination).every(key => {
            const variantAttrs = v.attributes || v.specs || {}
            const matchingKey = findMatchingVariantKey(key, Object.keys(variantAttrs))
            if (!matchingKey) return false
            return variantAttrs[matchingKey] === combination[key]
          })
        })

        if (!exists) {
          try {
            // Generate SKU
            const sku = await generateUniqueVariantSKU(
              productName,
              combination,
              async (sku) => {
                const allVariants = await api.getProductVariants(productId)
                return (allVariants.data || []).some((v: any) => v.sku === sku)
              }
            )

            await api.createProductVariant(productId, {
              sku,
              attributes: combination,
              price: product.price, // Use base price, admin can edit later
              stockQuantity: 0,
              minStockLevel: 1,
              isActive: true,
            })
            created++
          } catch (error: any) {
            console.error('Failed to create variant:', error)
            skipped++
          }
        } else {
          skipped++
        }
      }
      
      toast.success(`Created ${created} variants. ${skipped} already existed or failed.`)
      loadVariants()
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate variants')
    }
  }

  const handleBulkPriceUpdate = async () => {
    if (selectedVariants.length === 0) {
      toast.error('Please select variants to update')
      return
    }

    if (!bulkPrice && !bulkDiscount) {
      toast.error('Please enter at least a price or discount')
      return
    }

    try {
      for (const variantId of selectedVariants) {
        const updateData: any = {}
        if (bulkPrice) {
          updateData.price = parseFloat(bulkPrice)
        }
        if (bulkDiscount) {
          updateData.discountedPrice = parseFloat(bulkDiscount)
        }
        
        await api.updateProductVariant(productId, variantId, updateData)
      }
      
      toast.success(`Updated ${selectedVariants.length} variants`)
      setBulkEditing(false)
      setSelectedVariants([])
      setBulkPrice('')
      setBulkDiscount('')
      loadVariants()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update variants')
    }
  }

  const toggleVariantSelection = (variantId: number) => {
    setSelectedVariants(prev => 
      prev.includes(variantId)
        ? prev.filter(id => id !== variantId)
        : [...prev, variantId]
    )
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading variants...</div>
  }

  const handleCreateMissingCombinations = async () => {
    if (missingCombinations.length === 0) return

    if (!confirm(`Create ${missingCombinations.length} missing variants?`)) return
    
    try {
      let created = 0
      let failed = 0
      
      for (const combination of missingCombinations) {
        try {
          const sku = await generateUniqueVariantSKU(
            productName,
            combination,
            async (sku) => {
              const allVariants = await api.getProductVariants(productId)
              return (allVariants.data || []).some((v: any) => v.sku === sku)
            }
          )
          
          await api.createProductVariant(productId, {
            sku,
            attributes: combination,
            price: product.price,
            stockQuantity: 0,
            minStockLevel: 1,
            isActive: true,
          })
          created++
        } catch (error) {
          console.error('Failed to create variant:', error)
          failed++
        }
      }
      
      toast.success(`Created ${created} missing variants${failed > 0 ? `. ${failed} failed.` : ''}`)
      loadVariants()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create variants')
    }
  }

  return (
    <div className="space-y-4">
      {/* Coverage Indicator */}
      {product?.specs && coverageStats.totalPossible > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-blue-900">
              Variant Coverage
            </h4>
            <span className={`text-lg font-bold ${
              coverageStats.percentage >= 80 ? 'text-green-600' :
              coverageStats.percentage >= 50 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {coverageStats.percentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${
                coverageStats.percentage >= 80 ? 'bg-green-500' :
                coverageStats.percentage >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${coverageStats.percentage}%` }}
            />
          </div>
          <p className="text-xs text-blue-700">
            {coverageStats.existing} of {coverageStats.totalPossible} combinations have pricing
            {coverageStats.missing > 0 && (
              <span className="font-semibold"> • {coverageStats.missing} missing</span>
            )}
          </p>
        </div>
      )}

      {/* Missing Combinations Alert */}
      {missingCombinations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                ⚠️ Missing Combinations ({missingCombinations.length})
              </h4>
              <p className="text-xs text-yellow-700 mb-3">
                These combinations don't have pricing yet. Customers may encounter errors when selecting them.
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {missingCombinations.slice(0, 10).map((combination, index) => (
                  <div key={index} className="text-xs text-yellow-800 bg-yellow-100 px-2 py-1 rounded">
                    {Object.entries(combination as Record<string, any>).map(([key, value]) => (
                      <span key={key} className="mr-2">
                        <strong>{key}:</strong> {String(value)}
                      </span>
                    ))}
                  </div>
                ))}
                {missingCombinations.length > 10 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ...and {missingCombinations.length - 10} more
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateMissingCombinations}
              className="ml-4 px-3 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 whitespace-nowrap"
            >
              Create All Missing
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Product Variants</h3>
        {!isCreating && !editingVariantId && !bulkEditing && (
          <div className="flex items-center space-x-2">
            {variants.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleGenerateAllCombinations}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  title="Generate all possible variant combinations"
                >
                  Generate All Combinations
                </button>
                <button
                  type="button"
                  onClick={() => setBulkEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  title="Bulk edit prices"
                >
                  Bulk Edit Prices
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--shreeji-primary)] hover:opacity-90"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Variant
            </button>
          </div>
        )}
      </div>

      {bulkEditing && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Bulk Price Editor</h4>
            <button
              type="button"
              onClick={() => {
                setBulkEditing(false)
                setSelectedVariants([])
                setBulkPrice('')
                setBulkDiscount('')
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-2">
              {selectedVariants.length} variant(s) selected
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price
                </label>
                <input
                  type="number"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  placeholder="Enter price"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discounted Price
                </label>
                <input
                  type="number"
                  value={bulkDiscount}
                  onChange={(e) => setBulkDiscount(e.target.value)}
                  placeholder="Enter discounted price"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleBulkPriceUpdate}
                className="px-4 py-2 bg-[var(--shreeji-primary)] text-white rounded-md hover:opacity-90"
              >
                Update Selected Variants
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedVariants(variants.map(v => v.id))
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setSelectedVariants([])}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreating && (
        <VariantForm
          productId={productId}
          productName={productName}
          onSave={handleCreateVariant}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {variants.length === 0 && !isCreating ? (
        <div className="text-center py-8 text-gray-500">
          <p>No variants yet. Click "Add Variant" to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {variants.map((variant) => {
            const isEditing = editingVariantId === variant.id
            
            return (
              <div
                key={variant.id}
                className={`border rounded-lg transition-colors ${
                  bulkEditing && selectedVariants.includes(variant.id)
                    ? 'border-[var(--shreeji-primary)] bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {bulkEditing && (
                  <div className="p-4 pb-2">
                    <input
                      type="checkbox"
                      checked={selectedVariants.includes(variant.id)}
                      onChange={() => toggleVariantSelection(variant.id)}
                      className="h-4 w-4 text-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] border-gray-300 rounded"
                    />
                  </div>
                )}
                
                {/* Variant Summary - Always Visible */}
                <div className={`p-4 ${isEditing ? 'pb-2' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-semibold text-gray-900">{variant.sku}</span>
                        {!variant.isActive && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Inactive</span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded ${
                          variant.stockStatus === 'in-stock' ? 'bg-green-100 text-green-800' :
                          variant.stockStatus === 'low-stock' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {variant.stockStatus}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        {Object.entries(variant.specs).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {value}
                          </div>
                        ))}
                        <div className="flex items-center space-x-4 mt-2">
                          {variant.price && (
                            <span>Price: K{variant.price.toLocaleString()}</span>
                          )}
                          {variant.discountedPrice && (
                            <span className="text-green-600">
                              Discounted: K{variant.discountedPrice.toLocaleString()}
                            </span>
                          )}
                          <span>Stock: {variant.stockQuantity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingVariantId(isEditing ? null : variant.id);
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={isEditing ? "Cancel edit" : "Edit variant"}
                      >
                        {isEditing ? (
                          <XMarkIcon className="h-5 w-5" />
                        ) : (
                          <PencilIcon className="h-5 w-5" />
                        )}
                      </button>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVariant(variant.id);
                          }}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete variant"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit Form Accordion */}
                {isEditing && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-4">
                      <VariantForm
                        productId={productId}
                        productName={productName}
                        variant={variant}
                        onSave={async (data) => {
                          await handleUpdateVariant(variant.id, data)
                          setEditingVariantId(null)
                        }}
                        onCancel={() => setEditingVariantId(null)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Component to handle specification input with searchable dropdown for spec name
function AttributeInput({ 
  attributeKey, 
  attributeValue, 
  availableSpecNames,
  onKeyChange, 
  onValueChange,
  onRemove
}: { 
  attributeKey: string; 
  attributeValue: string; 
  availableSpecNames: string[];
  onKeyChange: (oldKey: string, newKey: string) => void;
  onValueChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
}) {
  const [query, setQuery] = useState(attributeKey || '');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update query when attributeKey changes externally
  useEffect(() => {
    if (inputRef.current !== document.activeElement) {
      // If key is a temporary generated key (spec_ followed by numbers), show empty
      // Otherwise show the actual key
      const isTempKey = attributeKey.startsWith('spec_') && /^spec_\d+$/.test(attributeKey);
      setQuery(isTempKey ? '' : (attributeKey || ''));
    }
  }, [attributeKey]);

  // Filter available specs based on query
  const filteredSpecs = availableSpecNames.filter((name) =>
    name.toLowerCase().includes(query.toLowerCase())
  );

  // Check if current attributeKey is in available list
  const isCustomSpec = attributeKey && !availableSpecNames.includes(attributeKey);
  
  // Show "Add new" option if query doesn't match any existing spec and query is not empty
  const showAddNew = query.trim() !== '' && 
                     !availableSpecNames.some(name => name.toLowerCase() === query.toLowerCase().trim()) &&
                     (!attributeKey || query.toLowerCase().trim() !== attributeKey.toLowerCase());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
  };

  const handleSelect = (value: string) => {
    if (value && value.trim() !== '') {
      onKeyChange(attributeKey, value.trim());
      setQuery(value.trim());
      setIsOpen(false);
    }
  };

  const handleAddNew = () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      onKeyChange(attributeKey, trimmedQuery);
      setQuery(trimmedQuery);
      setIsOpen(false);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay to allow click events on dropdown items
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        // If query doesn't match attributeKey, update it
        if (query.trim() !== attributeKey && query.trim() !== '') {
          handleAddNew();
        } else if (query.trim() === '') {
          setQuery(attributeKey || '');
        }
      }
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && showAddNew) {
      e.preventDefault();
      handleAddNew();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery(attributeKey || '');
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="flex-1 relative" ref={dropdownRef}>
        <div className="relative">
          <MagnifyingGlassIcon
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Search or add specification"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute inset-y-0 right-0 flex items-center pr-2"
          >
            <ChevronDownIcon
              className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
        {isOpen && (
          <Transition
            show={isOpen}
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {query === '' && (
                <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                  Start typing to search or add a new specification
                </div>
              )}
              {filteredSpecs.length === 0 && query !== '' && !showAddNew && (
                <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                  No specifications found.
                </div>
              )}
              {filteredSpecs.map((name) => (
                <div
                  key={name}
                  onClick={() => handleSelect(name)}
                  className={`relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    attributeKey === name
                      ? 'bg-primary-600 text-white font-medium'
                      : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="block truncate">{name}</span>
                  {attributeKey === name && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white">
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </div>
              ))}
              {isCustomSpec && attributeKey && !filteredSpecs.includes(attributeKey) && (
                <div
                  onClick={() => handleSelect(attributeKey)}
                  className={`relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    'bg-primary-600 text-white font-medium'
                  }`}
                >
                  <span className="block truncate">{attributeKey} (custom)</span>
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white">
                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
              )}
              {showAddNew && (
                <div
                  onClick={handleAddNew}
                  className="relative cursor-pointer select-none py-2 pl-10 pr-4 text-primary-600 hover:bg-primary-50 font-medium"
                >
                  <span className="block truncate">
                    <PlusIcon className="inline h-4 w-4 mr-1" />
                    Add "{query.trim()}"
                  </span>
                </div>
              )}
            </div>
          </Transition>
        )}
      </div>
      <input
        type="text"
        value={String(attributeValue || '')}
        onChange={(e) => onValueChange(attributeKey, e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        placeholder="Specification value"
      />
      <button
        type="button"
        onClick={() => onRemove(attributeKey)}
        className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        title="Remove specification"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

interface VariantFormProps {
  productId: number
  productName: string
  variant?: ProductVariant
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}

function VariantForm({ productId, productName, variant, onSave, onCancel }: VariantFormProps) {
  // Calculate basePrice from price if variant exists and has price
  const calculateBasePrice = (price: number | string | undefined) => {
    if (!price) return '';
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;
    if (!priceNum || isNaN(priceNum)) return '';
    const tax = 16; // VAT is always 16%
    return (priceNum / (1 + tax / 100)).toFixed(2);
  };

  const [formData, setFormData] = useState({
    sku: variant?.sku || '',
    specs: variant?.specs || {},
    basePrice: variant?.basePrice || (variant?.price ? calculateBasePrice(variant.price) : ''),
    taxRate: 16, // VAT is always 16%
    discountPercent: variant?.discountPercent || 0,
    price: variant?.price || '',
    discountedPrice: variant?.discountedPrice || '',
    stockQuantity: variant?.stockQuantity || 0,
    minStockLevel: variant?.minStockLevel ?? 1,
    isActive: variant?.isActive !== undefined ? variant.isActive : true,
  })
  const [saving, setSaving] = useState(false)
  const [availableSpecNames, setAvailableSpecNames] = useState<string[]>([])
  
  // Currency conversion - use dynamic exchange rate
  const { rate: USD_TO_ZMW_RATE } = useExchangeRate();
  const [basePriceUSD, setBasePriceUSD] = useState<string>('');
  const [basePriceZMW, setBasePriceZMW] = useState<string>('');
  const [sellingPriceUSD, setSellingPriceUSD] = useState<string>('');
  const [sellingPriceZMW, setSellingPriceZMW] = useState<string>('');

  // Initialize currency fields from basePrice and price when variant changes
  useEffect(() => {
    if (variant) {
      const basePriceValue = typeof variant.basePrice === 'string' 
        ? parseFloat(variant.basePrice) 
        : (variant.basePrice || 0);
      
      if (basePriceValue > 0) {
        setBasePriceZMW(basePriceValue.toFixed(2));
        setBasePriceUSD((basePriceValue / USD_TO_ZMW_RATE).toFixed(2));
      } else {
        setBasePriceZMW('');
        setBasePriceUSD('');
      }
      
      // Initialize selling price currency fields
      const priceValue = typeof variant.price === 'string' 
        ? parseFloat(variant.price) 
        : (variant.price || 0);
      
      if (priceValue > 0) {
        setSellingPriceZMW(priceValue.toFixed(2));
        setSellingPriceUSD((priceValue / USD_TO_ZMW_RATE).toFixed(2));
      } else {
        // Calculate from base price if price not set
        const calculatedPrice = basePriceValue * (1 + 16 / 100);
        if (calculatedPrice > 0) {
          setSellingPriceZMW(calculatedPrice.toFixed(2));
          setSellingPriceUSD((calculatedPrice / USD_TO_ZMW_RATE).toFixed(2));
        } else {
          setSellingPriceZMW('');
          setSellingPriceUSD('');
        }
      }
    } else {
      // New variant - check if formData has basePrice
      const basePriceValue = typeof formData.basePrice === 'string' 
        ? parseFloat(formData.basePrice) 
        : (formData.basePrice || 0);
      
      if (basePriceValue > 0) {
        setBasePriceZMW(basePriceValue.toFixed(2));
        setBasePriceUSD((basePriceValue / USD_TO_ZMW_RATE).toFixed(2));
      } else {
        setBasePriceZMW('');
        setBasePriceUSD('');
      }
      
      // Initialize selling price currency fields
      const priceValue = typeof formData.price === 'string' 
        ? parseFloat(formData.price) 
        : (formData.price || 0);
      
      if (priceValue > 0) {
        setSellingPriceZMW(priceValue.toFixed(2));
        setSellingPriceUSD((priceValue / USD_TO_ZMW_RATE).toFixed(2));
      } else {
        // Calculate from base price if price not set
        const calculatedPrice = basePriceValue * (1 + 16 / 100);
        if (calculatedPrice > 0) {
          setSellingPriceZMW(calculatedPrice.toFixed(2));
          setSellingPriceUSD((calculatedPrice / USD_TO_ZMW_RATE).toFixed(2));
        } else {
          setSellingPriceZMW('');
          setSellingPriceUSD('');
        }
      }
    }
  }, [variant?.basePrice, variant?.price, variant?.id]); // Initialize when variant changes

  // Pre-populate form with product specs and pricing when creating new variant
  useEffect(() => {
    const fetchProductSpecs = async () => {
      if (variant) return // Don't pre-populate if editing existing variant
      
      try {
        const productResponse = await api.getProduct(productId)
        const product = productResponse.data
        
        if (product) {
          // Pre-populate pricing from product
          const productBasePrice = product.basePrice || 0;
          const productDiscountPercent = product.discountPercent || 0;
          
          // Calculate selling price from base price + VAT (always 16%)
          const calculatedSellingPrice = productBasePrice * (1 + 16 / 100);
          
          // Calculate discounted price from selling price - discount %
          const calculatedDiscountedPrice = calculatedSellingPrice * (1 - productDiscountPercent / 100);
          
          setFormData(prev => ({
            ...prev,
            basePrice: productBasePrice || prev.basePrice,
            taxRate: 16, // VAT is always 16%
            discountPercent: productDiscountPercent || prev.discountPercent,
            price: product.price || calculatedSellingPrice || prev.price,
            discountedPrice: product.discountedPrice || (calculatedDiscountedPrice > 0 ? calculatedDiscountedPrice : calculatedSellingPrice) || prev.discountedPrice,
          }));
          
          // Initialize currency fields from product base price
          if (productBasePrice > 0) {
            setBasePriceZMW(productBasePrice.toFixed(2));
            setBasePriceUSD((productBasePrice / USD_TO_ZMW_RATE).toFixed(2));
          }
        }
        
        // Pre-populate specs
        if (product?.specs && Object.keys(product.specs).length > 0) {
          // Pre-populate form with product specs and their values
          const initialSpecs: Record<string, string> = {}
          Object.entries(product.specs).forEach(([key, value]) => {
            // Convert value to string, handling different types
            if (value !== null && value !== undefined) {
              if (typeof value === 'string') {
                initialSpecs[key] = value
              } else if (typeof value === 'number') {
                initialSpecs[key] = String(value)
              } else if (Array.isArray(value)) {
                initialSpecs[key] = value.join(', ')
              } else if (typeof value === 'object') {
                // For nested objects, convert to JSON string or join values
                initialSpecs[key] = JSON.stringify(value)
              } else {
                initialSpecs[key] = String(value)
              }
            } else {
              initialSpecs[key] = ''
            }
          })
          
          if (Object.keys(formData.specs).length === 0) {
            setFormData(prev => ({
              ...prev,
              specs: initialSpecs
            }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch product specs:', error)
      }
    }
    
    fetchProductSpecs()
  }, [productId, variant])

  // Fetch all specification names from products for dropdown
  useEffect(() => {
    const fetchAllSpecNames = async () => {
      try {
        const response = await api.getProducts({ 
          pagination: { page: 1, pageSize: 1000 } // Get many products to collect spec names
        });
        const products = response.data || [];
        const specNamesSet = new Set<string>();
        
        products.forEach((product: any) => {
          if (product.specs && typeof product.specs === 'object') {
            Object.keys(product.specs).forEach(key => {
              if (key && key.trim()) {
                specNamesSet.add(key.trim());
              }
            });
          }
        });
        
        // Also add current variant's spec names
        if (formData.specs && typeof formData.specs === 'object') {
          Object.keys(formData.specs).forEach(key => {
            if (key && key.trim()) {
              specNamesSet.add(key.trim());
            }
          });
        }
        
        setAvailableSpecNames(Array.from(specNamesSet).sort());
      } catch (error) {
        console.error('Error fetching spec names:', error);
        // Fallback to current variant's specs
        if (formData.specs && typeof formData.specs === 'object') {
          setAvailableSpecNames(Object.keys(formData.specs).sort());
        } else {
          setAvailableSpecNames([]);
        }
      }
    };
    
    fetchAllSpecNames();
  }, [formData.specs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling that might cause page refresh
    
    if (!formData.sku.trim()) {
      toast.error('SKU is required')
      return
    }

    // Validate specs - backend requires at least one specification
    if (!formData.specs || Object.keys(formData.specs).length === 0) {
      toast.error('At least one specification (e.g., Size, Color) is required')
      return
    }

    try {
      setSaving(true)
      const submitData = {
        sku: formData.sku.trim(),
        attributes: formData.specs, // Map specs to attributes for backend API
        basePrice: formData.basePrice ? parseFloat(formData.basePrice.toString()) : undefined,
        taxRate: 16, // VAT is always 16%
        discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent.toString()) : undefined,
        price: formData.price ? parseFloat(formData.price.toString()) : undefined,
        discountedPrice: formData.discountedPrice ? parseFloat(formData.discountedPrice.toString()) : undefined,
        stockQuantity: parseInt(formData.stockQuantity.toString()) || 0,
        minStockLevel: parseInt(formData.minStockLevel.toString()) || 1,
        isActive: formData.isActive,
      }
      await onSave(submitData)
    } catch (error: any) {
      // Error handling - show user-friendly message
      console.error('Variant save error:', error)
      // Parent already shows error, but log it for debugging
      throw error // Re-throw so parent can handle it
    } finally {
      setSaving(false)
    }
  }

  const handleAddSpec = () => {
    const newKey = `spec_${Date.now()}`;
    setFormData({
      ...formData,
      specs: {
        ...formData.specs,
        [newKey]: '',
      },
    });
  }

  const handleSpecKeyChange = (oldKey: string, newKey: string) => {
    const newSpecs = { ...formData.specs };
    if (newKey && newKey.trim() !== '') {
      const value = newSpecs[oldKey] || '';
      delete newSpecs[oldKey];
      newSpecs[newKey.trim()] = value;
    } else {
      delete newSpecs[oldKey];
    }
    setFormData({ ...formData, specs: newSpecs });
  };

  const handleSpecValueChange = (key: string, value: string) => {
    setFormData({
      ...formData,
      specs: {
        ...formData.specs,
        [key]: value,
      },
    });
  };

  const handleRemoveSpec = (key: string) => {
    const newSpecs = { ...formData.specs }
    delete newSpecs[key]
    setFormData({ ...formData, specs: newSpecs })
  }

  // Handle SKU generation with uniqueness checking
  const handleGenerateSKU = async () => {
    if (!productName) {
      toast.error('Product name is required to generate SKU')
      return
    }

    // Check if we have at least one specification
    if (!formData.specs || Object.keys(formData.specs).length === 0) {
      toast.error('Please add at least one specification (e.g., Size, Color) before generating SKU')
      return
    }

    try {
      // Generate unique SKU with retry logic
      const generatedSKU = await generateUniqueVariantSKU(
        productName,
        formData.specs,
        async (sku: string) => {
          try {
            // If editing, exclude current variant's SKU from the check
            if (variant && sku === variant.sku) {
              return false
            }
            return await api.checkSKUExists(sku)
          } catch (error) {
            console.error('Error checking SKU:', error)
            return false // Allow generation if check fails
          }
        }
      )

      setFormData({ ...formData, sku: generatedSKU })
      toast.success('SKU generated successfully')
    } catch (error) {
      console.error('Error generating SKU:', error)
      // Fallback to simple generation if uniqueness check fails
      const fallbackSKU = generateVariantSKU(productName, formData.specs)
      setFormData({ ...formData, sku: fallbackSKU })
      toast.success('SKU generated (uniqueness check unavailable)')
    }
  }

  // Handle form submission - cannot use <form> because it's nested in parent form
  const handleFormSubmit = (e: React.FormEvent) => {
    handleSubmit(e)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <h4 className="font-semibold text-gray-900 mb-4">
        {variant ? 'Edit Variant' : 'Create New Variant'}
      </h4>

      <div className="space-y-4">
        <div>
          <label htmlFor="variant-sku" className="block text-sm font-medium text-gray-700 mb-2">
            SKU <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="variant-sku"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleFormSubmit(e as any)
                }
              }}
              required
              className="w-full px-3 py-2 pr-20 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Product SKU"
            />
            {productName && (
              <button
                type="button"
                onClick={handleGenerateSKU}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
                title="Generate SKU from product name and variant attributes"
              >
                Generate
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Specifications</label>
          <div className="space-y-2">
            {Object.entries(formData.specs).map(([key, value], index) => (
              <AttributeInput
                key={`spec-${index}-${key}`}
                attributeKey={key}
                attributeValue={String(value || '')}
                availableSpecNames={availableSpecNames}
                onKeyChange={(oldKey, newKey) => {
                  handleSpecKeyChange(oldKey, newKey);
                }}
                onValueChange={(specKey, newValue) => {
                  handleSpecValueChange(specKey, newValue);
                }}
                onRemove={(specKey) => {
                  handleRemoveSpec(specKey);
                }}
              />
            ))}
            <button
              type="button"
              onClick={handleAddSpec}
              className="flex items-center text-sm font-semibold mt-4 text-primary-600 hover:text-primary-500"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Specification
            </button>
          </div>
        </div>

        <div className="space-y-5 border-t border-gray-200 pt-4">
          <h4 className="text-lg font-bold text-gray-900 mb-4">Pricing And Stock</h4>
          
          {(() => {
            // Computed values
            const basePrice = parseFloat(formData.basePrice?.toString() || '0') || 0;
            const vatPercent = 16; // VAT is always 16%
            // Use actual price from formData or calculate from base price
            const priceValue = parseFloat(formData.price?.toString() || '0') || 0;
            const sellingPrice = priceValue > 0 ? priceValue : (basePrice * (1 + vatPercent / 100));
            const discountPercent = parseFloat(formData.discountPercent?.toString() || '0') || 0;
            const discountPrice = sellingPrice * (1 - discountPercent / 100);

            return (
              <div className="space-y-5">
                {/* Base Price - Dual Currency Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Price *</label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* USD Field */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">United States Dollar (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">$</span>
                  <input
                    type="number"
                        value={basePriceUSD}
                    onChange={(e) => {
                          const usdValue = e.target.value;
                          setBasePriceUSD(usdValue);
                          
                          if (usdValue === '' || usdValue === null || usdValue === undefined) {
                            setBasePriceZMW('');
                            setSellingPriceZMW('');
                            setSellingPriceUSD('');
                            setFormData(prev => ({
                              ...prev,
                              basePrice: '',
                              price: '',
                              discountedPrice: '',
                            }));
                            return;
                          }
                          
                          const usdNum = parseFloat(usdValue);
                          if (!isNaN(usdNum) && usdNum >= 0) {
                            // Convert USD to ZMW
                            const zmwValue = (usdNum * USD_TO_ZMW_RATE).toFixed(2);
                            setBasePriceZMW(zmwValue);
                            
                            // Update basePrice (stored in ZMW)
                            const basePriceValue = parseFloat(zmwValue);
                            const taxRateValue = 16; // VAT is always 16%
                            const newSellingPrice = basePriceValue * (1 + taxRateValue / 100);
                      const discountPercentValue = parseFloat(formData.discountPercent?.toString() || '0') || 0;
                      const newDiscountPrice = discountPercentValue > 0 
                        ? newSellingPrice * (1 - discountPercentValue / 100)
                        : newSellingPrice;
                      
                            // Update selling price currency fields
                            setSellingPriceZMW(newSellingPrice.toFixed(2));
                            setSellingPriceUSD((newSellingPrice / USD_TO_ZMW_RATE).toFixed(2));
                      
                      setFormData(prev => ({
                        ...prev,
                              basePrice: basePriceValue,
                        price: newSellingPrice.toFixed(2),
                        discountedPrice: newDiscountPrice.toFixed(2),
                      }));
                          }
                    }}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                      </div>
                </div>

                    {/* ZMW Field */}
                <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Zambian Kwacha (ZMW)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">K</span>
                  <input
                    type="number"
                        value={basePriceZMW}
                    onChange={(e) => {
                          const zmwValue = e.target.value;
                          setBasePriceZMW(zmwValue);
                          
                          if (zmwValue === '' || zmwValue === null || zmwValue === undefined) {
                            setBasePriceUSD('');
                            setSellingPriceZMW('');
                            setSellingPriceUSD('');
                            setFormData(prev => ({
                              ...prev,
                              basePrice: '',
                              price: '',
                              discountedPrice: '',
                            }));
                            return;
                          }
                          
                          const zmwNum = parseFloat(zmwValue);
                          if (!isNaN(zmwNum) && zmwNum >= 0) {
                            // Convert ZMW to USD
                            const usdValue = (zmwNum / USD_TO_ZMW_RATE).toFixed(2);
                            setBasePriceUSD(usdValue);
                            
                            // Update basePrice (stored in ZMW)
                            const taxRateValue = 16; // VAT is always 16%
                            const newSellingPrice = zmwNum * (1 + taxRateValue / 100);
                      const discountPercentValue = parseFloat(formData.discountPercent?.toString() || '0') || 0;
                      const newDiscountPrice = discountPercentValue > 0
                        ? newSellingPrice * (1 - discountPercentValue / 100)
                        : newSellingPrice;
                      
                            // Update selling price currency fields
                            setSellingPriceZMW(newSellingPrice.toFixed(2));
                            setSellingPriceUSD((newSellingPrice / USD_TO_ZMW_RATE).toFixed(2));
                      
                      setFormData(prev => ({
                        ...prev,
                              basePrice: zmwNum,
                        price: newSellingPrice.toFixed(2),
                        discountedPrice: newDiscountPrice.toFixed(2),
                      }));
                          }
                    }}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Exchange rate: 1 USD = {USD_TO_ZMW_RATE.toFixed(2)} ZMW</p>
                </div>

                {/* VAT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Value Added Tax (VAT) (%)</label>
                  <input
                    type="number"
                    value={16}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                    placeholder="16"
                  />
                  <p className="mt-1 text-xs text-gray-500">VAT is fixed at 16%</p>
                </div>

                {/* Selling Price - Dual Currency Fields (Read-Only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price</label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* USD Field */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">United States Dollar (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">$</span>
                        <input
                          type="text"
                          value={sellingPriceUSD || '0.00'}
                          readOnly
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    
                    {/* ZMW Field */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Zambian Kwacha (ZMW)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">K</span>
                        <input
                          type="text"
                          value={sellingPriceZMW || '0.00'}
                          readOnly
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Calculated from Base Price + VAT (16%). Exchange rate: 1 USD = {USD_TO_ZMW_RATE.toFixed(2)} ZMW</p>
                </div>

                {/* Discount Percent */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discount Percent (%)</label>
                  <input
                    type="number"
                    value={formData.discountPercent || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const basePriceValue = parseFloat(formData.basePrice?.toString() || '0') || 0;
                      const vatPercentValue = 16; // VAT is always 16%
                      const currentSellingPrice = basePriceValue * (1 + vatPercentValue / 100);
                      const newDiscountPrice = currentSellingPrice * (1 - value / 100);
                      
                      setFormData(prev => ({
                        ...prev,
                        discountPercent: value,
                        discountedPrice: newDiscountPrice.toFixed(2),
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>

                {/* Discount Price (computed) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discounted Price</label>
                  <input
                    type="text"
                    value={discountPrice > 0 ? discountPrice.toFixed(2) : '0.00'}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                    placeholder="Calculated automatically"
                  />
                  <p className="mt-1 text-xs text-gray-500">Calculated from Selling Price - Discount %</p>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
          <label htmlFor="variant-stock-quantity" className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
            <input
              type="number"
              min="0"
              id="variant-stock-quantity"
              value={formData.stockQuantity}
              onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
          <label htmlFor="variant-min-stock-level" className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
            <input
              type="number"
              min="1"
              id="variant-min-stock-level"
              value={formData.minStockLevel}
              onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="variant-is-active"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4 text-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] border-gray-300 rounded"
          />
          <label htmlFor="variant-is-active" className="ml-2 text-sm text-gray-700">
            Active
          </label>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={saving}
            className="px-4 py-2 bg-[var(--shreeji-primary)] text-white rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : variant ? 'Update Variant' : 'Create Variant'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}



