'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Triangle, Package } from "lucide-react";
import { filterProducts } from '@/app/lib/client/products';
import ProductPreview from '../../ProductPreview';
import { ProductListItemSkeleton } from '@/app/components/ui/Skeletons';

const LatestProductsBySubCategory = ({subcategory, count, heading}) => {
  const [latestProducts, setLatestProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const products = await filterProducts('subcategory', subcategory, count);
        setLatestProducts(products || []);
      } catch (error) {
        console.error('Error fetching products:', error);
        setLatestProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [subcategory, count]);

  const scrollRef = useRef(null);
  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth", 
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--shreeji-primary)] h-fit relative flex flex-col">
        <div className='py-5 mt-5 mx-5 border-b flex justify-between items-center'>
          <h2 className="text-4xl font-bold [text-shadow:2px_2px_4px_rgba(0,0,0,0.3)] px-5 md:px-10">{heading}</h2>
        </div>
        <div className='flex overflow-x-auto overflow-visible scroll-container pt-10 gap-14 px-5 md:px-10'>
          {Array.from({ length: 3 }).map((_, i) => (
            <ProductListItemSkeleton key={i} additionalClass={i === 0 ? 'min-w-[20rem] first:ml-20' : 'min-w-[20rem]'} />
          ))}
        </div>
      </div>
    );
  }

  if (latestProducts.length === 0) {
    return (
      <div className="bg-[var(--shreeji-primary)] h-fit relative flex flex-col">
        <div className='py-5 mt-5 mx-5 border-b flex justify-between items-center'>
          <h2 className="text-4xl font-bold [text-shadow:2px_2px_4px_rgba(0,0,0,0.3)] px-5 md:px-10">{heading}</h2>
        </div>
        <div className='flex items-center justify-center py-16 px-5 md:px-10'>
          <div className="text-center">
            <Package className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <p className="text-white text-lg font-medium mb-2">No products available</p>
            <p className="text-white/70 text-sm">Check back soon for new {subcategory.toLowerCase()} products.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--shreeji-primary)] h-fit relative flex flex-col ">
      <div className='py-5 mt-5 mx-5 border-b flex justify-between items-center'>
        <h2 className="text-4xl font-bold [text-shadow:2px_2px_4px_rgba(0,0,0,0.3)] px-5 md:px-10">{heading}</h2>
        <div className="flex gap-5 text-black">
          <button
            onClick={() => scroll("left")}
            className="z-10 bg-white shadow-lg rounded-full p-3 h-10 w-10 flex-center"
          >
            <ChevronLeft strokeWidth={3} className="w-6 h-6" />
          </button>

          <button
            onClick={() => scroll("right")}
            className="z-10 bg-white shadow-lg rounded-full p-3 h-10 w-10 flex-center"
          >
            <ChevronRight strokeWidth={3} className="w-6 h-6" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className='flex overflow-x-auto overflow-visible scroll-container pt-10 gap-14'>
        {latestProducts.map((product, index) => (
          <ProductPreview key={product.id || product.documentId || index} product={product} index={index} additionalClass={'min-w-[20rem] first:ml-20'} />  
        ))}
      </div>
    </div> 
  )
}

export default LatestProductsBySubCategory