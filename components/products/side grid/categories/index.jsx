'use client'

import { ChevronDown, CircleDot } from "lucide-react";
import React, { useEffect, useState } from "react";
import { getAllProductsList } from "@/app/lib/client/products";
import Link from "next/link";
import SearchInput from "../SearchInput";
import { CategoryListSkeleton, SearchInputSkeleton } from '@/app/components/ui/Skeletons';

const Categories = () => {
  const [categories, setCategories] = useState([]); // Use an array instead of an object
  const [openCategory, setOpenCategory] = useState(null); // Add state for toggling
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const allProducts = await getAllProductsList();
        
        // Group categories with their subcategories
        const categoryMap = allProducts.reduce((acc, product) => {
          if (!acc[product.category]) {
            acc[product.category] = new Set();
          }
          if (product.subcategory) {
            acc[product.category].add(product.subcategory);
          }
          return acc;
        }, {});

        // Convert sets to arrays
        const structuredCategories = Object.entries(categoryMap).map(([category, subcategories]) => ({
          category,
          subcategories: [...subcategories],
        }));

        setCategories(structuredCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--shreeji-primary)] flex flex-col px-5 py-7 h-full">
        <SearchInputSkeleton />
        <CategoryListSkeleton count={8} />
      </div>
    );
  }

  return (
    <div className={`bg-[var(--shreeji-primary)] flex flex-col px-5 py-7 ${openCategory ? 'h-auto' : 'h-full'}`}>
      <SearchInput />
      <ul className="min-h-[70vh]">
        {categories.map(({ category, subcategories }, index) => (
          <li
            key={index}
            className="mr-2 px-5 flex flex-col gap-2 items-start border-b py-4 last:border-none"
          >
            <div
              className="flex gap-5 items-center"
              
            >
              <CircleDot color="#ffffff" strokeWidth={3} size={20} style={{ width: '2rem' }} />
              
              <Link href={`/products/${encodeURIComponent(category)}`} className="font-medium text-white cursor-pointer">{category}</Link>
              
              {subcategories[0] && (<ChevronDown onClick={() => setOpenCategory(openCategory === category ? null : category)} className="cursor-pointer" />)}
            </div>

            {openCategory === category && (
              <ul className="ml-4 mt-3 text-gray-300 flex flex-col gap-5">
                {subcategories.map((sub, subIndex) => (
                  <li key={subIndex} className="text-base flex gap-4">
                    <CircleDot color="#ffffff" strokeWidth={3} size={20} style={{ width: '2rem' }} />
                    <Link href={`/products/${encodeURIComponent(category)}/${encodeURIComponent(sub)}`} className="font-medium text-white cursor-pointer">{sub}</Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Categories;
