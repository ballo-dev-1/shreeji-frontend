'use client'

import { useState, useEffect } from 'react'
import Layout from './Layout'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PencilIcon,
  Squares2X2Icon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import api from '@/app/lib/admin/api'
import { processProductImages, normalizeImageUrl } from '@/app/lib/admin/image-mapping'
import EditProductModal from './EditProductModal'
import toast from 'react-hot-toast'
import { ProductGridSkeleton, TableSkeleton } from '@/app/components/ui/Skeletons'
import { currencyFormatter } from '@/app/components/checkout/currency-formatter'

interface Product {
  id: number
  documentId?: string
  name: string
  slug: string
  category: string | number // Can be category ID (number) or legacy string
  subcategory?: string | number | null // Can be subcategory ID (number) or legacy string, optional
  brand: string | number // Can be brand ID (number) or legacy string
  price: string
  discountedPrice?: string
  tagline?: string
  description?: string
  specs?: any
  isActive: boolean
  images: Array<{ url: string; alt: string; isMain?: boolean }>
  SKU?: string
  stockQuantity?: number
  minStockLevel?: number
  maxStockLevel?: number
  stockStatus?: 'in-stock' | 'low-stock' | 'out-of-stock' | 'discontinued' | string
  basePrice?: number
  basePriceUsd?: number
  sellingPriceUsd?: number
  exchangeRate?: number
  taxRate?: number
  discountPercent?: number
  weight?: number
  Dimensions?: { length: number; width: number; height: number; unit: string } | any
}

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [bulkImportText, setBulkImportText] = useState('')
  const [bulkPriceText, setBulkPriceText] = useState('')
  const [bulkStatusText, setBulkStatusText] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.getProducts({ 
        pagination: { page: 1, pageSize: 100 },
        sort: 'createdAt:desc' // Show newest products first
      })
      
      console.log('API Response:', response)
      console.log('Response meta:', response.meta)
      
      // Handle NestJS response structure: { data: [...], meta: {...} }
      // Products are in response.data array
      const productsArray = response.data || []
      
      console.log('Products array length:', productsArray.length)
      console.log('First product in array:', productsArray[0])
      
      if (productsArray.length === 0) {
        setError('No products found. Make sure products exist in the backend and the API is configured correctly.')
      }
      
      // Transform NestJS data to match our interface
      const transformedProducts = productsArray
        .map((product: any) => {
          try {
            // Handle NestJS structure - products are returned directly
            const productData = product
            // Use enhanced image processing that prioritizes local images
            const images = processProductImages(productData);

            // Extract brand name (handle both string and object)
            const brand = typeof productData.brand === 'object' && productData.brand !== null
              ? productData.brand.name || productData.brand
              : productData.brand || '';

            // Extract subcategory name (handle both string and object)
            const subcategory = typeof productData.subcategory === 'object' && productData.subcategory !== null
              ? productData.subcategory.name || productData.subcategory
              : productData.subcategory || null;

            // Ensure id is a number
            const productId = typeof product.id === 'number' 
              ? product.id 
              : typeof product.id === 'string' 
                ? parseInt(product.id, 10) 
                : typeof productData.id === 'number'
                  ? productData.id
                  : parseInt(productData.id || '0', 10);

            const documentIdValue = product.documentId || productData.documentId || productId.toString();
            const transformed: Product = {
              id: productId,
              ...(documentIdValue && { documentId: documentIdValue }),
              name: productData.name,
              slug: productData.slug,
              category: productData.category || '',
              subcategory: subcategory,
              brand: brand,
              price: productData.price || productData.sellingPrice || '0',
              discountedPrice: productData.discountedPrice || null,
              tagline: productData.tagline,
              description: productData.description,
              specs: productData.specs,
              isActive: productData.isActive ?? true,
              images: images,
              SKU: productData.SKU || productData.sku,
              stockQuantity: productData.stockQuantity,
              minStockLevel: productData.minStockLevel,
              maxStockLevel: productData.maxStockLevel,
              stockStatus: productData.stockStatus,
              basePrice: productData.basePrice !== undefined && productData.basePrice !== null 
                ? productData.basePrice 
                : undefined,
              weight: productData.weight,
              Dimensions: productData.Dimensions || productData.dimensions
            };
            return transformed;
          } catch (error) {
            console.error('Error transforming product:', product, error);
            return null;
          }
        })
        .filter((p): p is Product => {
          // Type guard: ensure p is not null and has required fields
          return p !== null && 
                 typeof p.id === 'number' && 
                 typeof p.name === 'string' &&
                 typeof p.brand === 'string';
        }) // Remove any failed transformations

      console.log('Transformed products:', transformedProducts)
      console.log('Transformed products count:', transformedProducts.length)
      console.log('Product IDs:', transformedProducts.map(p => ({ id: p.id, name: p.name })))
      
      setProducts(transformedProducts)
      setFilteredProducts(transformedProducts)
    } catch (error: any) {
      console.error('Error fetching products:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        stack: error.stack
      })
      
      // Set user-friendly error message
      if (error.status === 401 || error.status === 403) {
        setError(
          'Authentication failed. Please ensure you have logged in or configured an API token. ' +
          'Please check your backend API configuration. Ensure NEXT_PUBLIC_ECOM_API_URL is set correctly in .env.local'
        )
      } else if (error.status === 404) {
        setError('Products endpoint not found. Make sure the backend is running and the products API is available.')
      } else {
        setError(`Failed to load products: ${error.message || 'Unknown error'}`)
      }
      
      // Set empty arrays instead of mock data
      setProducts([])
      setFilteredProducts([])
    } finally {
      setLoading(false)
    }
  }

  const parseCsvLines = (text: string) => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(',').map((v) => v.trim()));
  };

  const handleBulkImport = async () => {
    if (!bulkImportText.trim()) {
      toast.error('Please paste CSV rows to import.');
      return;
    }
    try {
      setBulkLoading(true);
      // Expect header: name,sku,category,sellingPrice,discountedPrice,stockQuantity
      const lines = parseCsvLines(bulkImportText);
      const hasHeader = lines[0]?.[0]?.toLowerCase() === 'name';
      const dataLines = hasHeader ? lines.slice(1) : lines;
      const products = dataLines.map((cols) => ({
        name: cols[0],
        sku: cols[1],
        category: cols[2],
        sellingPrice: cols[3] ? Number(cols[3]) : undefined,
        discountedPrice: cols[4] ? Number(cols[4]) : undefined,
        stockQuantity: cols[5] ? Number(cols[5]) : undefined,
      }));
      await api.bulkImportProducts({ products });
      toast.success('Bulk import queued/completed');
      setBulkImportText('');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || 'Bulk import failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkPriceUpdate = async () => {
    if (!bulkPriceText.trim()) {
      toast.error('Please paste rows: sku,sellingPrice,discountedPrice(optional)');
      return;
    }
    try {
      setBulkLoading(true);
      const lines = parseCsvLines(bulkPriceText);
      const hasHeader = lines[0]?.[0]?.toLowerCase() === 'sku';
      const dataLines = hasHeader ? lines.slice(1) : lines;
      const priceUpdates = dataLines.map((cols) => ({
        sku: cols[0],
        sellingPrice: Number(cols[1]),
        discountedPrice: cols[2] ? Number(cols[2]) : undefined,
      }));
      await api.bulkUpdateProducts({ action: 'price', priceUpdates });
      toast.success('Prices updated');
      setBulkPriceText('');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || 'Bulk price update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatusText.trim()) {
      toast.error('Please paste rows: sku,status');
      return;
    }
    try {
      setBulkLoading(true);
      const lines = parseCsvLines(bulkStatusText);
      const hasHeader = lines[0]?.[0]?.toLowerCase() === 'sku';
      const dataLines = hasHeader ? lines.slice(1) : lines;
      const statusUpdates = dataLines.map((cols) => ({
        sku: cols[0],
        status: cols[1],
      }));
      await api.bulkUpdateProducts({ action: 'status', statusUpdates });
      toast.success('Statuses updated');
      setBulkStatusText('');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || 'Bulk status update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    let filtered = products

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchLower) ||
        (typeof product.brand === 'string' ? product.brand.toLowerCase() : String(product.brand)).includes(searchLower) ||
        (typeof product.category === 'string' ? product.category.toLowerCase() : String(product.category)).includes(searchLower) ||
        (product.subcategory && (typeof product.subcategory === 'string' ? product.subcategory.toLowerCase() : String(product.subcategory)).includes(searchLower))
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    if (selectedSubcategory) {
      filtered = filtered.filter(product => product.subcategory === selectedSubcategory)
    }

    if (selectedBrand) {
      filtered = filtered.filter(product => product.brand === selectedBrand)
    }

    setFilteredProducts(filtered)
  }, [searchTerm, selectedCategory, selectedSubcategory, selectedBrand, products])

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
  const subcategories = Array.from(new Set(products.map(p => p.subcategory).filter(Boolean)))
  const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)))

  const handleDelete = async (id: number) => {
    try {
      // Call the API to delete from backend
      await api.deleteProduct(id);
      
      // Only update local state after successful API call
      setProducts(products.filter(p => p.id !== id));
      setFilteredProducts(filteredProducts.filter(p => p.id !== id));
      
      // Success notification is handled by EditProductModal
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error?.message || 'Failed to delete product. Please try again.');
      // Optionally refresh products list to ensure consistency
      fetchProducts();
    }
  }

  const toggleActive = (id: number) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, isActive: !p.isActive } : p
    ))
  }

  const handleEditProduct = async (product: Product) => {
    try {
      // Fetch full product details to get all fields including basePrice, taxRate, etc.
      const productId = product.documentId || product.id;
      if (productId) {
        const fullProductResponse = await api.getProduct(productId);
        console.log('Full product data fetched:', fullProductResponse);
        
        // Handle NestJS response structure: { data: {...} } or direct object
        const productData = fullProductResponse.data || fullProductResponse;
        
        // Process images
        const images = processProductImages(productData);
        
        // Extract brand (handle both object and ID)
        let brandValue: string | number = product.brand;
        if (productData.brand) {
          if (typeof productData.brand === 'object' && productData.brand !== null) {
            brandValue = productData.brand.id || productData.brand.name || product.brand;
          } else {
            brandValue = productData.brand;
          }
        }
        
        // Extract category
        let categoryValue: string | number = product.category;
        if (productData.category) {
          if (typeof productData.category === 'object' && productData.category !== null) {
            categoryValue = productData.category.id || productData.category.name || product.category;
          } else {
            categoryValue = productData.category;
          }
        }
        
        // Extract subcategory
        let subcategoryValue: string | number | null | undefined = product.subcategory;
        if (productData.subcategory !== undefined) {
          if (typeof productData.subcategory === 'object' && productData.subcategory !== null) {
            subcategoryValue = productData.subcategory.id || productData.subcategory.name || product.subcategory;
          } else {
            subcategoryValue = productData.subcategory;
          }
        }
        
        // Build full product object with all fields
        const fullProduct: any = {
          id: product.id,
          documentId: product.documentId || productId.toString(),
          name: productData.name || product.name,
          slug: productData.slug || product.slug,
          category: categoryValue,
          subcategory: subcategoryValue,
          brand: brandValue,
          price: productData.price || productData.sellingPrice || product.price,
          discountedPrice: productData.discountedPrice !== undefined && productData.discountedPrice !== null 
            ? String(productData.discountedPrice) 
            : product.discountedPrice,
          tagline: productData.tagline ?? product.tagline,
          description: productData.description ?? product.description,
          specs: productData.specs ?? product.specs,
          isActive: productData.isActive ?? product.isActive,
          images: images,
          SKU: productData.SKU || productData.sku || product.SKU,
          stockQuantity: productData.stockQuantity ?? product.stockQuantity,
          minStockLevel: productData.minStockLevel ?? product.minStockLevel,
          maxStockLevel: productData.maxStockLevel ?? product.maxStockLevel,
          stockStatus: productData.stockStatus ?? product.stockStatus,
          basePrice: productData.basePrice ?? productData.costPrice ?? product.basePrice,
          taxRate: productData.taxRate ?? product.taxRate,
          discountPercent: productData.discountPercent ?? product.discountPercent,
          weight: productData.weight ?? product.weight,
          Dimensions: productData.Dimensions || productData.dimensions || product.Dimensions,
          // Include additional fields that EditProductModal expects
          color: productData.color,
          condition: productData.condition,
          warrantyPeriod: productData.warrantyPeriod,
          attributes: productData.attributes,
          metaTitle: productData.metaTitle,
          metaDescription: productData.metaDescription,
          metaKeywords: productData.metaKeywords,
          ogImage: productData.ogImage,
          schemaMarkup: productData.schemaMarkup,
        };
        
        console.log('Full product prepared for edit:', fullProduct);
        setEditingProduct(fullProduct);
        setShowEditModal(true);
      } else {
        // Fallback to using the product from list if no ID
        console.warn('No product ID available, using partial product data');
        setEditingProduct(product);
        setShowEditModal(true);
      }
    } catch (error: any) {
      console.error('Error fetching full product details:', error);
      toast.error('Failed to load complete product details. Some fields may be missing.');
      // Fallback to using the product from list
      setEditingProduct(product);
      setShowEditModal(true);
    }
  }

  const handleSaveProduct = async (updatedProduct: Product) => {
    try {
      // Use documentId if available, otherwise use id
      const productId = updatedProduct.documentId || updatedProduct.id;
      if (!productId) {
        console.error('No product ID found for product')
        throw new Error('Product ID is missing. Cannot save product.')
      }
      
      // Ensure documentId is set for the API call
      if (!updatedProduct.documentId && updatedProduct.id) {
        updatedProduct.documentId = updatedProduct.id.toString();
      }

      // Prepare the data for NestJS backend - only include fields that have values
      // Convert price strings to numbers (remove currency symbols and commas)
      const priceValue = typeof updatedProduct.price === 'string' 
        ? parseFloat(updatedProduct.price.replace(/[^0-9.]/g, '')) || 0
        : updatedProduct.price || 0;
      
      const discountedPriceValue = updatedProduct.discountedPrice
        ? (typeof updatedProduct.discountedPrice === 'string'
          ? parseFloat(updatedProduct.discountedPrice.replace(/[^0-9.]/g, '')) || null
          : updatedProduct.discountedPrice)
        : null;

      let normalizedSubcategory: string | number | null =
        updatedProduct.subcategory === undefined ? null : (updatedProduct.subcategory as string | number | null);
      if (typeof normalizedSubcategory === 'string') {
        normalizedSubcategory = normalizedSubcategory.trim() || null;
      }

      const productData = {
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        category: updatedProduct.category,
        subcategory: normalizedSubcategory,
        brand: updatedProduct.brand,
        price: priceValue,
        discountedPrice: discountedPriceValue,
        tagline: updatedProduct.tagline || null,
        description: updatedProduct.description || null,
        specs: updatedProduct.specs || null,
        images: updatedProduct.images || null,
        isActive: updatedProduct.isActive,
        // Provide default values for required fields
        sku: updatedProduct.SKU || `SKU-${Date.now()}`,
        stockQuantity: updatedProduct.stockQuantity || 0,
        ...(updatedProduct.minStockLevel !== undefined && updatedProduct.minStockLevel !== null && { minStockLevel: updatedProduct.minStockLevel }),
        ...(updatedProduct.maxStockLevel !== undefined && updatedProduct.maxStockLevel !== null && { maxStockLevel: updatedProduct.maxStockLevel }),
        ...(updatedProduct.stockStatus && { stockStatus: updatedProduct.stockStatus }),
        ...(updatedProduct.basePrice !== undefined && updatedProduct.basePrice !== null && { basePrice: updatedProduct.basePrice }),
        ...(updatedProduct.basePriceUsd !== undefined && updatedProduct.basePriceUsd !== null && { basePriceUsd: updatedProduct.basePriceUsd }),
        ...(updatedProduct.sellingPriceUsd !== undefined && updatedProduct.sellingPriceUsd !== null && { sellingPriceUsd: updatedProduct.sellingPriceUsd }),
        ...(updatedProduct.exchangeRate !== undefined && updatedProduct.exchangeRate !== null && { exchangeRate: updatedProduct.exchangeRate }),
        ...(updatedProduct.taxRate !== undefined && updatedProduct.taxRate !== null && { taxRate: updatedProduct.taxRate }),
        ...(updatedProduct.discountPercent !== undefined && updatedProduct.discountPercent !== null && { discountPercent: updatedProduct.discountPercent }),
        ...(updatedProduct.weight !== undefined && updatedProduct.weight !== null && { weight: updatedProduct.weight }),
        ...(updatedProduct.Dimensions && { dimensions: updatedProduct.Dimensions }),
      }

      console.log('Updating product with data:', productData)
      console.log('Product ID:', productId)
      
      const response = await api.updateProduct(productId, productData)
      console.log('Update response:', response)
      
      // Refresh products list to get latest data
      await fetchProducts()
      
      toast.success('Product updated successfully!')
      console.log('Product updated successfully')
    } catch (error: any) {
      console.error('Error updating product:', error)
      
      // Provide more specific error messages
      if (error.response?.status === 404) {
        throw new Error('Product not found. It may have been deleted.')
      } else if (error.response?.status === 401) {
        throw new Error('Unauthorized. Please check your API permissions.')
      } else if (error.response?.status === 403) {
        throw new Error('Forbidden. You do not have permission to update this product.')
      } else if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again later.')
      } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        throw new Error('Cannot connect to server. Please check if the backend is running.')
      } else {
        throw error // Re-throw so the modal can handle the error
      }
    }
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingProduct(null)
  }

  if (loading) {
    return (
      <Layout currentPage="Products">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse mt-4 sm:mt-0"></div>
          </div>

          {/* Filters Skeleton */}
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>

          {/* Products Skeleton */}
          {viewMode === 'grid' ? (
            <ProductGridSkeleton count={8} />
          ) : (
            <TableSkeleton rows={8} columns={5} />
          )}
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPage="Products" pageTitle="Product Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mt-1 text-sm text-gray-500">
              Manage your product catalog ({filteredProducts.length} products)
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <button
              onClick={() => setShowBulkImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              Import Data
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Product
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Error Loading Products</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => window.location.reload()}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters & Actions */}
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, brand, category, subcategory..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <select
              className="input-field"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setSelectedSubcategory('') // Reset subcategory when category changes
              }}
            >
              <option value="">All Categories</option>
              {categories.map((category, index) => (
                <option key={`category-${category}-${index}`} value={category}>{category}</option>
              ))}
            </select>

            {/* Subcategory Filter */}
            <select
              className="input-field"
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              disabled={!selectedCategory}
            >
              <option value="">All Subcategories</option>
              {subcategories
                .filter(sub => !selectedCategory || products.some(p => p.category === selectedCategory && p.subcategory === sub))
                .map((subcategory, index) => (
                  <option key={`subcategory-${subcategory}-${index}`} value={subcategory}>{subcategory}</option>
                ))}
            </select>

            {/* Brand Filter */}
            <select
              className="input-field"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              <option value="">All Brands</option>
              {brands.map((brand, index) => (
                <option key={`brand-${brand}-${index}`} value={brand}>{brand}</option>
              ))}
            </select>

            {/* View Mode and Clear Filters */}
            <div className="flex space-x-2">
              <div className="relative group">
                <button
                  className={`px-3 py-2 rounded-lg flex items-center justify-center ${viewMode === 'grid' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Grid View
                </span>
              </div>
              <div className="relative group">
                <button
                  className={`px-3 py-2 rounded-lg flex items-center justify-center ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setViewMode('list')}
                >
                  <Bars3Icon className="w-5 h-5" />
                </button>
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  List View
                </span>
              </div>
              <div className="relative group">
                <button
                  className="px-3 py-2 rounded-lg flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200"
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory('')
                    setSelectedSubcategory('')
                    setSelectedBrand('')
                  }}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Clear All Filters
                </span>
              </div>
              
            </div>
          </div>
        </div>

        {/* Products */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={`product-${product.id}-${product.slug}`}
                product={product}
                onToggleActive={toggleActive}
                onEdit={handleEditProduct}
              />
            ))}
          </div>
        ) : (
          <ProductTable
            products={filteredProducts}
            onToggleActive={toggleActive}
            onEdit={handleEditProduct}
          />
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <EditProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        product={null}
        onSuccess={() => {
          setShowAddModal(false)
          // Reset filters to ensure new product is visible
          setSelectedCategory('')
          setSelectedSubcategory('')
          setSelectedBrand('')
          setSearchTerm('')
          // Force refresh
          fetchProducts()
        }}
      />

      {/* Bulk Import Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Bulk Import Products</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowBulkImportModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Use this modal for all bulk actions: import new products, update prices, or update stock status.
              </p>
              <div className="space-y-6">
                {/* Bulk Import */}
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold text-gray-900">Bulk Import</h4>
                    <button
                      type="button"
                      onClick={async () => {
                        const tpl = await api.getBulkImportTemplate();
                        setBulkImportText(typeof tpl === 'string' ? tpl : ((tpl as any)?.data || ''));
                      }}
                      className="text-xs text-[var(--shreeji-primary)] hover:underline"
                    >
                      Load template
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">
                    Columns: <strong>name, sku, category, sellingPrice, discountedPrice, stockQuantity</strong>.
                    Header row is optional.
                  </p>
                  <textarea
                    className="w-full h-32 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:border-transparent text-sm"
                    placeholder="Example:
name,sku,category,sellingPrice,discountedPrice,stockQuantity
Sample Product,SKU-123,Category A,100,90,50"
                    value={bulkImportText}
                    onChange={(e) => setBulkImportText(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button
                      className="px-4 py-2 rounded-lg bg-[var(--shreeji-primary)] text-white hover:opacity-90 disabled:opacity-60"
                      onClick={handleBulkImport}
                      disabled={bulkLoading}
                    >
                      {bulkLoading ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                </div>

                {/* Bulk Price Update */}
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-base font-semibold text-gray-900">Bulk Price Update</h4>
                  <p className="text-xs text-gray-600">Rows: <strong>sku, sellingPrice, discountedPrice (optional)</strong></p>
                  <textarea
                    className="w-full h-28 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="SKU-123,120,99"
                    value={bulkPriceText}
                    onChange={(e) => setBulkPriceText(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                      onClick={handleBulkPriceUpdate}
                      disabled={bulkLoading}
                    >
                      {bulkLoading ? 'Updating...' : 'Update Prices'}
                    </button>
                  </div>
                </div>

                {/* Bulk Status Update */}
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-base font-semibold text-gray-900">Bulk Status Update</h4>
                  <p className="text-xs text-gray-600">Rows: <strong>sku, status</strong> (in-stock | low-stock | out-of-stock | discontinued)</p>
                  <textarea
                    className="w-full h-28 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm"
                    placeholder="SKU-123,in-stock"
                    value={bulkStatusText}
                    onChange={(e) => setBulkStatusText(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button
                      className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-60"
                      onClick={handleBulkStatusUpdate}
                      disabled={bulkLoading}
                    >
                      {bulkLoading ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                  onClick={() => {
                    setShowBulkImportModal(false)
                    setBulkImportText('')
                    setBulkPriceText('')
                    setBulkStatusText('')
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        product={editingProduct}
        onSave={handleSaveProduct}
        onDelete={handleDelete}
      />
    </Layout>
  )
}

function ProductCard({ product, onToggleActive, onEdit }: { 
  product: Product, 
  onToggleActive: (id: number) => void,
  onEdit: (product: Product) => void
}) {
  // Get the main image or fallback
  const mainImage = product.images && product.images.length > 0 
    ? product.images[0] 
    : { url: 'https://via.placeholder.com/300x200?text=No+Image', alt: product.name };
  
  // Format prices
  const price = typeof product.price === 'string' 
    ? parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0
    : Number(product.price) || 0;
  const discountedPrice = product.discountedPrice
    ? (typeof product.discountedPrice === 'string'
      ? parseFloat(product.discountedPrice.replace(/[^0-9.]/g, '')) || 0
      : Number(product.discountedPrice) || 0)
    : null;
  
  return (
    <div
      className="card overflow-hidden cursor-pointer rounded-[0.5rem]"
      onClick={() => onEdit(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(product)
        }
      }}
    >
      <div className="aspect-w-16 aspect-h-9 bg-gray-200">
        <img
          src={normalizeImageUrl(mainImage.url)}
          alt={mainImage.alt || product.name}
          className="w-full h-48 object-cover"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Image+Error';
          }}
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {product.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-2">{product.brand} • {product.category}</p>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-lg font-semibold text-gray-900">{currencyFormatter(price)}</span>
            {discountedPrice && discountedPrice > 0 && (
              <span className="ml-2 text-sm text-gray-500 line-through">{currencyFormatter(discountedPrice)}</span>
            )}
          </div>
        </div>
        <div className="flex space-x-2" />
      </div>
    </div>
  )
}

function ProductTable({ products, onToggleActive, onEdit }: { 
  products: Product[], 
  onToggleActive: (id: number) => void,
  onEdit: (product: Product) => void
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Product</th>
              <th className="table-header">Category</th>
              <th className="table-header">Brand</th>
              <th className="table-header">Price</th>
              <th className="table-header">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              // Get the main image or fallback
              const mainImage = product.images && product.images.length > 0 
                ? product.images[0] 
                : { url: 'https://via.placeholder.com/50x50?text=No+Image', alt: product.name };
              
              // Format prices
              const price = typeof product.price === 'string' 
                ? parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0
                : Number(product.price) || 0;
              const discountedPrice = product.discountedPrice
                ? (typeof product.discountedPrice === 'string'
                  ? parseFloat(product.discountedPrice.replace(/[^0-9.]/g, '')) || 0
                  : Number(product.discountedPrice) || 0)
                : null;
              
              return (
                <tr 
                  key={`product-row-${product.id}-${product.slug}`} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onEdit(product)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onEdit(product)
                    }
                  }}
                >
                  <td className="table-cell">
                    <div className="flex items-center">
                      <img
                        src={normalizeImageUrl(mainImage.url)}
                        alt={mainImage.alt || product.name}
                        className="w-12 h-12 rounded-lg object-cover mr-4"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          e.currentTarget.src = 'https://via.placeholder.com/50x50?text=Error';
                        }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.subcategory}</p>
                      </div>
                    </div>
                  </td>
                <td className="table-cell">{product.category}</td>
                <td className="table-cell">{product.brand}</td>
                <td className="table-cell">
                  <div>
                    <p className="font-medium">{currencyFormatter(price)}</p>
                    {discountedPrice && discountedPrice > 0 && (
                      <p className="text-sm text-gray-500 line-through">{currencyFormatter(discountedPrice)}</p>
                    )}
                  </div>
                </td>
                <td className="table-cell">
                  <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleActive(product.id)
                      }}
                    className={`px-2 py-1 text-xs rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {product.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
