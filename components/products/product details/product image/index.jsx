'use client'

import Image from 'next/image'
import React, { useState } from 'react'
import SpecialFeaturBudge from '@/components/products/product details/special feature badge';
import './style.scss'

const ProductImage = ({images, name, product}) => {
  if (!images || images.length === 0) {
    return null;
  }
  
  const [activeImage, setActiveImage] = useState(images[0]);
  const isExternalUrl = (url) => typeof url === 'string' && (url.startsWith('http') || url.startsWith('/api/'));
  
  return (
    <div className='product-details-image flex flex-col'>
      <div className='product-details-image__main relative z-[2]'>
        {images.map((img, index) => (
          <Image
            src={img}
            key={`img-${index}`}
            alt={name || 'Product image'}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={`cursor-pointer transition-all duration-150 object-contain opacity-0 product-shadow ${img == activeImage && 'active-image'}`}
            unoptimized={isExternalUrl(img)}
          />
        ))}
      </div>
      <div className='flex justify-center'>
      <div className={`grid gap-2 mt-3 relative z-[3] justify-center w-fit ${
        images.length === 1 ? 'grid-cols-1' :
        images.length === 2 ? 'grid-cols-2' :
        images.length === 3 ? 'grid-cols-3' :
        images.length === 4 ? 'grid-cols-4' :
        images.length === 5 ? 'grid-cols-5' :
        images.length === 6 ? 'grid-cols-6' :
        images.length === 7 ? 'grid-cols-7' :
        images.length === 8 ? 'grid-cols-8' :
        images.length === 9 ? 'grid-cols-9' :
        'grid-cols-10'
      }`} style={{ gridTemplateColumns: `repeat(${images.length}, 1fr)` }}>
        {images.map((img, index) => (
          <Image
            src={img}
            key={`thumb-${index}`}
            alt={name || 'Product image'}            
            width={80}
            height={80}
            className={`w-20 h-20 z-[1] mx-3 relative mt-4 cursor-pointer transition-all duration-100 object-contain ${img == activeImage && 'active-image-select'}`}
            onClick={() => setActiveImage(img)}
            unoptimized={isExternalUrl(img)}
          />
        ))}
      </div>
        </div>
      
    </div>
  )
}

export default ProductImage