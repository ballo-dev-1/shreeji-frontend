"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { 
  XMarkIcon,
  PhotoIcon,
  TrashIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  PencilIcon,
  ChevronDownIcon,
  CloudArrowUpIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { processProductImages } from '@/app/lib/admin/image-mapping';
import api from '@/app/lib/admin/api';
import ProductDetails from '@/components/products/product details';
import '@/components/products/product details/style.scss';
import { CartProvider } from '@/app/contexts/CartContext';
import { ClientAuthProvider } from '@/app/contexts/ClientAuthContext';
import ProductVariantsManager from './ProductVariantsManager';
import ProductSEOEditor from './ProductSEOEditor';
import toast from 'react-hot-toast';
import { generateSKU, generateUniqueSKU } from '@/utils/sku-generator';

interface Product {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  category: string | number; // Can be category ID (number) or legacy string
  subcategory?: string | number | null; // Can be subcategory ID (number) or legacy string, optional
  brand: string | number; // Can be brand ID (number) or legacy string
  price: string;
  discountedPrice?: string;
  tagline?: string;
  description?: string;
  specs?: any;
  images: Array<{ url: string; alt: string; isMain?: boolean }>;
  isActive: boolean;
  SKU?: string;
  stockQuantity?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  stockStatus?: string;
  basePrice?: number;
  taxRate?: number;
  discountPercent?: number;
  weight?: number;
  Dimensions?: any;
  color?: string;
  condition?: string;
  warrantyPeriod?: string;
  attributes?: Record<string, { value: string; type: 'text' | 'dropdown'; options?: string[]; hidden?: boolean }>;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImage?: string;
  schemaMarkup?: Record<string, any>;
}

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSave?: (updatedProduct: Product) => void;
  onDelete?: (id: number) => Promise<void>;
  onSuccess?: () => void;
}

interface Category {
  id: number | string;
  documentId?: string;
  name: string;
  slug?: string;
}

interface Subcategory {
  id: number | string;
  documentId?: string;
  name: string;
  slug?: string;
  category: number | Category | string;
}

interface Brand {
  id: number | string;
  documentId?: string;
  name: string;
  logo?: { url: string; id: number } | null;
  logoUrl?: string | null;
}

// Component to handle spec input with searchable dropdown for spec name
function SpecInput({ 
  specKey, 
  specValue, 
  availableSpecNames,
  onKeyChange, 
  onValueChange,
  onRemove
}: { 
  specKey: string; 
  specValue: any; 
  availableSpecNames: string[];
  onKeyChange: (oldKey: string, newKey: string) => void;
  onValueChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
}) {
  // Check if specKey is a temporary generated key (spec_ followed by numbers)
  // If so, show empty string instead of the temporary key
  const isTempKey = specKey.startsWith('spec_') && /^spec_\d+$/.test(specKey);
  const initialQuery = isTempKey ? '' : (specKey || '');
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update query when specKey changes externally
  useEffect(() => {
    if (inputRef.current !== document.activeElement) {
      // Check if specKey is a temporary generated key - if so, show empty string
      const isTempKeyInEffect = specKey.startsWith('spec_') && /^spec_\d+$/.test(specKey);
      const queryValue = isTempKeyInEffect ? '' : (specKey || '');
      setQuery(queryValue);
    }
  }, [specKey]);

  // Filter available specs based on query
  const filteredSpecs = availableSpecNames.filter((name) =>
    name.toLowerCase().includes(query.toLowerCase())
  );

  // Check if current specKey is in available list
  const isCustomSpec = specKey && !availableSpecNames.includes(specKey);
  
  // Show "Add new" option if query doesn't match any existing spec and query is not empty
  const showAddNew = query.trim() !== '' && 
                     !availableSpecNames.some(name => name.toLowerCase() === query.toLowerCase().trim()) &&
                     (!specKey || query.toLowerCase().trim() !== specKey.toLowerCase());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
  };

  const handleSelect = (value: string) => {
    if (value && value.trim() !== '') {
      onKeyChange(specKey, value.trim());
      setQuery(value.trim());
      setIsOpen(false);
    }
  };

  const handleAddNew = () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      onKeyChange(specKey, trimmedQuery);
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
        // If query doesn't match specKey, update it
        if (query.trim() !== specKey && query.trim() !== '') {
          handleAddNew();
        } else if (query.trim() === '') {
          setQuery(specKey || '');
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
      setQuery(specKey || '');
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
            as={React.Fragment}
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
                    specKey === name
                      ? 'bg-primary-600 text-white font-medium'
                      : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="block truncate">{name}</span>
                  {specKey === name && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white">
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </div>
              ))}
              {isCustomSpec && specKey && !filteredSpecs.includes(specKey) && (
                <div
                  onClick={() => handleSelect(specKey)}
                  className={`relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    'bg-primary-600 text-white font-medium'
                  }`}
                >
                  <span className="block truncate">{specKey} (custom)</span>
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
        value={String(specValue || '')}
        onChange={(e) => onValueChange(specKey, e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        placeholder="Spec value"
      />
      <button
        type="button"
        onClick={() => onRemove(specKey)}
        className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        title="Remove specification"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

// Component to handle dynamic attribute input with text/dropdown support
function AttributeInput({ 
  attributeKey, 
  attributeData,
  availableAttributeNames,
  onKeyChange, 
  onValueChange,
  onTypeChange,
  onOptionsChange,
  onHiddenChange,
  onRemove
}: { 
  attributeKey: string; 
  attributeData: { value: string; type: 'text' | 'dropdown'; options?: string[]; hidden?: boolean };
  availableAttributeNames: string[];
  onKeyChange: (oldKey: string, newKey: string) => void;
  onValueChange: (key: string, value: string) => void;
  onTypeChange: (key: string, type: 'text' | 'dropdown') => void;
  onOptionsChange: (key: string, options: string[]) => void;
  onHiddenChange?: (key: string, hidden: boolean) => void;
  onRemove: (key: string) => void;
}) {
  const [query, setQuery] = useState(attributeKey || '');
  const [isOpen, setIsOpen] = useState(false);
  const [showOptionsEditor, setShowOptionsEditor] = useState(false);
  const [newOption, setNewOption] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update query when attributeKey changes externally
  useEffect(() => {
    if (inputRef.current !== document.activeElement) {
      setQuery(attributeKey || '');
    }
  }, [attributeKey]);

  // Filter available attributes based on query
  const filteredAttributes = availableAttributeNames.filter((name) =>
    name.toLowerCase().includes(query.toLowerCase())
  );

  // Check if current attributeKey is in available list
  const isCustomAttribute = attributeKey && !availableAttributeNames.includes(attributeKey);
  
  // Show "Add new" option if query doesn't match any existing attribute and query is not empty
  const showAddNew = query.trim() !== '' && 
                     !availableAttributeNames.some(name => name.toLowerCase() === query.toLowerCase().trim()) &&
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
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
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

  const handleAddOption = () => {
    if (newOption.trim() && !attributeData.options?.includes(newOption.trim())) {
      onOptionsChange(attributeKey, [...(attributeData.options || []), newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (option: string) => {
    onOptionsChange(attributeKey, (attributeData.options || []).filter(opt => opt !== option));
  };

  return (
    <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex gap-2 items-start">
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
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Search or add attribute name"
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
              as={React.Fragment}
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
                    Start typing to search or add a new attribute
                  </div>
                )}
                {filteredAttributes.length === 0 && query !== '' && !showAddNew && (
                  <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                    No attributes found.
                  </div>
                )}
                {filteredAttributes.map((name) => (
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
                {isCustomAttribute && attributeKey && !filteredAttributes.includes(attributeKey) && (
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
        {onHiddenChange && (
          <button
            type="button"
            onClick={() => onHiddenChange(attributeKey, !attributeData.hidden)}
            className={`px-3 py-2 rounded-lg transition-colors ${
              attributeData.hidden 
                ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100' 
                : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
            }`}
            title={attributeData.hidden ? 'Show attribute' : 'Hide attribute'}
          >
            {attributeData.hidden ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(attributeKey)}
          className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove attribute"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Type Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Type:</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onTypeChange(attributeKey, 'text')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              attributeData.type === 'text'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => onTypeChange(attributeKey, 'dropdown')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              attributeData.type === 'dropdown'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Dropdown
          </button>
        </div>
      </div>

      {/* Value Input */}
      {attributeData.type === 'text' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
          <input
            type="text"
            value={attributeData.value || ''}
            onChange={(e) => onValueChange(attributeKey, e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter value"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
          <select
            value={attributeData.value || ''}
            onChange={(e) => onValueChange(attributeKey, e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 5%22><path fill=%22%23666%22 d=%22M2 0L0 2h4zm0 5L0 3h4z%22/></svg>')] bg-no-repeat bg-right bg-[length:12px] pr-10"
          >
            <option value="">Select value</option>
            {(attributeData.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          
          {/* Options Editor */}
          <div className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Dropdown Options</label>
              <button
                type="button"
                onClick={() => setShowOptionsEditor(!showOptionsEditor)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {showOptionsEditor ? 'Hide' : 'Edit Options'}
              </button>
            </div>
            {showOptionsEditor && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Add new option"
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {(attributeData.options || []).map((option) => (
                    <div key={option} className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{option}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(option)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {(!attributeData.options || attributeData.options.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-2">No options added yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditProductModal({ isOpen, onClose, product, onSave, onDelete, onSuccess }: EditProductModalProps) {
  // Determine if we're in edit mode (product provided) or create mode (no product)
  const isEditMode = !!product;
  
  const [formData, setFormData] = useState<Product>({
    id: 0,
    name: '',
    slug: '',
    category: '',
    subcategory: '',
    brand: '',
    price: '',
    discountedPrice: '0',
    tagline: '',
    description: '',
    specs: {},
    images: [],
    isActive: true,
    SKU: '',
    stockQuantity: 0,
    minStockLevel: 5,
    maxStockLevel: 100,
    stockStatus: 'in-stock',
    basePrice: 0,
    taxRate: 16, // Default VAT 16%
    discountPercent: 0,
    weight: 0,
    Dimensions: { length: 0, width: 0, height: 0, unit: 'cm' },
    color: '',
    condition: '',
    warrantyPeriod: '',
    attributes: {},
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    ogImage: '',
    schemaMarkup: undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState<number>(0);
  
  // Image upload/URL modal states
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [imageUploadMode, setImageUploadMode] = useState<'upload' | 'url' | null>(null);
  const [pastedImageUrl, setPastedImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track last toast to prevent duplicates
  const lastToastRef = useRef<{ id: string; message: string } | null>(null);
  
  // Store original product data to detect unsaved changes
  const originalProductRef = useRef<Product | null>(null);
  
  // Helper function to show toast without duplicates
  const showToast = (type: 'success' | 'error', message: string, options?: { duration?: number }) => {
    // If the message matches the last toast, dismiss it first
    if (lastToastRef.current && lastToastRef.current.message === message) {
      toast.dismiss(lastToastRef.current.id);
    }
    
    // Show new toast and track it
    const toastId = type === 'success' 
      ? toast.success(message, options)
      : toast.error(message, options);
    
    lastToastRef.current = { id: toastId, message };
  };
  
  // Modal states for adding/editing category/brand/subcategory
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showAddSubcategoryModal, setShowAddSubcategoryModal] = useState(false);
  const [showEditSubcategoryModal, setShowEditSubcategoryModal] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [showHiddenAttributes, setShowHiddenAttributes] = useState(false);
  const [showEditBrandModal, setShowEditBrandModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [newBrandName, setNewBrandName] = useState('');
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Categories and subcategories fetched from API
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  
  // Available specification names for dropdown
  const [availableSpecNames, setAvailableSpecNames] = useState<string[]>([]);
  
  // Available attribute names for dropdown
  const [availableAttributeNames, setAvailableAttributeNames] = useState<string[]>([]);

  const stockStatuses = [
    { value: 'in-stock', label: 'In Stock' },
    { value: 'low-stock', label: 'Low Stock' },
    { value: 'out-of-stock', label: 'Out of Stock' },
    { value: 'discontinued', label: 'Discontinued' }
  ];

  const generateSlug = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  useEffect(() => {
    if (isOpen) {
      if (product) {
        // Edit mode: populate form with product data
      console.log('EditProductModal - Product received:', product);
      console.log('EditProductModal - basePrice:', (product as any).basePrice);
      console.log('EditProductModal - costPrice:', (product as any).costPrice);
      console.log('EditProductModal - Full product keys:', Object.keys(product));
      
      const processedImages = processProductImages(product);

      // Handle brand - if it's an object (relation), extract the ID
      let brandValue: string | number = product.brand;
      if (product.brand && typeof product.brand === 'object') {
        // Brand is a relation object, extract ID
        brandValue = (product.brand as any).id || (product.brand as any).data?.id || '';
      } else if (typeof product.brand === 'number') {
        // Brand is already an ID
        brandValue = product.brand;
      }

      // Handle category - if it's an object (relation), extract the ID
      let categoryValue: string | number = product.category;
      if (product.category && typeof product.category === 'object') {
        // Category is a relation object, extract ID
        categoryValue = (product.category as any).id || (product.category as any).data?.id || '';
      } else if (typeof product.category === 'number') {
        // Category is already an ID
        categoryValue = product.category;
      }

      // Handle subcategory - if it's an object (relation), extract the ID
      let subcategoryValue: string | number | undefined = product.subcategory;
      if (product.subcategory && typeof product.subcategory === 'object') {
        // Subcategory is a relation object, extract ID
        subcategoryValue = (product.subcategory as any).id || (product.subcategory as any).data?.id || '';
      } else if (typeof product.subcategory === 'number') {
        // Subcategory is already an ID
        subcategoryValue = product.subcategory;
      }

      // Calculate discount percent from existing prices
      // Check for both price and sellingPrice (API might use either)
      const priceValue = (product as any).price ?? (product as any).sellingPrice ?? 0;
      const sellingPrice = parseFloat(String(priceValue).replace(/[^0-9.]/g, ''));
      const discountPrice = product.discountedPrice ? parseFloat(String(product.discountedPrice).replace(/[^0-9.]/g, '')) : 0;
      const calculatedDiscountPercent = sellingPrice > 0 && discountPrice > 0 
        ? ((sellingPrice - discountPrice) / sellingPrice) * 100 
        : 0;

      // Get taxRate from product if available, or calculate from basePrice and sellingPrice
      let taxRateValue = (product as any).taxRate || 16;
      if (!taxRateValue && (product as any).basePrice && sellingPrice > 0) {
        const basePrice = (product as any).basePrice || 0;
        if (basePrice > 0) {
          taxRateValue = ((sellingPrice - basePrice) / basePrice) * 100;
        }
      }

      // Handle dimensions - check both cases
      const dimensionsValue = (product as any).Dimensions ?? (product as any).dimensions ?? { length: 0, width: 0, height: 0, unit: 'cm' };

      // Destructure to exclude sellingPrice if it exists (we'll use price instead)
      const { sellingPrice: _, ...productWithoutSellingPrice } = product as any;
      
      const initialFormData = {
        ...productWithoutSellingPrice,
        // Map sellingPrice to price if needed
        price: priceValue,
        brand: brandValue,
        category: categoryValue,
        subcategory: subcategoryValue,
        specs: product.specs || {},
        Dimensions: dimensionsValue,
        SKU: (product as any).SKU ?? (product as any).sku ?? `SKU-${Date.now()}`,
        stockQuantity: product.stockQuantity || 0,
        basePrice: (() => {
          // Try multiple possible locations for basePrice
          const basePriceValue = (product as any).basePrice ?? 
                                (product as any).costPrice ?? 
                                (product as any).data?.basePrice ?? 
                                (product as any).data?.costPrice ??
                                (product as any).attributes?.basePrice ??
                                (product as any).attributes?.costPrice;
          
          // Convert to number, handling string values
          if (basePriceValue !== undefined && basePriceValue !== null) {
            const numValue = typeof basePriceValue === 'string' 
              ? parseFloat(basePriceValue.replace(/[^0-9.]/g, '')) 
              : Number(basePriceValue);
            const result = isNaN(numValue) ? 0 : numValue;
            console.log('EditProductModal - Extracted basePrice:', result, 'from value:', basePriceValue);
            return result;
          }
          console.log('EditProductModal - No basePrice found, defaulting to 0');
          return 0;
        })(),
        images: processedImages,
        discountedPrice: product.discountedPrice !== undefined && product.discountedPrice !== null 
          ? String(product.discountedPrice) 
          : '0',
        taxRate: taxRateValue,
        discountPercent: calculatedDiscountPercent,
        color: (product as any).color || '',
        condition: (product as any).condition || '',
        warrantyPeriod: (product as any).warrantyPeriod || '',
        attributes: (product as any).attributes || {},
        metaTitle: (product as any).metaTitle || '',
        metaDescription: (product as any).metaDescription || '',
        metaKeywords: (product as any).metaKeywords || '',
        ogImage: (product as any).ogImage || '',
        schemaMarkup: (product as any).schemaMarkup || undefined,
      };

        setFormData(initialFormData);
        // Store original product data for comparison
        originalProductRef.current = JSON.parse(JSON.stringify(initialFormData));
        setErrors({});
        // Find the main image index or default to 0
        const mainIndex = processedImages.findIndex(img => img.isMain) ?? 0;
        setMainImageIndex(mainIndex >= 0 ? mainIndex : 0);
      } else {
        // Create mode: reset form to default empty values
        const defaultFormData: Product = {
          id: 0,
          name: '',
          slug: '',
          category: '',
          subcategory: '',
          brand: '',
          price: '',
          discountedPrice: '0',
          tagline: '',
          description: '',
          specs: {},
          images: [],
          isActive: true,
          SKU: '',
          stockQuantity: 0,
          minStockLevel: 5,
          maxStockLevel: 100,
          stockStatus: 'in-stock',
          basePrice: 0,
          taxRate: 16, // Default VAT 16%
          discountPercent: 0,
          weight: 0,
          Dimensions: { length: 0, width: 0, height: 0, unit: 'cm' },
          color: '',
          condition: '',
          warrantyPeriod: '',
          attributes: {},
          metaTitle: '',
          metaDescription: '',
          metaKeywords: '',
          ogImage: '',
          schemaMarkup: undefined
        };
        setFormData(defaultFormData);
        originalProductRef.current = null;
        setErrors({});
        setMainImageIndex(0);
      }
    }
  }, [product, isOpen]);

  // Fetch brands from API on component mount
  useEffect(() => {
    const fetchBrands = async () => {
      setLoadingBrands(true);
      try {
        const response = await api.getBrands({ populate: ['logo'] });
        const brandsData = response.data.map((brand: any) => {
          const brandData = brand.attributes || brand;
          return {
            id: brand.id || brand.documentId,
            documentId: brand.documentId,
            name: brandData.name || '',
            logo: brandData.logo?.data
              ? {
                  url: brandData.logo.data.attributes?.url || brandData.logo.data.url,
                  id: brandData.logo.data?.id,
                }
              : null,
            logoUrl: brandData.logoUrl || null,
          };
        });
        setBrands(brandsData);
      } catch (error) {
        console.error('Error fetching brands:', error);
        // Fallback to empty array
        setBrands([]);
      } finally {
        setLoadingBrands(false);
      }
    };

    if (isOpen) {
      fetchBrands();
    }
  }, [isOpen]);

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
        
        // Also add current product's spec names
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
        // Fallback to current product's specs
        if (formData.specs && typeof formData.specs === 'object') {
          setAvailableSpecNames(Object.keys(formData.specs).sort());
        } else {
          setAvailableSpecNames([]);
        }
      }
    };
    
    if (isOpen) {
      fetchAllSpecNames();
    }
  }, [isOpen, formData.specs]);

  // Fetch all attribute names from products for dropdown
  useEffect(() => {
    const fetchAllAttributeNames = async () => {
      try {
        const response = await api.getProducts({ 
          pagination: { page: 1, pageSize: 1000 } // Get many products to collect attribute names
        });
        const products = response.data || [];
        const attributeNamesSet = new Set<string>();
        
        products.forEach((product: any) => {
          if (product.attributes && typeof product.attributes === 'object') {
            Object.keys(product.attributes).forEach(key => {
              if (key && key.trim()) {
                attributeNamesSet.add(key.trim());
              }
            });
          }
        });
        
        // Also add current product's attribute names
        if (formData.attributes && typeof formData.attributes === 'object') {
          Object.keys(formData.attributes).forEach(key => {
            if (key && key.trim()) {
              attributeNamesSet.add(key.trim());
            }
          });
        }
        
        setAvailableAttributeNames(Array.from(attributeNamesSet).sort());
      } catch (error) {
        console.error('Error fetching attribute names:', error);
        // Fallback to current product's attributes
        if (formData.attributes && typeof formData.attributes === 'object') {
          setAvailableAttributeNames(Object.keys(formData.attributes).sort());
        } else {
          setAvailableAttributeNames([]);
        }
      }
    };
    
    if (isOpen) {
      fetchAllAttributeNames();
    }
  }, [isOpen, formData.attributes]);

  // When brands are loaded, map any existing brand names to their IDs so the select can prefill
  useEffect(() => {
    if (!isOpen || !product || brands.length === 0) {
      return;
    }

    setFormData((prev) => {
      if (!prev.brand) {
        return prev;
      }

      const currentValue =
        typeof prev.brand === 'number' ? prev.brand.toString() : prev.brand;
      if (!currentValue.trim()) {
        return prev;
      }

      const alreadyMatches = brands.some(
        (brand) =>
          brand.id?.toString() === currentValue ||
          brand.documentId?.toString() === currentValue,
      );
      if (alreadyMatches) {
        return prev;
      }

      const matchedBrand = brands.find(
        (brand) => brand.name?.toLowerCase() === currentValue.toLowerCase(),
      );

      if (!matchedBrand) {
        return prev;
      }

      const normalizedValue =
        matchedBrand.id?.toString() ??
        matchedBrand.documentId?.toString() ??
        currentValue;

      if (!normalizedValue || normalizedValue === currentValue) {
        return prev;
      }

      return { ...prev, brand: normalizedValue };
    });
  }, [brands, isOpen, product]);

  // Fetch categories by extracting unique categories from existing products
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        // Fetch products to extract unique categories
        const response = await api.getProducts({
          pagination: { page: 1, pageSize: 1000 },
        });

        const uniqueCategories = new Set<string>();
        const productsArray = response.data || [];

        productsArray.forEach((product: any) => {
          const productData = product.attributes || product;
          const category = productData.category;
          if (category && typeof category === 'string' && category.trim()) {
            uniqueCategories.add(category.trim());
          }
        });

        const categoriesData = Array.from(uniqueCategories).map((categoryName) => ({
          id: categoryName,
          documentId: categoryName,
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        }));

        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Fetch subcategories when category changes
  // Since subcategories aren't directly linked to categories, we extract them from products
  useEffect(() => {
    const fetchSubcategories = async () => {
      const categoryName = formData.category;

      if (!categoryName || typeof categoryName !== 'string') {
        setSubcategories([]);
        return;
      }

      setLoadingSubcategories(true);
      try {
        // Fetch all subcategories
        const subcategoriesResponse = await api.getSubcategories();
        const allSubcategories = subcategoriesResponse.data || [];

        // Fetch products with the selected category to find used subcategories
        const productsResponse = await api.getProducts({
          pagination: { page: 1, pageSize: 1000 },
          filters: { category: categoryName },
        });

        const productsArray = productsResponse.data || [];
        const usedSubcategoryIds = new Set<number>();

        productsArray.forEach((product: any) => {
          const productData = product.attributes || product;
          if (productData.subcategory) {
            if (typeof productData.subcategory === 'object' && productData.subcategory.id) {
              usedSubcategoryIds.add(productData.subcategory.id);
            } else if (typeof productData.subcategory === 'number') {
              usedSubcategoryIds.add(productData.subcategory);
            } else if (typeof productData.subcategoryId === 'number') {
              usedSubcategoryIds.add(productData.subcategoryId);
            }
          } else if (productData.subcategoryId) {
            usedSubcategoryIds.add(productData.subcategoryId);
          }
        });

        const filteredSubcategories = allSubcategories
          .filter((subcategory: any) => {
            const subcategoryId = subcategory.id || subcategory.documentId;
            return usedSubcategoryIds.size === 0 || usedSubcategoryIds.has(subcategoryId);
          })
          .map((subcategory: any) => ({
            id: subcategory.id,
            documentId: subcategory.id?.toString(),
            name: subcategory.name || '',
            slug: subcategory.urlPath || subcategory.slug || null,
            category: categoryName,
          }));

        setSubcategories(filteredSubcategories);
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        setSubcategories([]);
      } finally {
        setLoadingSubcategories(false);
      }
    };

    if (isOpen && formData.category) {
      fetchSubcategories();
    } else {
      setSubcategories([]);
    }
  }, [isOpen, formData.category]);

  useEffect(() => {
    if (!isOpen || subcategories.length === 0) {
      return;
    }

    setFormData((prev) => {
      if (!prev.subcategory) {
        return prev;
      }

      const currentValue =
        typeof prev.subcategory === 'number'
          ? prev.subcategory.toString()
          : prev.subcategory;
      if (!currentValue.trim()) {
        return prev;
      }

      const alreadyMatches = subcategories.some(
        (subcategory) =>
          subcategory.id?.toString() === currentValue ||
          subcategory.documentId?.toString() === currentValue,
      );
      if (alreadyMatches) {
        return prev;
      }

      const matchedSubcategory = subcategories.find(
        (subcategory) => subcategory.name?.toLowerCase() === currentValue.toLowerCase(),
      );

      if (!matchedSubcategory) {
        return prev;
      }

      const normalizedValue =
        matchedSubcategory.id?.toString() ??
        matchedSubcategory.documentId?.toString() ??
        currentValue;

      if (!normalizedValue || normalizedValue === currentValue) {
        return prev;
      }

      return { ...prev, subcategory: normalizedValue };
    });
  }, [subcategories, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSpecsChange = (specKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      specs: {
        ...prev.specs,
        [specKey]: value
      }
    }));
  };

  const handleDimensionsChange = (field: 'length' | 'width' | 'height' | 'unit', value: number | string) => {
    setFormData(prev => ({
      ...prev,
      Dimensions: {
        ...(prev.Dimensions || { length: 0, width: 0, height: 0, unit: 'cm' }),
        [field]: value
      }
    }));
  };

  const handleAttributesChange = (attributeKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attributeKey]: {
          ...(prev.attributes?.[attributeKey] || { value: '', type: 'text', options: [] }),
          value
        }
      }
    }));
  };

  const handleAttributeTypeChange = (attributeKey: string, type: 'text' | 'dropdown') => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attributeKey]: {
          ...(prev.attributes?.[attributeKey] || { value: '', type: 'text', options: [] }),
          type,
          options: type === 'dropdown' ? (prev.attributes?.[attributeKey]?.options || []) : undefined
        }
      }
    }));
  };

  const handleAttributeHiddenChange = (attributeKey: string, hidden: boolean) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attributeKey]: {
          ...(prev.attributes?.[attributeKey] || { value: '', type: 'text', options: [] }),
          hidden
        }
      }
    }));
  };

  const handleAttributeOptionsChange = (attributeKey: string, options: string[]) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attributeKey]: {
          ...(prev.attributes?.[attributeKey] || { value: '', type: 'dropdown', options: [] }),
          options
        }
      }
    }));
  };

  const handleImageChange = (index: number, field: string, value: string) => {
    const updatedImages = [...formData.images];
    updatedImages[index] = {
      ...updatedImages[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      images: updatedImages
    }));
  };

  const addImage = () => {
    setShowAddImageModal(true);
    setImageUploadMode(null);
    setPastedImageUrl('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Filter only image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setErrors(prev => ({ ...prev, imageUpload: 'Please select valid image files' }));
      return;
    }

    // Switch to upload mode to show progress
    setImageUploadMode('upload');
    setUploadingImage(true);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.imageUpload;
      return newErrors;
    });

    try {
      const uploadedImages: Array<{ url: string; alt: string; isMain: boolean }> = [];
      const currentImageCount = formData.images.length;
      const isFirstImage = currentImageCount === 0;

      // Upload files sequentially to show progress
      for (let i = 0; i < imageFiles.length; i++) {
        setUploadProgress({ 
          current: i + 1, 
          total: imageFiles.length, 
          fileName: imageFiles[i].name 
        });
        
        const uploadResult = await api.uploadImage(imageFiles[i]);
        
        uploadedImages.push({
          url: uploadResult.url,
          alt: formData.name || `Product image ${currentImageCount + i + 1}`,
          isMain: isFirstImage && i === 0 // First uploaded image is main if no images exist
        });
      }

      // Add all uploaded images to form data
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedImages]
      }));

      // Update main image index if this was the first image
      if (isFirstImage && uploadedImages.length > 0) {
        setMainImageIndex(0);
      }

      // Close modal and reset
      setShowAddImageModal(false);
      setImageUploadMode(null);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading images:', error);
      setErrors(prev => ({ 
        ...prev, 
        imageUpload: error.message || 'Failed to upload images. Please try again.' 
      }));
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
    }
  };

  const handlePasteUrl = () => {
    const trimmedUrl = pastedImageUrl.trim();
    
    if (!trimmedUrl) {
      setErrors(prev => ({ ...prev, imageUrl: 'Please enter an image URL' }));
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch {
      setErrors(prev => ({ ...prev, imageUrl: 'Please enter a valid URL' }));
      return;
    }

    // Add the image URL to the form data
    const newImage = {
      url: trimmedUrl,
      alt: formData.name || 'Product image',
      isMain: formData.images.length === 0
    };

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, newImage]
    }));

    // Update main image index if this is the first image
    if (formData.images.length === 0) {
      setMainImageIndex(0);
    }

    // Close modal and reset
    setShowAddImageModal(false);
    setImageUploadMode(null);
    setPastedImageUrl('');
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.imageUrl;
      return newErrors;
    });
  };

  const removeImage = (index: number) => {
    const updatedImages = formData.images.filter((_, i) => i !== index);
    // Adjust mainImageIndex if needed
    if (updatedImages.length > 0) {
      if (index === mainImageIndex) {
        // If we removed the main image, set the first image as main
        setMainImageIndex(0);
      updatedImages[0].isMain = true;
      } else if (index < mainImageIndex) {
        // If we removed an image before the main image, adjust the index
        setMainImageIndex(mainImageIndex - 1);
      }
    } else {
      // No images left
      setMainImageIndex(0);
    }
    setFormData(prev => ({
      ...prev,
      images: updatedImages
    }));
  };

  const setMainImage = (index: number) => {
    setMainImageIndex(index);
    const updatedImages = formData.images.map((img, i) => ({
      ...img,
      isMain: i === index
    }));
    setFormData(prev => ({
      ...prev,
      images: updatedImages
    }));
  };

  // Handle category selection - check if "Add new" or "Edit" was selected
  const handleCategoryChange = (value: string) => {
    if (value === '__add_new__') {
      setShowAddCategoryModal(true);
    } else if (value.startsWith('__edit__')) {
      const categoryId = value.replace('__edit__', '');
      const category = categories.find(c => c.id.toString() === categoryId);
      if (category) {
        setEditingCategory(category);
        setNewCategoryName(category.name);
        setShowEditCategoryModal(true);
      }
    } else {
      // Convert to number if it's a numeric string (category ID)
      const categoryId = value && !isNaN(Number(value)) ? Number(value) : value;
      handleInputChange('category', categoryId);
      // Clear subcategory when category changes
      handleInputChange('subcategory', '');
    }
  };

  // Add new category
  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    
    if (!trimmedName) {
      setErrors(prev => ({ ...prev, newCategory: 'Category name is required' }));
      return;
    }
    
    if (categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrors(prev => ({ ...prev, newCategory: 'Category already exists' }));
      return;
    }

    const newCategory: Category = {
      id: trimmedName,
      documentId: trimmedName,
      name: trimmedName,
      slug: generateSlug(trimmedName),
    };

    setCategories(prev => [...prev, newCategory]);
    handleInputChange('category', trimmedName);
    
    setNewCategoryName('');
    setShowAddCategoryModal(false);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.newCategory;
      return newErrors;
    });
  };

  // Update category
  const handleUpdateCategory = () => {
    if (!editingCategory) return;
    
    const trimmedName = newCategoryName.trim();
    
    if (!trimmedName) {
      setErrors(prev => ({ ...prev, newCategory: 'Category name is required' }));
      return;
    }
    
    if (categories.some(cat => cat.id !== editingCategory.id && cat.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrors(prev => ({ ...prev, newCategory: 'Category name already exists' }));
      return;
    }

    const updated: Category = {
      ...editingCategory,
      id: trimmedName,
      documentId: trimmedName,
      name: trimmedName,
      slug: generateSlug(trimmedName),
    };

    setCategories(prev => prev.map(cat => cat.id === editingCategory.id ? updated : cat));
    
    if (formData.category === editingCategory.id || formData.category === editingCategory.id.toString()) {
      handleInputChange('category', trimmedName);
    }
    
    setNewCategoryName('');
    setEditingCategory(null);
    setShowEditCategoryModal(false);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.newCategory;
      return newErrors;
    });
  };

  // Delete category
  const handleDeleteCategory = (categoryId: number | string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    
    if (formData.category === categoryId || formData.category === categoryId.toString()) {
      handleInputChange('category', '');
      handleInputChange('subcategory', '');
    }
    
    if (editingCategory && editingCategory.id === categoryId) {
      setShowEditCategoryModal(false);
      setEditingCategory(null);
      setNewCategoryName('');
    }
  };

  // Handle subcategory selection
  const handleSubcategoryChange = (value: string) => {
    if (value === '__add_new__') {
      if (!formData.category) {
        setErrors(prev => ({ ...prev, subcategory: 'Please select a category first' }));
        return;
      }
      setShowAddSubcategoryModal(true);
    } else {
      const subcategoryId = value && !isNaN(Number(value)) ? Number(value) : value;
      handleInputChange('subcategory', subcategoryId);
    }
  };

  // Add new subcategory
  const handleAddSubcategory = async () => {
    const trimmedName = newSubcategoryName.trim();
    
    if (!trimmedName) {
      setErrors(prev => ({ ...prev, newSubcategory: 'Subcategory name is required' }));
      return;
    }

    const categoryId = formData.category;
    if (!categoryId) {
      setErrors(prev => ({ ...prev, newSubcategory: 'Please select a category first' }));
      return;
    }

    const categoryIdNum = typeof categoryId === 'string' && !isNaN(Number(categoryId))
      ? Number(categoryId)
      : categoryId;

    if (typeof categoryIdNum !== 'number') {
      setErrors(prev => ({ ...prev, newSubcategory: 'Invalid category selected' }));
      return;
    }

    if (subcategories.some(sub => 
      sub.name.toLowerCase() === trimmedName.toLowerCase() && 
      (typeof sub.category === 'number' ? sub.category : (sub.category as Category).id) === categoryIdNum
    )) {
      setErrors(prev => ({ ...prev, newSubcategory: 'Subcategory already exists in this category' }));
      return;
    }

    try {
      const response = await api.createSubcategory({ 
        name: trimmedName,
        category: categoryIdNum
      }) as { data: any };
      const createdSubcategory = response.data;
      const subcategoryDataAttr = createdSubcategory.attributes || createdSubcategory;

      const newSubcategory: Subcategory = {
        id: createdSubcategory.id || createdSubcategory.documentId,
        documentId: createdSubcategory.documentId,
        name: subcategoryDataAttr.name || trimmedName,
        slug: subcategoryDataAttr.slug || null,
        category: categoryIdNum
      };

      setSubcategories(prev => [...prev, newSubcategory]);
      handleInputChange('subcategory', newSubcategory.id.toString());
      
      setNewSubcategoryName('');
      setShowAddSubcategoryModal(false);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.newSubcategory;
        return newErrors;
      });
    } catch (error: any) {
      console.error('Error creating subcategory:', error);
      setErrors(prev => ({ 
        ...prev, 
        newSubcategory: error.message || 'Failed to create subcategory. Please try again.' 
      }));
    }
  };

  // Update subcategory
  const handleUpdateSubcategory = async () => {
    if (!editingSubcategory) return;
    
    const trimmedName = newSubcategoryName.trim();
    
    if (!trimmedName) {
      setErrors(prev => ({ ...prev, newSubcategory: 'Subcategory name is required' }));
      return;
    }

    const categoryId = formData.category;
    const categoryIdNum = typeof categoryId === 'string' && !isNaN(Number(categoryId))
      ? Number(categoryId)
      : categoryId;

    if (typeof categoryIdNum !== 'number') {
      setErrors(prev => ({ ...prev, newSubcategory: 'Invalid category selected' }));
      return;
    }

    if (subcategories.some(sub => 
      sub.id !== editingSubcategory.id &&
      sub.name.toLowerCase() === trimmedName.toLowerCase() &&
      (typeof sub.category === 'number' ? sub.category : (sub.category as Category).id) === categoryIdNum
    )) {
      setErrors(prev => ({ ...prev, newSubcategory: 'Subcategory name already exists in this category' }));
      return;
    }

    try {
      const response = await api.updateSubcategory(editingSubcategory.id, { 
        name: trimmedName,
        category: categoryIdNum
      }) as { data: any };
      const updatedSubcategory = response.data;
      const subcategoryDataAttr = updatedSubcategory.attributes || updatedSubcategory;

      const updated: Subcategory = {
        id: updatedSubcategory.id || updatedSubcategory.documentId,
        documentId: updatedSubcategory.documentId,
        name: subcategoryDataAttr.name || trimmedName,
        slug: subcategoryDataAttr.slug || null,
        category: categoryIdNum
      };

      setSubcategories(prev => prev.map(sub => sub.id === editingSubcategory.id ? updated : sub));
      
      if (formData.subcategory === editingSubcategory.id || formData.subcategory === editingSubcategory.id.toString()) {
        handleInputChange('subcategory', updated.id.toString());
      }
      
      setNewSubcategoryName('');
      setEditingSubcategory(null);
      setShowEditSubcategoryModal(false);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.newSubcategory;
        return newErrors;
      });
    } catch (error: any) {
      console.error('Error updating subcategory:', error);
      setErrors(prev => ({ 
        ...prev, 
        newSubcategory: error.message || 'Failed to update subcategory. Please try again.' 
      }));
    }
  };

  // Delete subcategory
  const handleDeleteSubcategory = async (subcategoryId: number | string) => {
    if (!confirm('Are you sure you want to delete this subcategory? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteSubcategory(subcategoryId);
      setSubcategories(prev => prev.filter(sub => sub.id !== subcategoryId));
      
      if (formData.subcategory === subcategoryId || formData.subcategory === subcategoryId.toString()) {
        handleInputChange('subcategory', '');
      }
      
      if (editingSubcategory && editingSubcategory.id === subcategoryId) {
        setShowEditSubcategoryModal(false);
        setEditingSubcategory(null);
        setNewSubcategoryName('');
      }
    } catch (error: any) {
      console.error('Error deleting subcategory:', error);
      alert(error.message || 'Failed to delete subcategory. It may be in use by products.');
    }
  };

  // Handle brand selection - check if "Add new" was selected
  const handleBrandChange = (value: string) => {
    if (value === '__add_new__') {
      setShowAddBrandModal(true);
    } else {
      // Convert to number if it's a numeric string (brand ID)
      const brandId = value && !isNaN(Number(value)) ? Number(value) : value;
      handleInputChange('brand', brandId);
    }
  };

  // Handle SKU generation with uniqueness checking
  const handleGenerateSKU = async () => {
    if (!formData.name) {
      return;
    }
    
    try {
      const brandName = formData.brand 
        ? brands.find(b => {
            if (typeof formData.brand === 'string') {
              return b.name === formData.brand;
            } else {
              return b.id === formData.brand || 
                     (b.documentId && b.documentId.toString() === formData.brand.toString());
            }
          })?.name
        : undefined;
      
      // Generate unique SKU with retry logic
      // Note: When editing, we should exclude the current product's SKU from the check
      const currentSKU = formData.SKU;
      const generatedSKU = await generateUniqueSKU(
        formData.name,
        brandName,
        async (sku: string) => {
          try {
            // If the generated SKU matches the current product's SKU, it's not a duplicate
            if (currentSKU && sku === currentSKU) {
              return false;
            }
            return await api.checkSKUExists(sku);
          } catch (error) {
            console.error('Error checking SKU:', error);
            return false; // Allow generation if check fails
          }
        }
      );
      
      handleInputChange('SKU', generatedSKU);
    } catch (error) {
      console.error('Error generating SKU:', error);
      // Fallback to simple generation if uniqueness check fails
      const brandName = formData.brand 
        ? brands.find(b => {
            if (typeof formData.brand === 'string') {
              return b.name === formData.brand;
            } else {
              return b.id === formData.brand || 
                     (b.documentId && b.documentId.toString() === formData.brand.toString());
            }
          })?.name
        : undefined;
      const fallbackSKU = generateSKU(formData.name, brandName);
      handleInputChange('SKU', fallbackSKU);
    }
  };

  // Add new brand
  const handleAddBrand = async () => {
    const trimmedName = newBrandName.trim();
    
    // Validation
    if (!trimmedName) {
      setErrors(prev => ({ ...prev, newBrand: 'Brand name is required' }));
      return;
    }
    
    // Check for duplicates (case-insensitive)
    if (brands.some(brand => brand.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrors(prev => ({ ...prev, newBrand: 'Brand already exists' }));
      return;
    }

    // Logo is optional - check if provided
    const brandLogoFile = (document.getElementById('brand-logo-file') as HTMLInputElement)?.files?.[0];
    const brandLogoUrl = (document.getElementById('brand-logo-url') as HTMLInputElement)?.value?.trim();

    try {
      let logoId: number | undefined;
      let logoUrl: string | undefined;

      // Upload logo file if provided
      if (brandLogoFile) {
        const uploadResponse = await api.uploadImage(brandLogoFile);
        logoId = uploadResponse.id;
      } else if (brandLogoUrl) {
        logoUrl = brandLogoUrl;
      }

      // Create brand in backend
      const brandData: any = {
        name: trimmedName,
      };
      
      if (logoId) {
        brandData.logo = logoId;
      } else if (logoUrl) {
        brandData.logoUrl = logoUrl;
      }

      const response = await api.createBrand(brandData) as { data: any };
      const createdBrand = response.data;
      const brandDataAttr = createdBrand.attributes || createdBrand;

      // Add to brands array
      const newBrand: Brand = {
        id: createdBrand.id || createdBrand.documentId,
        documentId: createdBrand.documentId,
        name: brandDataAttr.name || trimmedName,
        logo: brandDataAttr.logo?.data ? {
          url: brandDataAttr.logo.data.attributes?.url || brandDataAttr.logo.data.url,
          id: brandDataAttr.logo.data?.id
        } : null,
        logoUrl: brandDataAttr.logoUrl || logoUrl || null
      };

      setBrands(prev => [...prev, newBrand]);
      
      // Select the new brand (use ID)
      handleInputChange('brand', newBrand.id.toString());
      
      // Reset and close modal
      setNewBrandName('');
      setShowAddBrandModal(false);
      (document.getElementById('brand-logo-file') as HTMLInputElement).value = '';
      (document.getElementById('brand-logo-url') as HTMLInputElement).value = '';
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.newBrand;
        return newErrors;
      });
    } catch (error: any) {
      console.error('Error creating brand:', error);
      
      let errorMessage = 'Failed to create brand. Please try again.';
      
      if (error.status === 401 || error.status === 403) {
        errorMessage = 'Authentication failed. Please ensure you are logged in and have permission to create brands.';
      } else if (error.status === 404 || error.message?.includes('Method Not Allowed')) {
        errorMessage = 'Brands endpoint not found. Please ensure the backend is running and the brands API is available.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors(prev => ({ 
        ...prev, 
        newBrand: errorMessage
      }));
    }
  };

  // Update brand
  const handleUpdateBrand = async () => {
    if (!editingBrand) return;
    
    const trimmedName = newBrandName.trim();
    
    if (!trimmedName) {
      setErrors(prev => ({ ...prev, newBrand: 'Brand name is required' }));
      return;
    }
    
    // Check for duplicates (excluding current brand)
    if (brands.some(b => b.id !== editingBrand.id && b.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrors(prev => ({ ...prev, newBrand: 'Brand name already exists' }));
      return;
    }

    // Logo is optional - check if provided
    const brandLogoFile = (document.getElementById('edit-brand-logo-file') as HTMLInputElement)?.files?.[0];
    const brandLogoUrl = (document.getElementById('edit-brand-logo-url') as HTMLInputElement)?.value?.trim();

    try {
      let logoId: number | undefined;
      let logoUrl: string | undefined;

      // Upload logo file if provided
      if (brandLogoFile) {
        const uploadResponse = await api.uploadImage(brandLogoFile);
        logoId = uploadResponse.id;
      } else if (brandLogoUrl) {
        logoUrl = brandLogoUrl;
      }

      // Update brand in backend
      const brandData: any = {
        name: trimmedName,
      };
      
      if (logoId) {
        brandData.logo = logoId;
      } else if (logoUrl) {
        brandData.logoUrl = logoUrl;
      }

      const response = await api.updateBrand(editingBrand.id.toString(), brandData) as { data: any };
      const updatedBrand = response.data;
      const brandDataAttr = updatedBrand.attributes || updatedBrand;

      const updated: Brand = {
        id: updatedBrand.id || updatedBrand.documentId,
        documentId: updatedBrand.documentId,
        name: brandDataAttr.name || trimmedName,
        logo: brandDataAttr.logo?.data ? {
          url: brandDataAttr.logo.data.attributes?.url || brandDataAttr.logo.data.url,
          id: brandDataAttr.logo.data?.id
        } : null,
        logoUrl: brandDataAttr.logoUrl || logoUrl || null
      };

      setBrands(prev => prev.map(b => b.id === editingBrand.id ? updated : b));
      
      // Update formData if this brand is selected
      if (formData.brand === editingBrand.id || formData.brand === editingBrand.id.toString()) {
        handleInputChange('brand', updated.id.toString());
      }
      
      // Reset and close modal
      setNewBrandName('');
      setEditingBrand(null);
      setShowEditBrandModal(false);
      (document.getElementById('edit-brand-logo-file') as HTMLInputElement).value = '';
      (document.getElementById('edit-brand-logo-url') as HTMLInputElement).value = '';
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.newBrand;
        return newErrors;
      });
    } catch (error: any) {
      console.error('Error updating brand:', error);
      setErrors(prev => ({ 
        ...prev, 
        newBrand: error.message || 'Failed to update brand. Please try again.' 
      }));
    }
  };

  // Delete brand
  const handleDeleteBrand = async (brandId: number | string) => {
    if (!confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteBrand(brandId);
      setBrands(prev => prev.filter(b => b.id !== brandId));
      
      // Clear brand selection if deleted brand was selected
      if (formData.brand === brandId || formData.brand === brandId.toString()) {
        handleInputChange('brand', '');
      }
      
      // Close modal if editing
      if (editingBrand && editingBrand.id === brandId) {
        setShowEditBrandModal(false);
        setEditingBrand(null);
        setNewBrandName('');
      }
    } catch (error: any) {
      console.error('Error deleting brand:', error);
      alert(error.message || 'Failed to delete brand. It may be in use by products.');
    }
  };

  // Get the main image URL for display
  const mainImageUrl = formData.images[mainImageIndex]?.url || (formData.images.length > 0 ? formData.images[0]?.url : null);
  const displayImages = formData.images; // Show all thumbnails

  const validateForm = (): { isValid: boolean; firstErrorField: string | null; errorMessage: string } => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.brand) {
      newErrors.brand = 'Brand is required';
    }

    if (!formData.basePrice || formData.basePrice <= 0) {
      newErrors.basePrice = 'Base Price is required and must be greater than 0';
    }

    if (formData.stockQuantity !== undefined && formData.stockQuantity < 0) {
      newErrors.stockQuantity = 'Stock quantity cannot be negative';
    }

    if (formData.minStockLevel !== undefined && formData.maxStockLevel !== undefined) {
      if (formData.minStockLevel >= formData.maxStockLevel) {
        newErrors.minStockLevel = 'Min stock level must be less than max stock level';
      }
    }

    setErrors(newErrors);
    
    // Find first error field
    const firstErrorField = Object.keys(newErrors)[0] || null;
    const errorMessage = firstErrorField ? newErrors[firstErrorField] : '';
    
    return {
      isValid: Object.keys(newErrors).length === 0,
      firstErrorField,
      errorMessage
    };
  };

  // Helper function to scroll and focus on error field
  const scrollToErrorField = (fieldName: string | null) => {
    if (!fieldName) return;
    
    // Map field names to IDs
    const fieldIds: Record<string, string> = {
      name: 'field-product-name',
      category: 'field-product-category',
      brand: 'field-product-brand',
      basePrice: 'field-product-cost-price',
      stockQuantity: 'field-product-stock-quantity',
      minStockLevel: 'field-product-min-stock',
      maxStockLevel: 'field-product-max-stock',
    };
    
    const fieldId = fieldIds[fieldName];
    if (!fieldId) return;
    
    // Try to find the field element
    const fieldElement = document.getElementById(fieldId);
    
    if (fieldElement) {
      // Scroll to field with smooth behavior
      fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Focus on the field after a short delay
      setTimeout(() => {
        if (fieldElement instanceof HTMLInputElement || 
            fieldElement instanceof HTMLTextAreaElement ||
            fieldElement instanceof HTMLSelectElement) {
          fieldElement.focus();
        } else {
          // For Listbox, try to find the button inside
          const button = fieldElement.querySelector('button');
          if (button) {
            button.focus();
          }
        }
      }, 300);
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = (): boolean => {
    if (!originalProductRef.current) {
      return false;
    }
    
    const original = originalProductRef.current;
    const current = formData;
    
    // Deep comparison of key fields
    const compareFields = [
      'name', 'slug', 'category', 'subcategory', 'brand', 'price', 'discountedPrice',
      'tagline', 'description', 'isActive', 'SKU', 'stockQuantity', 'minStockLevel',
      'maxStockLevel', 'stockStatus', 'basePrice', 'taxRate', 'discountPercent',
      'weight', 'color', 'condition', 'warrantyPeriod', 'metaTitle', 'metaDescription',
      'metaKeywords', 'ogImage'
    ];
    
    // Check simple fields
    for (const field of compareFields) {
      const originalValue = original[field as keyof Product];
      const currentValue = current[field as keyof Product];
      
      // Normalize values for comparison (handle string/number mismatches)
      let normalizedOriginal = originalValue;
      let normalizedCurrent = currentValue;
      
      // For price and discountedPrice, normalize to string for comparison
      if (field === 'price' || field === 'discountedPrice') {
        normalizedOriginal = originalValue !== undefined && originalValue !== null ? String(originalValue) : '';
        normalizedCurrent = currentValue !== undefined && currentValue !== null ? String(currentValue) : '';
      }
      
      // For numeric fields, normalize to numbers for comparison (handle string numbers)
      if (['basePrice', 'taxRate', 'discountPercent', 'stockQuantity', 'minStockLevel', 'maxStockLevel', 'weight'].includes(field)) {
        const origNum = typeof normalizedOriginal === 'string' ? parseFloat(normalizedOriginal) : Number(normalizedOriginal || 0);
        const currNum = typeof normalizedCurrent === 'string' ? parseFloat(normalizedCurrent) : Number(normalizedCurrent || 0);
        normalizedOriginal = isNaN(origNum) ? 0 : origNum;
        normalizedCurrent = isNaN(currNum) ? 0 : currNum;
      }
      
      // For boolean fields, normalize to boolean
      if (field === 'isActive') {
        normalizedOriginal = Boolean(originalValue);
        normalizedCurrent = Boolean(currentValue);
      }
      
      // For string fields, normalize empty/null/undefined to empty string
      if (['name', 'slug', 'tagline', 'description', 'SKU', 'stockStatus', 'color', 'condition', 'warrantyPeriod', 'metaTitle', 'metaDescription', 'metaKeywords', 'ogImage'].includes(field)) {
        normalizedOriginal = originalValue !== undefined && originalValue !== null ? String(originalValue) : '';
        normalizedCurrent = currentValue !== undefined && currentValue !== null ? String(currentValue) : '';
      }
      
      // For category, subcategory, and brand, normalize to string for comparison
      if (['category', 'subcategory', 'brand'].includes(field)) {
        normalizedOriginal = originalValue !== undefined && originalValue !== null ? String(originalValue) : '';
        normalizedCurrent = currentValue !== undefined && currentValue !== null ? String(currentValue) : '';
      }
      
      const isDifferent = normalizedOriginal !== normalizedCurrent;
      
      if (isDifferent) {
        return true;
      }
    }
    
    // Check Dimensions
    if (JSON.stringify(original.Dimensions) !== JSON.stringify(current.Dimensions)) {
      return true;
    }
    
    // Check specs
    if (JSON.stringify(original.specs) !== JSON.stringify(current.specs)) {
      return true;
    }
    
    // Check attributes
    if (JSON.stringify(original.attributes) !== JSON.stringify(current.attributes)) {
      return true;
    }
    
    // Check images (compare URLs only, ignore isMain flag for thumbnail selection)
    if (original.images.length !== current.images.length) {
      return true;
    }
    for (let i = 0; i < original.images.length; i++) {
      if (original.images[i].url !== current.images[i]?.url) {
        return true;
      }
    }
    
    // Check schemaMarkup
    if (JSON.stringify(original.schemaMarkup) !== JSON.stringify(current.schemaMarkup)) {
      return true;
    }
    
    return false;
  };

  // Handle modal close with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges()) {
      if (confirm('You have unsaved changes. Are you sure you want to close? All unsaved changes will be lost.')) {
        originalProductRef.current = null;
        onClose();
      }
    } else {
      originalProductRef.current = null;
      onClose();
    }
  };

  const handleDeleteProduct = async () => {
    if (!isEditMode || !product?.id) {
      showToast('error', 'Product ID is missing. Cannot delete.');
      return;
    }
    if (!onDelete) {
      showToast('error', 'Delete handler is not available.');
      return;
    }
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      setDeleting(true);
      await onDelete(product.id);
      originalProductRef.current = null;
      onClose();
      showToast('success', 'Product deleted');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      showToast('error', error?.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateForm();
    
    if (!validation.isValid) {
      // Show toast with error message
      showToast('error', `Validation failed: ${validation.errorMessage}`, { duration: 4000 });
      
      // Scroll and focus to first error field
      scrollToErrorField(validation.firstErrorField);
      return;
    }

    setLoading(true);
    setErrors({}); // Clear previous errors
    
    try {
      // Calculate prices
      const basePrice = formData.basePrice || 0;
      const vatPercent = formData.taxRate || 16;
      const sellingPrice = basePrice * (1 + vatPercent / 100);
      const discountPercent = formData.discountPercent || 0;
      const discountPrice = discountPercent > 0 ? sellingPrice * (1 - discountPercent / 100) : 0;

      // Generate slug from name
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

      if (isEditMode) {
        // Edit mode: update existing product
        // Ensure documentId is preserved from the original product
        if (!formData.documentId && product?.documentId) {
          console.warn('documentId missing from formData, using product.documentId');
        }

        const updatedProduct = {
          ...formData,
          documentId: formData.documentId || product?.documentId,
          slug: slug,
          price: sellingPrice.toString(), // Selling price = Base Price + VAT
          discountedPrice: discountPrice > 0 ? discountPrice.toString() : '0',
          basePrice: basePrice, // Base price (formerly cost price)
          taxRate: vatPercent,
          discountPercent: discountPercent,
          // Include SEO fields
          metaTitle: formData.metaTitle,
          metaDescription: formData.metaDescription,
          metaKeywords: formData.metaKeywords,
          ogImage: formData.ogImage,
          schemaMarkup: formData.schemaMarkup,
        };

        console.log('Saving product:', updatedProduct);
        console.log('Product documentId:', updatedProduct.documentId);
        console.log('Product id:', product?.id);
        
        // Use documentId if available, otherwise use id
        const productId = updatedProduct.documentId || product?.id;
        if (!productId) {
          throw new Error('Product ID is missing. Cannot save product.');
        }

        // Ensure documentId is set for the API call
        if (!updatedProduct.documentId && product?.id) {
          updatedProduct.documentId = product.id.toString();
        }

        if (!onSave) {
          throw new Error('Save handler is not available.');
        }

        await onSave(updatedProduct);
        showToast('success', 'Product saved successfully!');
        originalProductRef.current = null;
        onClose();
      } else {
        // Create mode: create new product
        // Upload images first if there are any file uploads needed
        // (For now, we'll assume images are already URLs or handled separately)
        
        const productData = {
          ...formData,
          slug: slug,
          price: sellingPrice.toString(),
          discountedPrice: discountPrice > 0 ? discountPrice.toString() : '0',
          basePrice: basePrice,
          taxRate: vatPercent,
          discountPercent: discountPercent,
          // Include SEO fields
          metaTitle: formData.metaTitle,
          metaDescription: formData.metaDescription,
          metaKeywords: formData.metaKeywords,
          ogImage: formData.ogImage,
          schemaMarkup: formData.schemaMarkup,
        };

        console.log('Creating product with data:', productData);
        
        await api.createProduct(productData);
        showToast('success', 'Product created successfully!');
        originalProductRef.current = null;
        
        // Reset form to default values
        const defaultFormData: Product = {
          id: 0,
          name: '',
          slug: '',
          category: '',
          subcategory: '',
          brand: '',
          price: '',
          discountedPrice: '0',
          tagline: '',
          description: '',
          specs: {},
          images: [],
          isActive: true,
          SKU: '',
          stockQuantity: 0,
          minStockLevel: 5,
          maxStockLevel: 100,
          stockStatus: 'in-stock',
          basePrice: 0,
          taxRate: 16,
          discountPercent: 0,
          weight: 0,
          Dimensions: { length: 0, width: 0, height: 0, unit: 'cm' },
          color: '',
          condition: '',
          warrantyPeriod: '',
          attributes: {},
          metaTitle: '',
          metaDescription: '',
          metaKeywords: '',
          ogImage: '',
          schemaMarkup: undefined
        };
        setFormData(defaultFormData);
        setMainImageIndex(0);
        setErrors({});
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      
      // Show more detailed error message
      let errorMessage = isEditMode ? 'Failed to save product. Please try again.' : 'Failed to create product. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.status) {
        errorMessage = `Server error (${error.response.status}). Please check your connection.`;
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Memoized SEO change handler to prevent infinite loops
  const handleSEOChange = useCallback((seoData: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
    schemaMarkup?: Record<string, any>;
  }) => {
    setFormData((prev) => ({
      ...prev,
      ...seoData,
    }));
  }, []); // Empty dependency array since setFormData is stable

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-[0.93]" onClick={handleClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-[95%] md:w-[85%] lg:w-[90%] h-[95%] md:h-[85%] flex flex-col md:flex-row relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - visible on mobile and desktop */}
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
                  {/* Upload Img Card */}
                  <div className="rounded-lg shadow-sm p-6 h-full">
                    {/* Main Product Image */}
                    <div className="mb-4 h-[80%] flex items-center justify-center">
                      {mainImageUrl ? (
                        <div className="relative w-full rounded-lg overflow-hidden group">
                          <img
                            src={mainImageUrl}
                            alt={formData.images[mainImageIndex]?.alt || "Main product image"}
                            className="w-full h-full object-contain min-h-[15rem]"
                          />
                          {/* Delete button on hover */}
                          <button
                            type="button"
                            onClick={() => removeImage(mainImageIndex)}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                            title="Delete image"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <div className="text-center">
                            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">No image selected</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Image Thumbnails */}
                    {(() => {
                      const showAddButton = displayImages.length < 10; // Show add button if less than 10 images
                      const totalItems = displayImages.length + (showAddButton ? 1 : 0);
                      
                      // Ensure minimum columns so add button doesn't get too large when no images exist
                      const minColumns = 4;
                      const gridColumns = Math.max(minColumns, totalItems > 10 ? 10 : totalItems);
                      
                      return (
                        <div className={`grid gap-2 h-[20%] ${
                          gridColumns === 1 ? 'grid-cols-1' :
                          gridColumns === 2 ? 'grid-cols-2' :
                          gridColumns === 3 ? 'grid-cols-3' :
                          gridColumns === 4 ? 'grid-cols-4' :
                          gridColumns === 5 ? 'grid-cols-5' :
                          gridColumns === 6 ? 'grid-cols-6' :
                          gridColumns === 7 ? 'grid-cols-7' :
                          gridColumns === 8 ? 'grid-cols-8' :
                          gridColumns === 9 ? 'grid-cols-9' :
                          'grid-cols-10'
                        }`} style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
                          {displayImages.map((image, index) => (
                            <div
                              key={index}
                              onClick={() => setMainImage(index)}
                              className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                                index === mainImageIndex
                                  ? 'border-primary-500 ring-2 ring-primary-200'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {image.url ? (
                                <img
                                  src={image.url}
                                  alt={image.alt || `Thumbnail ${index + 1}`}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <PhotoIcon className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {/* Add More Image Button */}
                          {showAddButton && (
                            <div
                              onClick={addImage}
                              className="group relative aspect-square rounded-lg overflow-hidden border-2 border-dashed border-gray-300 cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all flex items-center justify-center"
                            >
                              <PlusIcon className="h-6 w-6 text-primary-600" />
                              {/* Tooltip */}
                              <span className="pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                                Add image
                                <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></span>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
          </div>
        </div>

        {/* Right Column - Form with scrolling */}
        <div className="md:overflow-auto flex-1 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-3xl font-semibold text-center mb-6">
              {isEditMode ? 'Edit Product' : 'Add New Product'}
            </h2>
            
            {/* Active Status Toggle - At the top */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="isActive" className="block text-sm font-medium text-gray-700 mb-1">
                    Product Status
                  </label>
                  <p className="text-xs text-gray-500">
                    {formData.isActive ? 'Product is visible to customers' : 'Product is hidden from customers'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.isActive}
                  onClick={() => handleInputChange('isActive', !formData.isActive)}
                  className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    formData.isActive ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.isActive ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* General Information Card */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-6">General Information</h4>
                    
                    <div className="space-y-5">
                      
                      {/* Name Product */}
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name Product *</label>
                    <input
                      id="field-product-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="Enter product name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                      {/* Description Product */}
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description Product</label>
                        <textarea
                          value={formData.description || ''}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                          placeholder="Product description"
                        />
                      </div>

                      {/* Product Category */}
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Product Category *</label>
                    {loadingCategories ? (
                      <div className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-500">
                        Loading categories...
                      </div>
                    ) : (
                    <Listbox
                      value={formData.category ? (typeof formData.category === 'number' ? formData.category.toString() : formData.category) : ''}
                      onChange={(value) => {
                        if (value !== '__add_new__') {
                          handleCategoryChange(value);
                        } else {
                          setShowAddCategoryModal(true);
                        }
                      }}
                    >
                      <div className="relative" id="field-product-category">
                        <Listbox.Button
                          className={`relative w-full cursor-default rounded-lg border border-gray-300 bg-gray-50 py-2 pl-3 pr-10 text-left text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            errors.category ? 'border-red-500' : ''
                          }`}
                        >
                          <span className="block truncate">
                            {formData.category
                              ? categories.find(c => c.id.toString() === formData.category?.toString() || c.id === formData.category)?.name || 'Select category'
                              : 'Select category'}
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </span>
                        </Listbox.Button>
                        <Transition
                          as="div"
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                          className="absolute z-10 mt-1 w-full rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                        >
                          <Listbox.Options className="max-h-60 overflow-auto rounded-lg py-1 text-base">
                            {categories.map((category) => (
                              <Listbox.Option
                                key={category.id}
                                value={category.id.toString()}
                                className={({ active }) =>
                                  `relative cursor-default select-none py-2 pl-3 pr-9 ${
                                    active ? 'bg-primary-100 text-primary-900' : 'text-gray-900'
                                  }`
                                }
                              >
                                {({ selected }) => (
                                  <div className="flex items-center justify-between">
                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                      {category.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCategory(category);
                                        setNewCategoryName(category.name);
                                        setShowEditCategoryModal(true);
                                      }}
                                      className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-600 hover:text-primary-600 transition-colors"
                                      title="Edit category"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </Listbox.Option>
                            ))}
                            <Listbox.Option
                              value="__add_new__"
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-3 pr-4 ${
                                  active ? 'bg-primary-100 text-primary-900' : 'text-primary-600 font-medium'
                                }`
                              }
                            >
                              <span className="block truncate">+ Add new category</span>
                            </Listbox.Option>
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                    )}
                    {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                    {errors.newCategory && <p className="mt-1 text-sm text-red-600">{errors.newCategory}</p>}
                  </div>

                      {/* Subcategory */}
                      {formData.category && (
                  <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
                    {loadingSubcategories ? (
                      <div className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-500">
                        Loading subcategories...
                      </div>
                    ) : (
                    <Listbox
                      value={formData.subcategory ? (typeof formData.subcategory === 'number' ? formData.subcategory.toString() : formData.subcategory) : ''}
                      onChange={(value: string) => {
                        if (value !== '__add_new__') {
                          handleSubcategoryChange(value);
                        } else {
                          if (!formData.category) {
                            setErrors(prev => ({ ...prev, subcategory: 'Please select a category first' }));
                            return;
                          }
                          setShowAddSubcategoryModal(true);
                        }
                      }}
                    >
                      <div className="relative">
                        <Listbox.Button
                          className={`relative w-full cursor-default rounded-lg border border-gray-300 bg-gray-50 py-2 pl-3 pr-10 text-left text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            errors.subcategory ? 'border-red-500' : ''
                          }`}
                        >
                          <span className="block truncate">
                            {formData.subcategory
                              ? subcategories.find(s => s.id.toString() === formData.subcategory?.toString() || s.id === formData.subcategory)?.name || 'Select subcategory'
                              : 'Select subcategory'}
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </span>
                        </Listbox.Button>
                        <Transition
                          as="div"
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                          className="absolute z-10 mt-1 w-full rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                        >
                          <Listbox.Options className="max-h-60 overflow-auto rounded-lg py-1 text-base">
                            {subcategories.map((subcategory) => (
                              <Listbox.Option
                                key={subcategory.id}
                                value={subcategory.id.toString()}
                                className={({ active }) =>
                                  `relative cursor-default select-none py-2 pl-3 pr-9 ${
                                    active ? 'bg-primary-100 text-primary-900' : 'text-gray-900'
                                  }`
                                }
                              >
                                {({ selected }) => (
                                  <div className="flex items-center justify-between">
                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                      {subcategory.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingSubcategory(subcategory);
                                        setNewSubcategoryName(subcategory.name);
                                        setShowEditSubcategoryModal(true);
                                      }}
                                      className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-600 hover:text-primary-600 transition-colors"
                                      title="Edit subcategory"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </Listbox.Option>
                            ))}
                            <Listbox.Option
                              value="__add_new__"
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-3 pr-4 ${
                                  active ? 'bg-primary-100 text-primary-900' : 'text-primary-600 font-medium'
                                }`
                              }
                            >
                              <span className="block truncate">+ Add new subcategory</span>
                            </Listbox.Option>
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                    )}
                    {errors.subcategory && <p className="mt-1 text-sm text-red-600">{errors.subcategory}</p>}
                    {errors.newSubcategory && <p className="mt-1 text-sm text-red-600">{errors.newSubcategory}</p>}
                  </div>
                      )}

                      {/* Brand */}
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Brand *</label>
                        {loadingBrands ? (
                          <div className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-500">
                            Loading brands...
                          </div>
                        ) : (
                    <Listbox
                            value={typeof formData.brand === 'number' ? formData.brand.toString() : formData.brand || ''}
                      onChange={(value: string) => {
                        if (value !== '__add_new__') {
                          handleBrandChange(value);
                        } else {
                          setShowAddBrandModal(true);
                        }
                      }}
                    >
                      <div className="relative" id="field-product-brand">
                        <Listbox.Button
                          className={`relative w-full cursor-default rounded-lg border border-gray-300 bg-gray-50 py-2 pl-3 pr-10 text-left text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            errors.brand ? 'border-red-500' : ''
                          }`}
                        >
                          <span className="block truncate">
                            {formData.brand
                              ? brands.find(b => b.id.toString() === formData.brand?.toString() || b.id === formData.brand)?.name || 'Select brand'
                              : 'Select brand'}
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </span>
                        </Listbox.Button>
                        <Transition
                          as="div"
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                          className="absolute z-10 mt-1 w-full rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                        >
                          <Listbox.Options className="max-h-60 overflow-auto rounded-lg py-1 text-base">
                            {brands.map((brand) => (
                              <Listbox.Option
                                key={brand.id}
                                value={brand.id.toString()}
                                className={({ active }) =>
                                  `relative cursor-default select-none py-2 pl-3 pr-9 ${
                                    active ? 'bg-primary-100 text-primary-900' : 'text-gray-900'
                                  }`
                                }
                              >
                                {({ selected }) => (
                                  <div className="flex items-center justify-between">
                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                      {brand.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingBrand(brand);
                                        setNewBrandName(brand.name);
                                        setShowEditBrandModal(true);
                                      }}
                                      className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-600 hover:text-primary-600 transition-colors"
                                      title="Edit brand"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </Listbox.Option>
                            ))}
                            <Listbox.Option
                              value="__add_new__"
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-3 pr-4 ${
                                  active ? 'bg-primary-100 text-primary-900' : 'text-primary-600 font-medium'
                                }`
                              }
                            >
                              <span className="block truncate">+ Add new brand</span>
                            </Listbox.Option>
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                        )}
                    {errors.brand && <p className="mt-1 text-sm text-red-600">{errors.brand}</p>}
                        {errors.newBrand && <p className="mt-1 text-sm text-red-600">{errors.newBrand}</p>}
                  </div>

                      {/* Tagline */}
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
                        <input
                          type="text"
                          value={formData.tagline || ''}
                          onChange={(e) => handleInputChange('tagline', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Short product tagline"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing And Stock Card */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-6">Pricing And Stock</h4>
                    
                    {(() => {
                      // Computed values
                      const basePrice = formData.basePrice || 0;
                      const vatPercent = formData.taxRate || 16;
                      const sellingPrice = basePrice * (1 + vatPercent / 100);
                      const discountPercent = formData.discountPercent || 0;
                      const discountPrice = sellingPrice * (1 - discountPercent / 100);

                      return (
                        <div className="space-y-5">
                          {/* Base Price (formerly Cost Price) */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Base Price *</label>
                            <input
                              id="field-product-cost-price"
                              type="number"
                              value={formData.basePrice !== undefined && formData.basePrice !== null ? formData.basePrice : ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                handleInputChange('basePrice', value);
                                // Auto-update selling price
                                const newSellingPrice = value * (1 + (formData.taxRate || 16) / 100);
                                handleInputChange('price', newSellingPrice.toFixed(2));
                                // Auto-update discount price if discount percent exists
                                if (formData.discountPercent) {
                                  const newDiscountPrice = newSellingPrice * (1 - (formData.discountPercent || 0) / 100);
                                  handleInputChange('discountedPrice', newDiscountPrice.toFixed(2));
                                }
                              }}
                              className={`w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.basePrice ? 'border-red-500' : ''}`}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                            />
                            {errors.basePrice && <p className="mt-1 text-sm text-red-600">{errors.basePrice}</p>}
                          </div>

                          {/* VAT */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Value Added Tax (VAT) (%)</label>
                            <input
                              type="number"
                              value={formData.taxRate || 16}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 16;
                                handleInputChange('taxRate', value);
                                // Auto-update selling price
                                const basePriceValue = formData.basePrice || 0;
                                const newSellingPrice = basePriceValue * (1 + value / 100);
                                handleInputChange('price', newSellingPrice.toFixed(2));
                                // Auto-update discount price if discount percent exists
                                if (formData.discountPercent) {
                                  const newDiscountPrice = newSellingPrice * (1 - (formData.discountPercent || 0) / 100);
                                  handleInputChange('discountedPrice', newDiscountPrice.toFixed(2));
                                }
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="16"
                              min="0"
                              max="100"
                              step="0.01"
                            />
                          </div>

                          {/* Selling Price (computed) */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price</label>
                            <input
                              type="text"
                              value={sellingPrice.toFixed(2)}
                              readOnly
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                              placeholder="Calculated automatically"
                            />
                            <p className="mt-1 text-xs text-gray-500">Calculated from Base Price + VAT</p>
                          </div>

                          {/* Discount Percent */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Discount Percent (%)</label>
                            <input
                              type="number"
                              value={formData.discountPercent || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                handleInputChange('discountPercent', value);
                                // Auto-update discount price
                                const basePriceValue = formData.basePrice || 0;
                                const vatPercentValue = formData.taxRate || 16;
                                const currentSellingPrice = basePriceValue * (1 + vatPercentValue / 100);
                                const newDiscountPrice = currentSellingPrice * (1 - value / 100);
                                handleInputChange('discountedPrice', newDiscountPrice.toFixed(2));
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

                    {/* SKU */}
                  <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          SKU
                        </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.SKU || ''}
                        onChange={(e) => handleInputChange('SKU', e.target.value)}
                            className="w-full px-3 py-2 pr-20 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Product SKU"
                      />
                      {formData.name && (
                        <button
                          type="button"
                          onClick={handleGenerateSKU}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
                          title="Generate SKU from product name and brand"
                        >
                          Generate
                        </button>
                      )}
                    </div>
                  </div>

                      {/* Stock */}
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Stock *</label>
                      <input
                        id="field-product-stock-quantity"
                        type="number"
                        value={formData.stockQuantity || ''}
                        onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
                          className={`w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.stockQuantity ? 'border-red-500' : ''}`}
                          placeholder="0"
                        min="0"
                      />
                      {errors.stockQuantity && <p className="mt-1 text-sm text-red-600">{errors.stockQuantity}</p>}
                    </div>

                      {/* Stock Status */}
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
                      <select
                        value={formData.stockStatus || 'in-stock'}
                        onChange={(e) => handleInputChange('stockStatus', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 5%22><path fill=%22%23666%22 d=%22M2 0L0 2h4zm0 5L0 3h4z%22/></svg>')] bg-no-repeat bg-right bg-[length:12px] pr-10"
                      >
                        {stockStatuses.map(status => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                  </div>

                      {/* Min Stock Level */}
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Min Stock Level</label>
                      <input
                        id="field-product-min-stock"
                        type="number"
                        value={formData.minStockLevel || ''}
                        onChange={(e) => handleInputChange('minStockLevel', parseInt(e.target.value) || 0)}
                          className={`w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.minStockLevel ? 'border-red-500' : ''}`}
                          placeholder="5"
                        min="0"
                      />
                      {errors.minStockLevel && <p className="mt-1 text-sm text-red-600">{errors.minStockLevel}</p>}
                    </div>

                      {/* Max Stock Level */}
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Stock Level</label>
                      <input
                        id="field-product-max-stock"
                        type="number"
                        value={formData.maxStockLevel || ''}
                        onChange={(e) => handleInputChange('maxStockLevel', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="100"
                        min="0"
                      />
                  </div>
                </div>

                  {/* Specifications Card */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-6">Specifications</h4>
                    
                    <div className="space-y-2">
                      {Object.entries(formData.specs || {}).map(([key, value], index) => {
                        // Use index as stable key to prevent remounting when key changes
                        return (
                          <SpecInput
                            key={`spec-${index}-${key}`}
                            specKey={key}
                            specValue={value}
                            availableSpecNames={availableSpecNames}
                            onKeyChange={(oldKey, newKey) => {
                              const newSpecs = { ...formData.specs };
                              if (newKey && newKey.trim() !== '') {
                                delete newSpecs[oldKey];
                                newSpecs[newKey.trim()] = value;
                              } else {
                                delete newSpecs[oldKey];
                              }
                              setFormData(prev => ({ ...prev, specs: newSpecs }));
                            }}
                            onValueChange={(specKey, newValue) => {
                              handleSpecsChange(specKey, newValue);
                            }}
                            onRemove={(specKey) => {
                              const newSpecs = { ...formData.specs };
                              delete newSpecs[specKey];
                              setFormData(prev => ({ ...prev, specs: newSpecs }));
                            }}
                          />
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          const newKey = `spec_${Date.now()}`;
                          handleSpecsChange(newKey, '');
                        }}
                        className="flex items-center text-sm text-primary-600 hover:text-primary-500 mt-2"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Specification
                      </button>
                    </div>
                  </div>
            </div>

            {/* Product Variants Section */}
            {product && product.id && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <ProductVariantsManager
                  key={`variants-${product.id}-${isOpen}`}
                  productId={product.id}
                  productName={formData.name}
                />
              </div>
            )}

            {/* Attributes Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h4 className="text-lg font-bold text-gray-900 mb-6">Attributes</h4>
              
              <div className="space-y-4">
                {/* Weight */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.weight || ''}
                    onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.1"
                  />
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions</label>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Length</label>
                      <input
                        type="number"
                        value={formData.Dimensions?.length || ''}
                        onChange={(e) => handleDimensionsChange('length', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="0"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Width</label>
                      <input
                        type="number"
                        value={formData.Dimensions?.width || ''}
                        onChange={(e) => handleDimensionsChange('width', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="0"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Height</label>
                      <input
                        type="number"
                        value={formData.Dimensions?.height || ''}
                        onChange={(e) => handleDimensionsChange('height', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="0"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Unit</label>
                      <select
                        value={formData.Dimensions?.unit || 'cm'}
                        onChange={(e) => handleDimensionsChange('unit', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 5%22><path fill=%22%23666%22 d=%22M2 0L0 2h4zm0 5L0 3h4z%22/></svg>')] bg-no-repeat bg-right bg-[length:12px] pr-10"
                      >
                        <option value="cm">cm</option>
                        <option value="m">m</option>
                        <option value="in">in</option>
                        <option value="ft">ft</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <input
                    type="text"
                    value={formData.color || ''}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Red, Blue, Black"
                  />
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                  <select
                    value={formData.condition || ''}
                    onChange={(e) => handleInputChange('condition', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 5%22><path fill=%22%23666%22 d=%22M2 0L0 2h4zm0 5L0 3h4z%22/></svg>')] bg-no-repeat bg-right bg-[length:12px] pr-10"
                  >
                    <option value="">Select Condition</option>
                    <option value="New">New</option>
                    <option value="Refurbished">Refurbished</option>
                    <option value="Used">Used</option>
                    <option value="Open Box">Open Box</option>
                  </select>
                </div>

                {/* Warranty Period */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Period</label>
                  <input
                    type="text"
                    value={formData.warrantyPeriod || ''}
                    onChange={(e) => handleInputChange('warrantyPeriod', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., 1 Year, 2 Years, Lifetime"
                  />
                </div>
              </div>

              {/* Custom Attributes Section */}
              <div className="mt-6 pt-6 border-t border-gray-300">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-md font-semibold text-gray-900">Custom Attributes</h5>
                  <button
                    type="button"
                    onClick={() => {
                      const newKey = `attr_${Date.now()}`;
                      setFormData(prev => ({
                        ...prev,
                        attributes: {
                          ...prev.attributes,
                          [newKey]: { value: '', type: 'text', options: [] }
                        }
                      }));
                    }}
                    className="flex items-center text-sm text-primary-600 hover:text-primary-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Custom Attribute
                  </button>
                </div>
                
                {/* Show hidden attributes toggle */}
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={showHiddenAttributes}
                      onChange={(e) => setShowHiddenAttributes(e.target.checked)}
                      className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Show hidden attributes
                  </label>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(formData.attributes || {})
                    .filter(([key, attr]) => showHiddenAttributes || !attr.hidden)
                    .map(([key, attributeData], index) => {
                      return (
                        <AttributeInput
                          key={`attr-${index}-${key}`}
                          attributeKey={key}
                          attributeData={attributeData}
                          availableAttributeNames={availableAttributeNames}
                          onKeyChange={(oldKey, newKey) => {
                            const newAttributes = { ...formData.attributes };
                            if (newKey && newKey.trim() !== '') {
                              const value = newAttributes[oldKey];
                              delete newAttributes[oldKey];
                              newAttributes[newKey.trim()] = value;
                            } else {
                              delete newAttributes[oldKey];
                            }
                            setFormData(prev => ({ ...prev, attributes: newAttributes }));
                          }}
                          onValueChange={(attrKey, newValue) => {
                            handleAttributesChange(attrKey, newValue);
                          }}
                          onTypeChange={(attrKey, newType) => {
                            handleAttributeTypeChange(attrKey, newType);
                          }}
                          onOptionsChange={(attrKey, newOptions) => {
                            handleAttributeOptionsChange(attrKey, newOptions);
                          }}
                          onHiddenChange={(attrKey, hidden) => {
                            handleAttributeHiddenChange(attrKey, hidden);
                          }}
                          onRemove={(attrKey) => {
                            const newAttributes = { ...formData.attributes };
                            delete newAttributes[attrKey];
                            setFormData(prev => ({ ...prev, attributes: newAttributes }));
                          }}
                        />
                      );
                    })}
                  {(!formData.attributes || Object.keys(formData.attributes).filter((k) => !formData.attributes[k].hidden).length === 0) && !showHiddenAttributes && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No custom attributes added yet. Click "Add Custom Attribute" to create one.
                    </p>
                  )}
                  {showHiddenAttributes && (!formData.attributes || Object.keys(formData.attributes).length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No custom attributes added yet. Click "Add Custom Attribute" to create one.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SEO Section */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <ProductSEOEditor
                seoData={{
                  metaTitle: formData.metaTitle,
                  metaDescription: formData.metaDescription,
                  metaKeywords: formData.metaKeywords,
                  ogImage: formData.ogImage,
                  schemaMarkup: formData.schemaMarkup,
                }}
                productName={formData.name}
                productDescription={formData.description}
                productImages={formData.images}
                onChange={handleSEOChange}
              />
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="mt-4 flex items-center text-red-600">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                <span className="text-sm">{errors.submit}</span>
              </div>
            )}

            {/* Danger zone - Only show in edit mode */}
            {isEditMode && onDelete && (
              <div className="mt-8 rounded-2xl border border-red-100 bg-red-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-red-800">Danger zone</div>
                  <button
                    type="button"
                    onClick={handleDeleteProduct}
                    disabled={loading || deleting}
                    className="inline-flex items-center rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <TrashIcon className="mr-2 h-4 w-4" />
                    {deleting ? 'Deleting...' : 'Delete Product'}
                  </button>
                </div>
              </div>
            )}

            <div className="sticky bottom-0 z-20 mt-6 flex justify-end">
              <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl p-3">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="inline-flex items-center rounded-xl border border-primary-200 bg-white px-5 py-3 text-sm font-semibold text-primary-700 shadow-sm hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2"
                >
                  Preview
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary-500/40 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckIcon className="mr-2 h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    {isPreviewOpen && (
      <ProductPreviewOverlay
        product={formData}
        breadcrumbs={[
          typeof formData.category === 'string' ? formData.category : '',
          typeof formData.subcategory === 'string' ? formData.subcategory : '',
          formData.name,
        ].filter(Boolean)}
        brands={brands}
        onClose={() => setIsPreviewOpen(false)}
      />
    )}

    {/* Add New Category Modal */}
    {showAddCategoryModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
            setShowAddCategoryModal(false);
            setNewCategoryName('');
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.newCategory;
              return newErrors;
            });
          }}></div>
          <div className="flex items-center justify-center min-h-screen px-4 py-4">
            <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Add New Category</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategoryModal(false);
                      setNewCategoryName('');
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.newCategory;
                        return newErrors;
                      });
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                        <input
                          type="text"
                    value={newCategoryName}
                          onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      if (errors.newCategory) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.newCategory;
                          return newErrors;
                        });
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.newCategory ? 'border-red-500' : ''}`}
                    placeholder="Enter category name"
                    autoFocus
                  />
                  {errors.newCategory && <p className="mt-1 text-sm text-red-600">{errors.newCategory}</p>}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-500 text-base font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Add Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategoryModal(false);
                    setNewCategoryName('');
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.newCategory;
                      return newErrors;
                    });
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
    )}

    {/* Edit Category Modal */}
    {showEditCategoryModal && editingCategory && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
            setShowEditCategoryModal(false);
            setEditingCategory(null);
            setNewCategoryName('');
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.newCategory;
              return newErrors;
            });
          }}></div>
          <div className="flex items-center justify-center min-h-screen px-4 py-4">
            <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Edit Category</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditCategoryModal(false);
                      setEditingCategory(null);
                      setNewCategoryName('');
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.newCategory;
                        return newErrors;
                      });
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                        <input
                          type="text"
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      if (errors.newCategory) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.newCategory;
                          return newErrors;
                        });
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateCategory();
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.newCategory ? 'border-red-500' : ''}`}
                    placeholder="Enter category name"
                    autoFocus
                  />
                  {errors.newCategory && <p className="mt-1 text-sm text-red-600">{errors.newCategory}</p>}
                      </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <div className="flex gap-2">
                    <button
                      type="button"
                    onClick={() => handleDeleteCategory(editingCategory.id)}
                    className="inline-flex justify-center rounded-md border border-red-300 shadow-sm px-4 py-2 bg-red-50 text-base font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateCategory}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-500 text-base font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
                  >
                    Update
                    </button>
                  </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditCategoryModal(false);
                    setEditingCategory(null);
                    setNewCategoryName('');
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.newCategory;
                      return newErrors;
                    });
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
                </div>
              </div>
          </div>
        </div>
    )}

    {/* Add New Subcategory Modal */}
    {showAddSubcategoryModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
            setShowAddSubcategoryModal(false);
            setNewSubcategoryName('');
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.newSubcategory;
              return newErrors;
            });
          }}></div>
          <div className="flex items-center justify-center min-h-screen px-4 py-4">
            <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Add New Subcategory</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSubcategoryModal(false);
                      setNewSubcategoryName('');
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.newSubcategory;
                        return newErrors;
                      });
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={formData.category || ''}
                      disabled
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    >
                      <option value="">
                        {categories.find(c => c.id.toString() === formData.category?.toString())?.name || 'No category selected'}
                      </option>
                    </select>
                    {!formData.category && (
                      <p className="mt-1 text-sm text-red-600">Please select a category first</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory Name *</label>
                    <input
                      type="text"
                      value={newSubcategoryName}
                      onChange={(e) => {
                        setNewSubcategoryName(e.target.value);
                        if (errors.newSubcategory) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.newSubcategory;
                            return newErrors;
                          });
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubcategory();
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.newSubcategory ? 'border-red-500' : ''}`}
                      placeholder="Enter subcategory name"
                      autoFocus
                      disabled={!formData.category}
                    />
                    {errors.newSubcategory && <p className="mt-1 text-sm text-red-600">{errors.newSubcategory}</p>}
                          </div>
                      </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAddSubcategory}
                  disabled={!formData.category}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-500 text-base font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Subcategory
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSubcategoryModal(false);
                    setNewSubcategoryName('');
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.newSubcategory;
                      return newErrors;
                    });
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
    )}

    {/* Edit Subcategory Modal */}
    {showEditSubcategoryModal && editingSubcategory && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
            setShowEditSubcategoryModal(false);
            setEditingSubcategory(null);
            setNewSubcategoryName('');
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.newSubcategory;
              return newErrors;
            });
          }}></div>
          <div className="flex items-center justify-center min-h-screen px-4 py-4">
            <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Edit Subcategory</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditSubcategoryModal(false);
                      setEditingSubcategory(null);
                      setNewSubcategoryName('');
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.newSubcategory;
                        return newErrors;
                      });
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={formData.category || ''}
                      disabled
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    >
                      <option value="">
                        {categories.find(c => c.id.toString() === formData.category?.toString())?.name || 'No category selected'}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory Name *</label>
                        <input
                          type="text"
                      value={newSubcategoryName}
                      onChange={(e) => {
                        setNewSubcategoryName(e.target.value);
                        if (errors.newSubcategory) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.newSubcategory;
                            return newErrors;
                          });
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleUpdateSubcategory();
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.newSubcategory ? 'border-red-500' : ''}`}
                      placeholder="Enter subcategory name"
                      autoFocus
                    />
                    {errors.newSubcategory && <p className="mt-1 text-sm text-red-600">{errors.newSubcategory}</p>}
                      </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <div className="flex gap-2">
                          <button
                            type="button"
                    onClick={() => handleDeleteSubcategory(editingSubcategory.id)}
                    className="inline-flex justify-center rounded-md border border-red-300 shadow-sm px-4 py-2 bg-red-50 text-base font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
                          >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete
                          </button>
                        <button
                          type="button"
                    onClick={handleUpdateSubcategory}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-500 text-base font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
                        >
                    Update
                        </button>
                      </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSubcategoryModal(false);
                    setEditingSubcategory(null);
                    setNewSubcategoryName('');
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.newSubcategory;
                      return newErrors;
                    });
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
                    </div>
            </div>
          </div>
        </div>
    )}

    {/* Add New Brand Modal */}
    {showAddBrandModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
            setShowAddBrandModal(false);
            setNewBrandName('');
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.newBrand;
              return newErrors;
            });
          }}></div>
          <div className="flex items-center justify-center min-h-screen px-4 py-4">
            <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Add New Brand</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBrandModal(false);
                      setNewBrandName('');
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.newBrand;
                        return newErrors;
                      });
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand Name *</label>
                    <input
                      type="text"
                      value={newBrandName}
                      onChange={(e) => {
                        setNewBrandName(e.target.value);
                        if (errors.newBrand) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.newBrand;
                            return newErrors;
                          });
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddBrand();
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.newBrand ? 'border-red-500' : ''}`}
                      placeholder="Enter brand name"
                      autoFocus
                    />
                    {errors.newBrand && <p className="mt-1 text-sm text-red-600">{errors.newBrand}</p>}
              </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo (Upload File) <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input
                      id="brand-logo-file"
                      type="file"
                      accept="image/*"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">Upload a logo image file (optional)</p>
              </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">OR</span>
                    </div>
            </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo (URL) <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <input
                      id="brand-logo-url"
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="https://example.com/logo.png or /logos/brand.png"
                    />
                    <p className="mt-1 text-xs text-gray-500">Enter a URL to an existing logo image (optional)</p>
                  </div>
                </div>
              </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                  type="button"
                  onClick={handleAddBrand}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-500 text-base font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Add Brand
              </button>
              <button
                type="button"
                  onClick={() => {
                    setShowAddBrandModal(false);
                    setNewBrandName('');
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.newBrand;
                      return newErrors;
                    });
                  }}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
        </div>
      </div>
        </div>
    )}

    {/* Edit Brand Modal */}
    {showEditBrandModal && editingBrand && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
            setShowEditBrandModal(false);
            setEditingBrand(null);
            setNewBrandName('');
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.newBrand;
              return newErrors;
            });
          }}></div>
          <div className="flex items-center justify-center min-h-screen px-4 py-4">
            <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Edit Brand</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditBrandModal(false);
                      setEditingBrand(null);
                      setNewBrandName('');
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.newBrand;
                        return newErrors;
                      });
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand Name *</label>
                    <input
                      type="text"
                      value={newBrandName}
                      onChange={(e) => {
                        setNewBrandName(e.target.value);
                        if (errors.newBrand) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.newBrand;
                            return newErrors;
                          });
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleUpdateBrand();
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.newBrand ? 'border-red-500' : ''}`}
                      placeholder="Enter brand name"
                      autoFocus
                    />
                    {errors.newBrand && <p className="mt-1 text-sm text-red-600">{errors.newBrand}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo (Upload File)</label>
                    <input
                      id="edit-brand-logo-file"
                      type="file"
                      accept="image/*"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">Upload a logo image file (optional)</p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">OR</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo (URL)</label>
                    <input
                      id="edit-brand-logo-url"
                      type="text"
                      defaultValue={editingBrand.logoUrl || ''}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="https://example.com/logo.png or /logos/brand.png"
                    />
                    <p className="mt-1 text-xs text-gray-500">Enter a URL to an existing logo image (optional)</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteBrand(editingBrand.id)}
                    className="inline-flex justify-center rounded-md border border-red-300 shadow-sm px-4 py-2 bg-red-50 text-base font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateBrand}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-500 text-base font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
                  >
                    Update
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditBrandModal(false);
                    setEditingBrand(null);
                    setNewBrandName('');
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.newBrand;
                      return newErrors;
                    });
                  }}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
        </div>
      </div>
        </div>
    )}

    {/* Add Image Modal */}
    {showAddImageModal && (
      <div className="fixed inset-0 z-[60] overflow-y-auto">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
          setShowAddImageModal(false);
          setImageUploadMode(null);
          setPastedImageUrl('');
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.imageUpload;
            delete newErrors.imageUrl;
            return newErrors;
          });
        }}></div>
        <div className="flex items-center justify-center min-h-screen px-4 py-4">
          <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Add Image</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddImageModal(false);
                    setImageUploadMode(null);
                    setPastedImageUrl('');
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.imageUpload;
                      delete newErrors.imageUrl;
                      return newErrors;
                    });
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Hidden file input that's always available */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploadingImage}
              />

              {!imageUploadMode ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">Choose how you want to add the image:</p>
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                  >
                    <CloudArrowUpIcon className="h-6 w-6 text-primary-600" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Upload File</div>
                      <div className="text-sm text-gray-500">Upload an image from your computer</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImageUploadMode('url')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                  >
                    <LinkIcon className="h-6 w-6 text-primary-600" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Paste URL</div>
                      <div className="text-sm text-gray-500">Enter an image URL link</div>
                    </div>
                  </button>
                </div>
              ) : imageUploadMode === 'upload' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Uploading Images</label>
                    <p className="text-sm text-gray-600 mb-2">Files selected: {fileInputRef.current?.files?.length || 0}</p>
                    {errors.imageUpload && <p className="mt-1 text-sm text-red-600">{errors.imageUpload}</p>}
                    
                    {uploadProgress && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>Uploading {uploadProgress.fileName}...</span>
                          <span>{uploadProgress.current} / {uploadProgress.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {uploadingImage && uploadProgress && (
                      <p className="mt-2 text-sm text-gray-500">
                        Uploading {uploadProgress.current} of {uploadProgress.total} image{uploadProgress.total > 1 ? 's' : ''}...
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImageUploadMode(null);
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.imageUpload;
                          return newErrors;
                        });
                      }}
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                      disabled={uploadingImage}
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                    <input
                      type="url"
                      value={pastedImageUrl}
                      onChange={(e) => {
                        setPastedImageUrl(e.target.value);
                        if (errors.imageUrl) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.imageUrl;
                            return newErrors;
                          });
                        }
                      }}
                      onPaste={(e) => {
                        const pastedUrl = e.clipboardData.getData('text');
                        setPastedImageUrl(pastedUrl);
                        if (errors.imageUrl) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.imageUrl;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="https://example.com/image.jpg"
                      className={`w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.imageUrl ? 'border-red-500' : ''}`}
                      autoFocus
                    />
                    {errors.imageUrl && <p className="mt-1 text-sm text-red-600">{errors.imageUrl}</p>}
                    <p className="mt-1 text-xs text-gray-500">Paste or enter the image URL</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImageUploadMode(null);
                        setPastedImageUrl('');
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.imageUrl;
                          return newErrors;
                        });
                      }}
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handlePasteUrl}
                      className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                    >
                      Add Image
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

function ProductPreviewOverlay({
  product,
  breadcrumbs,
  brands,
  onClose,
}: {
  product: Product;
  breadcrumbs: string[];
  brands: Brand[];
  onClose: () => void;
}) {
  // Get brand logo from brands array
  const getBrandLogo = () => {
    // First check if product already has brand logo
    if ((product as any)['brand logo']) {
      return (product as any)['brand logo'];
    }
    
    // Find brand in brands array by ID
    if (product.brand) {
      const brandId = typeof product.brand === 'number' 
        ? product.brand 
        : typeof product.brand === 'string' 
        ? parseInt(product.brand) 
        : null;
      
      if (brandId) {
        const brand = brands.find(b => 
          b.id === brandId || 
          b.documentId === brandId?.toString() ||
          (typeof b.id === 'string' && parseInt(b.id) === brandId)
        );
        if (brand) {
          // Prefer logoUrl, then logo.url
          if (brand.logoUrl) {
            return brand.logoUrl;
          }
          if (brand.logo?.url) {
            return brand.logo.url;
          }
        }
      }
    }
    
    return null;
  };

  // Transform product data to match ProductDetails component structure
  const transformedProduct: any = {
    ...product,
    'name': product.name,
    'description': product.description,
    'tagline': product.tagline,
    'specs': product.specs || {},
    // Transform images array from {url, alt} objects to URL strings
    'images': product.images?.map(img => {
      // Handle both string URLs and objects with url property
      if (typeof img === 'string') return img;
      return img.url || img;
    }) || [],
    'brand logo': getBrandLogo(),
    'special feature': (product as any)['special feature'] || null,
    'discounted price': product.discountedPrice,
    'price': product.price,
    'id': product.id,
    'documentId': product.documentId || product.id?.toString(),
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-8 overflow-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-7xl bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full max-w-7xl bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-auto product-details-page">
        <button
          type="button"
          onClick={onClose}
          className="sticky top-5 right-5 z-[80] ml-auto flex rounded-full bg-white/90 p-2 text-gray-600 shadow-lg hover:bg-white transition-colors mr-5 mt-5"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        <div className="bg-transparent">
          <ClientAuthProvider>
            <CartProvider>
              <ProductDetails product={transformedProduct} previewMode={true} />
            </CartProvider>
          </ClientAuthProvider>
        </div>
        </div>
      </div>
    </div>
  );
}