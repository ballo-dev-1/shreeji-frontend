'use client';

import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import './style.scss';
import { filterProducts } from '@/app/lib/client/products';
import ProductPreview from '../../ProductPreview';
import { ProductListItemSkeleton } from '@/app/components/ui/Skeletons';

const Featured = ({category, count}) => {
  const [slides, setSlides] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const scrollRef2 = useRef(null);
  
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const products = await filterProducts('category', category, count);
        setFeaturedProducts(products || []);
        
        // Split products into groups of 6 (2 rows x 3 columns)
        const groupedSlides = [];
        for (let i = 0; i < products.length; i += 6) {
          groupedSlides.push(products.slice(i, i + 6));
        }
        setSlides(groupedSlides);
      } catch (error) {
        console.error('Error fetching products:', error);
        setFeaturedProducts([]);
        setSlides([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category, count]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollRef.current.offsetWidth : scrollRef.current.offsetWidth,
        behavior: 'smooth',
      });
    }
  };

  const scroll2 = (direction) => {
    if (scrollRef2.current) {
      scrollRef2.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth", 
      });
    }
  };

  if (loading) {
    return (
      <div className="featured-section bg-[var(--shreeji-primary)] h-fit relative flex flex-col">
        <div className="py-5 mt-5 mx-5 border-b flex justify-between">
          <h2 className="text-4xl md:text-5xl font-bold md:px-10">Featured</h2>
        </div>
        <div className="hidden md:flex scroll-container overflow-hidden relative p-5">
          <div className="w-full grid grid-cols-3 grid-rows-2 gap-10">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductListItemSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className='flex md:hidden overflow-x-auto overflow-visible scroll-container pt-10 gap-14 px-5 md:px-10'>
          {Array.from({ length: 3 }).map((_, i) => (
            <ProductListItemSkeleton key={i} additionalClass={i === 0 ? 'min-w-[20rem] first:ml-20' : 'min-w-[20rem]'} />
          ))}
        </div>
      </div>
    );
  }

  if (featuredProducts.length === 0) {
    return (
      <div className="featured-section bg-[var(--shreeji-primary)] h-fit relative flex flex-col">
        <div className="py-5 mt-5 mx-5 border-b flex justify-between">
          <h2 className="text-4xl md:text-5xl font-bold md:px-10">Featured</h2>
        </div>
        <div className="flex items-center justify-center py-16 px-5 md:px-10">
          <div className="text-center">
            <Package className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <p className="text-white text-lg font-medium mb-2">No featured products available</p>
            <p className="text-white/70 text-sm">Check back soon for featured {category.toLowerCase()} products.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="featured-section bg-[var(--shreeji-primary)] h-fit relative flex flex-col">
      <div className="py-5 mt-5 mx-5 border-b flex justify-between">
        <h2 className="text-4xl md:text-5xl font-bold md:px-10">Featured</h2>
        <div className="flex gap-5 text-black">
          <button onClick={() => {scroll('left'); scroll2("left")}} className="z-10 bg-white shadow-lg rounded-full p-3 h-10 w-10 flex-center">
            <ChevronLeft strokeWidth={3} className="w-6 h-6" />
          </button>
          <button onClick={() => {scroll('right'); scroll2("right")}} className="z-10 bg-white shadow-lg rounded-full p-3 h-10 w-10 flex-center">
            <ChevronRight strokeWidth={3} className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Scrollable Container */}
      <div ref={scrollRef} className="scroll-container overflow-hidden relative">
        <div className="hidden md:flex w-full">
          {slides.map((slide, index) => (
            <div key={index} className="slide min-w-full grid grid-cols-3 grid-rows-2 gap-10 p-5">
              {slide.map((product, productIndex) => (
                <ProductPreview key={product.id || product.documentId || productIndex} product={product} index={productIndex} />  
              ))}
            </div>
          ))}
        </div>
      </div>

      <div ref={scrollRef2} className='flex md:hidden overflow-x-auto overflow-visible scroll-container pt-10 gap-14'>
        {featuredProducts.map((product, index) => (
          <ProductPreview key={product.id || product.documentId || index} product={product} index={index} additionalClass={'min-w-[20rem] first:ml-20'} />  
        ))}
      </div>
    </div>
  );
};

export default Featured;
