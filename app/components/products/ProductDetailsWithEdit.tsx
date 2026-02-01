"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PencilIcon } from '@heroicons/react/24/outline';
import EditProductModal from '@/app/components/admin/EditProductModal';
import ProductDetails from '@/components/products/product details';
import api from '@/app/lib/admin/api';
import { clearProductsCache } from '@/app/lib/client/products';
import clientApi from '@/app/lib/client/api';
import { useClientAuth } from '@/app/contexts/ClientAuthContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { processProductImages } from '@/app/lib/admin/image-mapping';
import toast from 'react-hot-toast';

interface ProductDetailsWithEditProps {
  product: any;
  breadcrumbs?: string[];
  className?: string;
}

export default function ProductDetailsWithEdit({
  product,
  breadcrumbs = [],
  className = "",
}: ProductDetailsWithEditProps) {
  const router = useRouter();
  const { isAuthenticated: isClientAuthenticated } = useClientAuth();
  const { isAuthenticated: isAdminAuthenticated } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // Track product view for authenticated customers
  useEffect(() => {
    if (isClientAuthenticated && product?.id) {
      // Track product view (non-blocking)
      clientApi.trackProductView(product.id).catch(() => {
        // Silently fail - tracking is not critical
      });
    }
  }, [isClientAuthenticated, product?.id]);

  const handleSaveProduct = async (updatedProduct: any) => {
    try {
      setSaving(true);
      
      if (!updatedProduct.documentId) {
        console.error('No documentId found for product');
        throw new Error('Product ID is missing. Cannot save product.');
      }

      // Prepare the data for NestJS backend - only include fields that have values
      // Convert price strings to numbers (remove currency symbols and commas)
      const priceValue = typeof updatedProduct.price === 'string' 
        ? parseFloat(updatedProduct.price.replace(/[^0-9.]/g, '')) || 0
        : updatedProduct.price || 0;
      
      const discountedPriceValue =
        updatedProduct.discountedPrice !== undefined &&
        updatedProduct.discountedPrice !== null &&
        `${updatedProduct.discountedPrice}`.trim() !== ''
          ? (typeof updatedProduct.discountedPrice === 'string'
              ? parseFloat(updatedProduct.discountedPrice.replace(/[^0-9.]/g, '')) || 0
              : Number(updatedProduct.discountedPrice))
          : 0;

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
        ...(updatedProduct.weight !== undefined && updatedProduct.weight !== null && { weight: updatedProduct.weight }),
        ...(updatedProduct.Dimensions && { dimensions: updatedProduct.Dimensions }),
      };

      console.log('Updating product with data:', productData);
      console.log('Product ID:', updatedProduct.documentId);
      
      const response = await api.updateProduct(updatedProduct.documentId, productData);
      console.log('Update response:', response);
      
      // Clear product cache so next fetch shows fresh data
      clearProductsCache();

      // Close modal and clear editing product
      handleCloseEditModal();
      
      // Refresh the page to show updated product data
      router.refresh();
      
      console.log('Product updated successfully');
    } catch (error: any) {
      console.error('Error updating product:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 404) {
        throw new Error('Product not found. It may have been deleted.');
      } else if (error.response?.status === 401) {
        throw new Error('Unauthorized. Please check your API permissions.');
      } else if (error.response?.status === 403) {
        throw new Error('Forbidden. You do not have permission to update this product.');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        throw new Error('Cannot connect to server. Please check if the backend is running.');
      } else {
        throw error; // Re-throw so the modal can handle the error
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingProduct(null);
  };

  const handleOpenEditModal = async () => {
    try {
      setLoadingProduct(true);
      
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
        // Fallback to using the product from props if no ID
        console.warn('No product ID available, using partial product data');
        setEditingProduct(product);
        setShowEditModal(true);
      }
    } catch (error: any) {
      console.error('Error fetching full product details:', error);
      toast.error('Failed to load complete product details. Some fields may be missing.');
      // Fallback to using the product from props
      setEditingProduct(product);
    setShowEditModal(true);
    } finally {
      setLoadingProduct(false);
    }
  };

  // Show product showcase immediately, edit button will appear when auth is confirmed

  return (
    <div className="relative">
      {/* Edit Button - Only show when admin is authenticated */}
      {isAdminAuthenticated && (
        <button
          onClick={handleOpenEditModal}
          disabled={loadingProduct}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed md:bottom-8 md:right-8"
          title="Edit Product"
        >
          <PencilIcon className="h-5 w-5" />
          <span className="hidden sm:inline">
            {loadingProduct ? 'Loading...' : 'Edit Product'}
          </span>
        </button>
      )}

      {/* Product Details - Original Design */}
      <ProductDetails product={product} />

      {/* Edit Modal */}
      {showEditModal && editingProduct && (
        <EditProductModal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          product={editingProduct}
          onSave={handleSaveProduct}
          onDelete={async () => {}}
        />
      )}
    </div>
  );
}

