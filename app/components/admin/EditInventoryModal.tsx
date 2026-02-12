"use client";

import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, PlusIcon, MinusIcon, PhotoIcon } from '@heroicons/react/24/outline';
import api from '@/app/lib/admin/api';
import { normalizeImageUrl } from '@/app/lib/admin/image-mapping';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  documentId?: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  SKU?: string | null;
  stockQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  stockStatus: string;
  basePrice: number;
  weight: number;
  images?: Array<{ url: string; alt: string; isMain?: boolean }>;
}

interface EditInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: () => void;
  warehouseId?: number | null;
  warehouses?: Array<{ id: number; name: string }>;
  onTransfer?: (product: Product) => void;
}

export default function EditInventoryModal({
  isOpen,
  onClose,
  product,
  onSave,
  warehouseId,
  warehouses = [],
  onTransfer,
}: EditInventoryModalProps) {
  const [formData, setFormData] = useState({
    stockQuantity: 0,
    minStockLevel: 0,
    maxStockLevel: 0,
    stockStatus: 'in-stock',
    basePrice: 0,
    weight: 0,
    adjustmentType: 'INCREASE' as 'INCREASE' | 'DECREASE' | 'SET',
    adjustQuantity: 0,
    adjustNotes: '',
    adjustWarehouseId: null as number | null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState<number>(0);
  
  // Store original form data to detect unsaved changes
  const originalFormDataRef = useRef<typeof formData | null>(null);

  useEffect(() => {
    if (product && isOpen) {
      // Preselect warehouse: use provided warehouseId, or find "Shreeji House", or null
      let defaultWarehouseId = warehouseId ?? null;
      if (!defaultWarehouseId && warehouses.length > 0) {
        const shreejiHouse = warehouses.find(wh => 
          wh.name.toLowerCase().includes('shreeji house')
        );
        if (shreejiHouse) {
          defaultWarehouseId = shreejiHouse.id;
        }
      }

      setFormData({
        stockQuantity: product.stockQuantity || 0,
        minStockLevel: product.minStockLevel || 0,
        maxStockLevel: product.maxStockLevel || 0,
        stockStatus: product.stockStatus && product.stockStatus.trim() ? product.stockStatus : 'in-stock',
        basePrice: product.basePrice || 0,
        weight: product.weight || 0,
        adjustmentType: 'INCREASE',
        adjustQuantity: 0,
        adjustNotes: '',
        adjustWarehouseId: defaultWarehouseId,
      });
      setErrors({});
      
      // Store original form data for unsaved changes detection
      originalFormDataRef.current = JSON.parse(JSON.stringify({
        stockQuantity: product.stockQuantity || 0,
        minStockLevel: product.minStockLevel || 0,
        maxStockLevel: product.maxStockLevel || 0,
        stockStatus: product.stockStatus && product.stockStatus.trim() ? product.stockStatus : 'in-stock',
        basePrice: product.basePrice || 0,
        weight: product.weight || 0,
      }));
      
      // Find the main image index or default to 0
      if (product.images && product.images.length > 0) {
        const mainIndex = product.images.findIndex(img => img.isMain) ?? 0;
        setMainImageIndex(mainIndex >= 0 ? mainIndex : 0);
      } else {
        setMainImageIndex(0);
      }
    }
  }, [product, isOpen, warehouseId, warehouses]);

  const handleInputChange = (field: string, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleIncrement = (field: string, step: number = 1) => {
    const currentValue = formData[field as keyof typeof formData] as number;
    const newValue = currentValue + step;
    handleInputChange(field, Math.max(0, newValue));
  };

  const handleDecrement = (field: string, step: number = 1) => {
    const currentValue = formData[field as keyof typeof formData] as number;
    const newValue = currentValue - step;
    handleInputChange(field, Math.max(0, newValue));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.stockQuantity < 0) {
      newErrors.stockQuantity = 'Stock quantity cannot be negative';
    }

    if (formData.minStockLevel < 0) {
      newErrors.minStockLevel = 'Min stock level cannot be negative';
    }

    if (formData.maxStockLevel < 0) {
      newErrors.maxStockLevel = 'Max stock level cannot be negative';
    }

    if (formData.minStockLevel >= formData.maxStockLevel && formData.maxStockLevel > 0) {
      newErrors.minStockLevel = 'Min stock level must be less than max stock level';
    }

    if (formData.basePrice < 0) {
      newErrors.basePrice = 'Base price cannot be negative';
    }

    if (formData.weight < 0) {
      newErrors.weight = 'Weight cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = (): boolean => {
    if (!originalFormDataRef.current) {
      return false;
    }
    
    const original = originalFormDataRef.current;
    const current = formData;
    
    // Fields to compare (only persistent fields, not adjustment fields)
    const compareFields = [
      'stockQuantity',
      'minStockLevel',
      'maxStockLevel',
      'stockStatus',
      'basePrice',
      'weight'
    ];
    
    // Check each field
    for (const field of compareFields) {
      const originalValue = original[field as keyof typeof original];
      const currentValue = current[field as keyof typeof current];
      
      // Normalize values for comparison
      let normalizedOriginal = originalValue;
      let normalizedCurrent = currentValue;
      
      // For numeric fields, normalize to numbers
      if (['stockQuantity', 'minStockLevel', 'maxStockLevel', 'basePrice', 'weight'].includes(field)) {
        const origNum = typeof normalizedOriginal === 'string' ? parseFloat(normalizedOriginal) : Number(normalizedOriginal || 0);
        const currNum = typeof normalizedCurrent === 'string' ? parseFloat(normalizedCurrent) : Number(normalizedCurrent || 0);
        normalizedOriginal = isNaN(origNum) ? 0 : origNum;
        normalizedCurrent = isNaN(currNum) ? 0 : currNum;
      }
      
      // For string fields, normalize empty/null/undefined to empty string
      if (field === 'stockStatus') {
        normalizedOriginal = originalValue !== undefined && originalValue !== null ? String(originalValue) : '';
        normalizedCurrent = currentValue !== undefined && currentValue !== null ? String(currentValue) : '';
      }
      
      const isDifferent = normalizedOriginal !== normalizedCurrent;
      
      if (isDifferent) {
        return true;
      }
    }
    
    return false;
  };

  // Handle modal close with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges()) {
      if (confirm('You have unsaved changes. Are you sure you want to close? All unsaved changes will be lost.')) {
        originalFormDataRef.current = null;
        onClose();
      }
    } else {
      originalFormDataRef.current = null;
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !product) {
      return;
    }

    setLoading(true);
    try {
      // Calculate stock status if not explicitly set
      let calculatedStockStatus = formData.stockStatus;
      if (formData.stockQuantity === 0) {
        calculatedStockStatus = 'out-of-stock';
      } else if (formData.stockQuantity <= formData.minStockLevel) {
        calculatedStockStatus = 'low-stock';
      } else if (calculatedStockStatus === 'out-of-stock' && formData.stockQuantity > 0) {
        calculatedStockStatus = 'in-stock';
      }

      // Update product inventory fields
      // Note: stockStatus is calculated automatically by backend based on stockQuantity and minStockLevel
      const updatePayload = {
        stockQuantity: Number(formData.stockQuantity) || 0,
        minStockLevel: Number(formData.minStockLevel) || 0,
        maxStockLevel: Number(formData.maxStockLevel) || 0,
        basePrice: Number(formData.basePrice) || 0,
        weight: Number(formData.weight) || 0,
      };
      
      console.log('[EditInventoryModal] Sending update payload:', updatePayload);
      
      await api.updateProduct(product.id, updatePayload);

      // If adjustment fields are filled, also perform stock adjustment
      if (formData.adjustQuantity > 0 && formData.adjustWarehouseId) {
        try {
          await api.adjustStock({
            productId: product.id,
            warehouseId: formData.adjustWarehouseId,
            adjustmentType: formData.adjustmentType,
            quantity: formData.adjustQuantity,
            notes: formData.adjustNotes || undefined,
          });
          toast.success('Inventory updated and stock adjusted successfully');
        } catch (adjustError: any) {
          // If adjustment fails, still show success for inventory update
          console.error('Error adjusting stock:', adjustError);
          toast.error(`Inventory updated but stock adjustment failed: ${adjustError.message || 'Unknown error'}`);
        }
      } else {
        toast.success('Inventory updated successfully');
      }

      // Clear ref after successful save
      originalFormDataRef.current = null;
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error updating inventory:', error);
      toast.error(error.message || 'Failed to update inventory. Please try again.');
      setErrors({
        submit: error.message || 'Failed to update inventory. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get the main image URL and display images
  const mainImageUrl = product?.images?.[mainImageIndex]?.url || (product?.images && product.images.length > 0 ? product.images[0]?.url : null);
  const displayImages = product?.images?.slice(0, 4) || []; // Show max 4 thumbnails

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-[0.93]" style={{ marginTop: '0' }} onClick={handleClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-[95%] md:w-[85%] lg:w-[90%] h-[95%] md:h-[85%] flex flex-col md:flex-row relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-[whitesmoke] text-black hover:bg-gray-200"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Left Column - Images with gradient background */}
        <div 
          className="flex-2 min-w-[42%] h-full px-8 md:px-16 flex items-center justify-center py-20 md:py-0 relative"
          style={{
            background: 'radial-gradient(#a78d55, #87703f, #87703f, #68542c)'
          }}
        >
          <div className="space-y-6 w-full max-w-md h-full">
            {/* Image Card */}
            <div className="rounded-lg shadow-sm p-6 h-full">
              {/* Main Product Image */}
              <div className="mb-4 h-[80%] flex items-center justify-center">
                {mainImageUrl ? (
                  <div className="relative w-full rounded-lg overflow-hidden group">
                    <img
                      src={mainImageUrl}
                      alt={product.images?.[mainImageIndex]?.alt || product.name || "Product image"}
                      className="w-full h-full object-contain min-h-[15rem]"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=No+Image';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">No image available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Image Thumbnails */}
              <div className={`grid gap-2 h-[20%] ${
                displayImages.length === 1 ? 'grid-cols-1' :
                displayImages.length === 2 ? 'grid-cols-2' :
                displayImages.length === 3 ? 'grid-cols-3' :
                displayImages.length === 4 ? 'grid-cols-4' :
                displayImages.length === 5 ? 'grid-cols-5' :
                displayImages.length === 6 ? 'grid-cols-6' :
                displayImages.length === 7 ? 'grid-cols-7' :
                displayImages.length === 8 ? 'grid-cols-8' :
                displayImages.length === 9 ? 'grid-cols-9' :
                'grid-cols-10'

              }`} style={{ gridTemplateColumns: `repeat(${displayImages.length}, 1fr)` }}>
                {displayImages.map((image, index) => (
                  <div
                    key={index}
                    onClick={() => setMainImageIndex(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      index === mainImageIndex
                        ? 'border-primary-500 ring-2 ring-primary-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {image.url ? (
                      <img
                        src={normalizeImageUrl(image.url)}
                        alt={image.alt || `Thumbnail ${index + 1}`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/100x100?text=Error';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <PhotoIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Form with scrolling */}
        <div className="md:overflow-auto flex-1 p-8">

          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-3xl font-semibold text-center mb-6">
              Adjust Inventory
            </h2>
            
            {errors.submit && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{errors.submit}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Product Information Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Product Information</h4>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Name:</span> {product.name}
                  </p>
                  {product.SKU && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">SKU:</span> {product.SKU}
                    </p>
                  )}
                  {product.brand && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Brand:</span> {product.brand}
                    </p>
                  )}
                  {product.category && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Category:</span> {product.category}
                    </p>
                  )}
                </div>
              </div>

              {/* Stock Adjustment Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">Stock Adjustment</h4>
                    <p className="text-xs text-gray-500 mt-1">Adjust quantity and record a reason.</p>
                  </div>
                  {onTransfer && (
                    <button
                      type="button"
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      onClick={() => onTransfer(product)}
                    >
                      Transfer Stock
                    </button>
                  )}
                </div>

                {/* Adjustment Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['INCREASE', 'DECREASE', 'SET'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleInputChange('adjustmentType', type)}
                        className={`px-4 py-2 text-sm font-medium rounded-md border transition ${
                          formData.adjustmentType === type
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {type === 'INCREASE' ? 'Increase' : type === 'DECREASE' ? 'Decrease' : 'Set Exact'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Adjustment Quantity */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adjustment Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.adjustQuantity}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      handleInputChange('adjustQuantity', value);
                      if (errors.adjustQuantity) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.adjustQuantity;
                          return next;
                        });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {errors.adjustQuantity && (
                    <p className="mt-1 text-sm text-red-600">{errors.adjustQuantity}</p>
                  )}
                </div>

                {/* Warehouse Selection */}
                {warehouses.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warehouse
                    </label>
                    <select
                      value={formData.adjustWarehouseId || ''}
                      onChange={(e) =>
                        handleInputChange('adjustWarehouseId', e.target.value ? parseInt(e.target.value, 10) : null)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={3}
                    value={formData.adjustNotes}
                    onChange={(e) => handleInputChange('adjustNotes', e.target.value)}
                    placeholder="Optional notes for this adjustment"
                  />
                </div>
              </div>

              {/* Stock Status Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Stock Status</h4>
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">
                    Current Status
                  </span>
                  <div className="inline-flex flex-wrap gap-2 rounded-full bg-gray-50 p-1">
                    {[
                      { value: 'in-stock', label: 'In Stock' },
                      { value: 'low-stock', label: 'Low Stock' },
                      { value: 'out-of-stock', label: 'Out of Stock' },
                      { value: 'discontinued', label: 'Discontinued' },
                    ].map((option) => {
                      const isActive = formData.stockStatus === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleInputChange('stockStatus', option.value)}
                          className={`relative px-4 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                            isActive
                              ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Status will auto-update based on stock quantity if not manually set
                  </p>
                </div>
              </div>

              {/* Stock Levels Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Stock Levels</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stock Quantity */}
                <div>
                <label
                  htmlFor="stockQuantity"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Stock Quantity <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecrement('stockQuantity', 1)}
                    className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-center transition-colors"
                  >
                    <MinusIcon className="h-5 w-5 text-gray-600" />
                  </button>
                  <input
                    type="number"
                    id="stockQuantity"
                    name="stockQuantity"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) =>
                      handleInputChange('stockQuantity', parseInt(e.target.value) || 0)
                    }
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-center ${
                      errors.stockQuantity ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleIncrement('stockQuantity', 1)}
                    className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-center transition-colors"
                  >
                    <PlusIcon className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
                {errors.stockQuantity && (
                  <p className="mt-1 text-sm text-red-600">{errors.stockQuantity}</p>
                )}
              </div>

              {/* Min Stock Level */}
              <div>
                <label
                  htmlFor="minStockLevel"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Minimum Stock Level
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecrement('minStockLevel', 1)}
                    className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-center transition-colors"
                  >
                    <MinusIcon className="h-5 w-5 text-gray-600" />
                  </button>
                  <input
                    type="number"
                    id="minStockLevel"
                    name="minStockLevel"
                    min="0"
                    value={formData.minStockLevel}
                    onChange={(e) =>
                      handleInputChange('minStockLevel', parseInt(e.target.value) || 0)
                    }
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-center ${
                      errors.minStockLevel ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleIncrement('minStockLevel', 1)}
                    className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-center transition-colors"
                  >
                    <PlusIcon className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
                {errors.minStockLevel && (
                  <p className="mt-1 text-sm text-red-600">{errors.minStockLevel}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Alert when stock falls below this level
                </p>
              </div>

              {/* Max Stock Level */}
              <div>
                <label
                  htmlFor="maxStockLevel"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Maximum Stock Level
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecrement('maxStockLevel', 1)}
                    className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-center transition-colors"
                  >
                    <MinusIcon className="h-5 w-5 text-gray-600" />
                  </button>
                  <input
                    type="number"
                    id="maxStockLevel"
                    name="maxStockLevel"
                    min="0"
                    value={formData.maxStockLevel}
                    onChange={(e) =>
                      handleInputChange('maxStockLevel', parseInt(e.target.value) || 0)
                    }
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-center ${
                      errors.maxStockLevel ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleIncrement('maxStockLevel', 1)}
                    className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-center transition-colors"
                  >
                    <PlusIcon className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
                {errors.maxStockLevel && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxStockLevel}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Maximum capacity for this product
                </p>
              </div>
                </div>
              </div>

              {/* Cost & Weight Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Cost & Weight</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Base Price */}
              <div>
                <label
                  htmlFor="basePrice"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Base Price (K)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecrement('basePrice', 1)}
                    className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-center transition-colors"
                  >
                    <MinusIcon className="h-5 w-5 text-gray-600" />
                  </button>
                  <input
                    type="number"
                    id="basePrice"
                    name="basePrice"
                    min="0"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) =>
                      handleInputChange('basePrice', parseFloat(e.target.value) || 0)
                    }
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-center ${
                      errors.basePrice ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleIncrement('basePrice', 1)}
                    className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-center transition-colors"
                  >
                    <PlusIcon className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
                {errors.basePrice && (
                  <p className="mt-1 text-sm text-red-600">{errors.basePrice}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Base price per unit for inventory valuation
                </p>
              </div>

              {/* Weight */}
              <div>
                <label
                  htmlFor="weight"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Weight (kg)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecrement('weight', 0.1)}
                    className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-center transition-colors"
                  >
                    <MinusIcon className="h-5 w-5 text-gray-600" />
                  </button>
                  <input
                    type="number"
                    id="weight"
                    name="weight"
                    min="0"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) =>
                      handleInputChange('weight', parseFloat(e.target.value) || 0)
                    }
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-center ${
                      errors.weight ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleIncrement('weight', 0.1)}
                    className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-center transition-colors"
                  >
                    <PlusIcon className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
                {errors.weight && (
                  <p className="mt-1 text-sm text-red-600">{errors.weight}</p>
                )}
              </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-20 mt-6 flex justify-end">
              <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl p-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2 disabled:opacity-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary-500/40 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

