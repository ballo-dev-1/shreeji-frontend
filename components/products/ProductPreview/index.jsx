'use client'

import Link from "next/link";
import "./style.scss";
import Image from "next/image";
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from '@/app/contexts/CartContext';
import toast from 'react-hot-toast';
import { ToastWithProgress } from '@/app/components/ToastWithProgress';
import WishlistButton from '@/app/components/products/WishlistButton';

const ProductPreview = ({product, index, additionalClass}) => {
  const [addingToCart, setAddingToCart] = useState(false);
  const { addItem } = useCart();
  if (!product || !product.images || product.images.length === 0) {
    return null;
  } 

  // Derive price and discounted price similar to other components
  const rawPrice = product["discounted price"] || product.discountedPrice || product.price;
  const originalPrice = product["discounted price"]
    ? product.price
    : product.discountedPrice && product.discountedPrice > 0
      ? product.price
      : null;

  // Helper to ensure prices are always prefixed with currency "K"
  const formatPriceWithCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "number") {
      return `K ${value.toLocaleString()}`;
    }
    const str = String(value).trim();
    // Avoid double-prefixing if backend already includes "K"
    return str.startsWith("K") ? str : `K ${str}`;
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const productIdentifier = product?.documentId ?? product?.id;
    if (!productIdentifier) {
      toast.error('Product identifier is missing');
      return;
    }

    setAddingToCart(true);
    try {
      await addItem(productIdentifier, 1);
      toast.success((t) => (
        <ToastWithProgress t={t} duration={8000} />
      ), {
        duration: 8000,
        position: 'top-center',
        className: 'animation-toast',
        icon: null,
        style: {
          background: '#fff',
          color: '#000',
          padding: '20px',
          paddingBottom: '0',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          fontSize: '16px',
          minWidth: '320px',
          maxWidth: '400px',
          position: 'relative',
          overflow: 'hidden',
        },
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add product to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  return (    
    <div className={`products-page-product md:mr-2 px-5 flex flex-col gap-2 items-center py-4 relative ${additionalClass}`}>
      <Link 
        href={
          product["subcategory"]
            ? `/products/${encodeURIComponent(product.category)}/${encodeURIComponent(product["subcategory"])}/${encodeURIComponent(product.name)}`
            : `/products/${encodeURIComponent(product.category)}/${encodeURIComponent(product.name)}`
        }
        className="w-full flex flex-col gap-2 items-center cursor-pointer"
      >
        <div className="relative w-full">
          {product.images && product.images[0] && (
            <Image
              src={product.images[0]}
              alt={product.name || 'Product image'}
              width={300}
              height={300}
              className="products-page-product__image object-cover overflow-visible product-shadow"
              unoptimized={product.images[0]?.startsWith('http')}
            />
          )}
          {product.id && (
            <div className="absolute top-2 right-2 z-10">
              <WishlistButton productId={product.id} size="sm" />
            </div>
          )}
        </div>
      <div className="flex-center gap-4 pb-14">
        {product.name && (<h1 className="products-page-product__title text-2xl font-semibold line-clamp-2">{product.name}</h1>)}
        <div className="flex flex-col items-center gap-1">
          {rawPrice && (
            <div className="text-xl font-semibold text-[#fef3c7]">
              {formatPriceWithCurrency(rawPrice)}
            </div>
          )}
          {originalPrice && (
            <div className="text-sm text-[#e5e7eb] line-through">
              {formatPriceWithCurrency(originalPrice)}
            </div>
          )}
          {product.tagline && (
            <div className="text-center text-base">
              {product.tagline}
            </div>
          )}

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={addingToCart || !(product?.documentId || product?.id)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#fef3c7] px-4 py-2 text-[var(--shreeji-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 mt-2"
          >
            <ShoppingCart className="h-5 w-5" />
            <span>{addingToCart ? 'Adding...' : 'Add to Cart'}</span>
          </button>
        </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductPreview;
