import React from 'react'
import HPEnvyx36014fa0008na from "@/public/products/HP Envy x360 14-fa0008na.png";
import Image from 'next/image';
import Link from 'next/link';

const PromotionBanner = ({promoProduct}) => {
  if (!promoProduct || !promoProduct.images || promoProduct.images.length === 0) {
    return null;
  }

  return (
    <div className='bg-[var(--shreeji-primary)] py-10 flex flex-col md:flex-row items-center gap-10 px-5 md:px-10'>
      {promoProduct.images.length > 1 ?
        (<Image src={promoProduct.images[1]} alt={promoProduct.name} width={500} height={400} className="hidden md:flex h-auto w-[40%] object-cover product-shadow" unoptimized={typeof promoProduct.images[1] === 'string' && (promoProduct.images[1].startsWith('http') || promoProduct.images[1].startsWith('/api/'))} />) :
        (<Image src={promoProduct.images[0]} alt={promoProduct.name} width={500} height={400} className="hidden md:flex h-auto w-[40%] object-cover product-shadow" unoptimized={typeof promoProduct.images[0] === 'string' && (promoProduct.images[0].startsWith('http') || promoProduct.images[0].startsWith('/api/'))} />)
      }
      <div className='flex-1 md:w-[60%] flex flex-col gap-3'>
        <h2 className="text-center md:text-start text-4xl font-bold md:font-extralight [text-shadow:2px_2px_4px_rgba(0,0,0,0.3)] md:line-clamp-3">{promoProduct['tagline']}</h2>
        {promoProduct.images.length > 1 ?
          (<Image src={promoProduct.images[1]} alt={promoProduct.name} width={600} height={400} className="flex md:hidden h-auto w-full object-cover product-shadow" unoptimized={typeof promoProduct.images[1] === 'string' && (promoProduct.images[1].startsWith('http') || promoProduct.images[1].startsWith('/api/'))} />) :
          (<Image src={promoProduct.images[0]} alt={promoProduct.name} width={600} height={400} className="flex md:hidden h-auto w-full object-cover product-shadow" unoptimized={typeof promoProduct.images[0] === 'string' && (promoProduct.images[0].startsWith('http') || promoProduct.images[0].startsWith('/api/'))} />)
        }
        <h2 className="text-center md:text-start text-xl md:text-4xl font-extralight md:font-bold [text-shadow:2px_2px_4px_rgba(0,0,0,0.3)] md:line-clamp-3">{promoProduct['description']}</h2>
        <div className='w-full flex-center'>
          <Link 
            href={`/products/${encodeURIComponent(promoProduct.category)}/${encodeURIComponent(promoProduct.name)}`}
            className="border-4 border-white py-1 px-5 rounded-full uppercase cursor-pointer w-fit mt-3"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PromotionBanner;