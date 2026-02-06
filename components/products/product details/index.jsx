'use client'

import Image from 'next/image'
import './style.scss'
import { ArrowRightCircle } from 'lucide-react'
import Link from 'next/link';
import ProductImage from './product image';
import SpecialFeaturBudge from './special feature badge';
import RequestQuoteModal from '../request quote';
import { useState, useEffect, useRef } from 'react';
import { useCart } from '@/app/contexts/CartContext';
import toast from 'react-hot-toast';
import QuantityInput from '../QuantityInput';
import { ToastWithProgress } from '@/app/components/ToastWithProgress';
import clientApi from '@/app/lib/client/api';
import WishlistButton from '@/app/components/products/WishlistButton';

const ProductDetails = ({product, previewMode = false}) => {  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [brandLogoError, setBrandLogoError] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [displayPrice, setDisplayPrice] = useState(null)
  const [displayDiscountedPrice, setDisplayDiscountedPrice] = useState(null)
  const [variants, setVariants] = useState([])
  const [loadingVariants, setLoadingVariants] = useState(true)
  const [validCombinations, setValidCombinations] = useState([]) // Precomputed valid combinations
  const [selectedSpecValues, setSelectedSpecValues] = useState({}) // Track which spec values are selected
  const [invalidCombination, setInvalidCombination] = useState(false)
  const lastLoggedCombinationRef = useRef(null) // Track last logged valid combination to avoid duplicates
  const { addItem } = useCart()
  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  // Initialize display prices from product
  useEffect(() => {
    if (product) {
      setDisplayPrice(product.price || null)
      setDisplayDiscountedPrice(product['discounted price'] || null)
    }
  }, [product])

  // Load variants
  useEffect(() => {
    if (product?.id) {
      // Reset logged combination ref when product changes
      lastLoggedCombinationRef.current = null
      loadVariants()
    }
  }, [product?.id])

  // Track invalid combinations (debounced)
  const logInvalidCombination = async (selectedSpecs) => {
    if (!product?.id) return
    
    try {
      // Log to console for now - can be connected to backend API later
      console.log('⚠️ Invalid combination attempted:', {
        productId: product.id,
        productName: product.name,
        selectedSpecs,
        timestamp: new Date().toISOString(),
      })
      
      // TODO: Uncomment when backend API is ready
      // await clientApi.logInvalidCombination({
      //   productId: product.id,
      //   selectedSpecs,
      //   timestamp: new Date().toISOString(),
      // })
    } catch (error) {
      console.error('Failed to log invalid combination:', error)
    }
  }

  // Track valid combinations
  const logValidCombination = async (variant, selectedSpecs, completeSelection) => {
    if (!product?.id || !variant) return
    
    // Build a unique key for this combination to avoid duplicate logs
    const combinationKey = JSON.stringify({
      variantId: variant.id,
      selectedSpecs: completeSelection || selectedSpecs
    })
    
    // Skip if we already logged this exact combination
    if (lastLoggedCombinationRef.current === combinationKey) {
      return
    }
    
    lastLoggedCombinationRef.current = combinationKey
    
    try {
      // Log to console for now - can be connected to backend API later
      console.log('✅ Valid combination selected:', {
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantSku: variant.sku,
        selectedSpecs: completeSelection || selectedSpecs,
        price: variant.price,
        discountedPrice: variant.discountedPrice,
        stockStatus: variant.stockStatus,
        timestamp: new Date().toISOString(),
      })
      
      // TODO: Uncomment when backend API is ready
      // await clientApi.logValidCombination({
      //   productId: product.id,
      //   variantId: variant.id,
      //   selectedSpecs: completeSelection || selectedSpecs,
      //   timestamp: new Date().toISOString(),
      // })
    } catch (error) {
      console.error('Failed to log valid combination:', error)
    }
  }

  // Update variant and price when spec selection changes
  useEffect(() => {
    console.log('🔄 [DEBUG] Price update effect triggered:', {
      selectedSpecValues,
      validCombinationsCount: validCombinations.length,
      hasProductSpecs: !!product?.specs
    })

    if (!product?.specs) {
      console.log('⚠️ [DEBUG] No product specs, skipping price update')
      return
    }

    // If no valid combinations, use product default prices
    if (validCombinations.length === 0) {
      console.log('⚠️ [DEBUG] No valid combinations, using product default prices')
      setSelectedVariant(null)
      setDisplayPrice(product.price || null)
      setDisplayDiscountedPrice(product['discounted price'] || null)
      setInvalidCombination(false)
      return
    }

    // Build complete selection: selected specs + product defaults for unselected specs
    const completeSelection = { ...selectedSpecValues }
    Object.keys(product.specs).forEach(specKey => {
      if (!completeSelection[specKey]) {
        const productValue = String(product.specs[specKey] || '')
        if (productValue && productValue !== 'null' && productValue !== 'undefined') {
          completeSelection[specKey] = productValue
        }
      }
    })

    console.log('🔍 [DEBUG] Complete selection built:', {
      selectedSpecValues,
      completeSelection,
      productSpecs: product.specs
    })

    // Check if user has selected any non-default spec values
    const isAllDefaults = Object.keys(selectedSpecValues).length === 0
    
    // If all defaults are selected, use base product pricing (not variant pricing)
    if (isAllDefaults) {
      console.log('🏠 [DEBUG] All defaults selected, using base product pricing')
      setSelectedVariant(null)
      setInvalidCombination(false)
      setDisplayPrice(product.price || null)
      setDisplayDiscountedPrice(product['discounted price'] || null)
      lastLoggedCombinationRef.current = null
      return
    }

    // Find exact matching combinations
    const matchingCombinations = findMatchingCombinations(completeSelection)
    
    console.log('🎯 [DEBUG] Matching combinations found:', {
      exactMatches: matchingCombinations.length,
      matchingCombinations: matchingCombinations.map(m => ({
        variantId: m.variantId,
        variantSku: m.variantSku,
        specs: m.specs,
        price: m.price,
        discountedPrice: m.discountedPrice
      }))
    })

    if (matchingCombinations.length > 0) {
      // Found exact match - use the first matching combination
      const matchedCombination = matchingCombinations[0]
      console.log('✅ [DEBUG] Exact match found, updating price:', {
        variantId: matchedCombination.variantId,
        variantSku: matchedCombination.variantSku,
        price: matchedCombination.price,
        discountedPrice: matchedCombination.discountedPrice,
        specs: matchedCombination.specs
      })
      
      setSelectedVariant(matchedCombination.variant)
      setInvalidCombination(false)
      // Use variant price if available, otherwise fall back to product price
      setDisplayPrice(matchedCombination.price || product.price || null)
      setDisplayDiscountedPrice(
        (matchedCombination.discountedPrice && matchedCombination.discountedPrice > 0)
          ? matchedCombination.discountedPrice
          : (product['discounted price'] || null)
      )
      
      console.log('💰 [DEBUG] Price updated (variant):', {
        displayPrice: matchedCombination.price || product.price || null,
        displayDiscountedPrice: (matchedCombination.discountedPrice && matchedCombination.discountedPrice > 0)
          ? matchedCombination.discountedPrice
          : (product['discounted price'] || null)
      })
      
      logValidCombination(matchedCombination.variant, selectedSpecValues, completeSelection)
    } else {
      // No exact match - find best matching combination (most specs match)
      console.log('🔍 [DEBUG] No exact match, finding best match...')
      const scoredCombinations = validCombinations.map(combination => {
        let matchCount = 0
        Object.keys(completeSelection).forEach((specKey) => {
          const selectionValue = String(completeSelection[specKey] || '').trim()
          const combinationValue = String(combination.specs[specKey] || '').trim()
          if (selectionValue === combinationValue && selectionValue !== '') {
            matchCount++
          }
        })
        return { combination, matchCount }
      }).filter(item => item.matchCount > 0)
        .sort((a, b) => b.matchCount - a.matchCount)

      console.log('📊 [DEBUG] Scored combinations:', {
        count: scoredCombinations.length,
        topMatches: scoredCombinations.slice(0, 3).map(s => ({
          variantId: s.combination.variantId,
          matchCount: s.matchCount,
          price: s.combination.price
        }))
      })

      if (scoredCombinations.length > 0) {
        // Use the combination with the most matches
        const bestCombination = scoredCombinations[0].combination
        console.log('✅ [DEBUG] Best match found, updating price:', {
          variantId: bestCombination.variantId,
          variantSku: bestCombination.variantSku,
          matchCount: scoredCombinations[0].matchCount,
          price: bestCombination.price,
          discountedPrice: bestCombination.discountedPrice,
          specs: bestCombination.specs
        })
        
        setSelectedVariant(bestCombination.variant)
        setInvalidCombination(false)
        // Use variant price if available, otherwise fall back to product price
        setDisplayPrice(bestCombination.price || product.price || null)
        setDisplayDiscountedPrice(
          (bestCombination.discountedPrice && bestCombination.discountedPrice > 0)
            ? bestCombination.discountedPrice
            : (product['discounted price'] || null)
        )
        
        console.log('💰 [DEBUG] Price updated (best match):', {
          displayPrice: bestCombination.price || product.price || null,
          displayDiscountedPrice: (bestCombination.discountedPrice && bestCombination.discountedPrice > 0)
            ? bestCombination.discountedPrice
            : (product['discounted price'] || null)
        })
        
        logValidCombination(bestCombination.variant, selectedSpecValues, completeSelection)
      } else {
        // No matches at all - use product default prices
        console.log('⚠️ [DEBUG] No matches found, using product default prices')
        setSelectedVariant(null)
        setDisplayPrice(product.price || null)
        setDisplayDiscountedPrice(product['discounted price'] || null)
        setInvalidCombination(true)
        
        // Log invalid combination if user has made selections
        if (Object.keys(selectedSpecValues).length > 0) {
          logInvalidCombination(completeSelection)
        }
      }
    }
  }, [selectedSpecValues, validCombinations, product])

  const loadVariants = async () => {
    try {
      setLoadingVariants(true)
      console.log('🔄 [DEBUG] Loading variants for product:', product.id)
      const response = await clientApi.getProductVariants(product.id)
      
      const activeVariants = (response.data || []).filter((v) => v.isActive)
      
      console.log('✅ [DEBUG] Loaded variants:', {
        total: response.data?.length || 0,
        active: activeVariants.length,
        variants: activeVariants.map(v => ({
          id: v.id,
          sku: v.sku,
          attributes: v.attributes,
          price: v.price,
          discountedPrice: v.discountedPrice,
          stockStatus: v.stockStatus
        }))
      })
      
      setVariants(activeVariants)
    } catch (error) {
      console.error('❌ [DEBUG] Failed to load variants:', error)
    } finally {
      setLoadingVariants(false)
    }
  }

  // Get all variant attribute keys
  const variantAttributeKeys = Array.from(
    new Set(variants.flatMap((v) => Object.keys(v.attributes || {})))
  )
  
  // Helper function to find matching variant attribute key (case-insensitive)
  const findMatchingVariantKey = (specKey, attributeKeysArray = null) => {
    const keysToSearch = attributeKeysArray || variantAttributeKeys
    return keysToSearch.find(
      (variantKey) => variantKey.toLowerCase() === specKey.toLowerCase()
    )
  }
  
  // Helper to build complete spec selection from variant
  const buildCombinationFromVariant = (variant) => {
    const combination = {
      variant: variant,
      variantId: variant.id,
      variantSku: variant.sku,
      specs: {}, // All spec values for this combination
      price: variant.price,
      discountedPrice: variant.discountedPrice,
      stockStatus: variant.stockStatus,
    }
    
    // Build specs object from variant attributes + product defaults
    Object.keys(product.specs || {}).forEach(specKey => {
      const matchingVariantKey = findMatchingVariantKey(specKey, Object.keys(variant.attributes || {}))
      if (matchingVariantKey && variant.attributes[matchingVariantKey]) {
        combination.specs[specKey] = String(variant.attributes[matchingVariantKey])
      } else {
        // Use product default if variant doesn't have this spec
        const defaultValue = String(product.specs[specKey] || '')
        if (defaultValue && defaultValue !== 'null' && defaultValue !== 'undefined') {
          combination.specs[specKey] = defaultValue
        }
      }
    })
    
    return combination
  }

  // Helper to check if a selection matches a combination
  // A combination matches if all keys in the selection match the combination's spec values
  const combinationMatchesSelection = (combination, selection) => {
    // Check that all keys in the selection have matching values in the combination
    return Object.keys(selection).every((specKey) => {
      const selectionValue = String(selection[specKey] || '').trim()
      const combinationValue = String(combination.specs[specKey] || '').trim()
      return selectionValue === combinationValue && selectionValue !== ''
    })
  }

  // Helper to find matching combinations
  const findMatchingCombinations = (selection) => {
    return validCombinations.filter(combination => 
      combinationMatchesSelection(combination, selection)
    )
  }

  // Compute valid combinations when variants are loaded
  useEffect(() => {
    if (variants.length > 0 && product?.specs) {
      const combinations = variants.map(variant => buildCombinationFromVariant(variant))
      console.log('🔧 [DEBUG] Built valid combinations:', {
        count: combinations.length,
        combinations: combinations.map(c => ({
          variantId: c.variantId,
          variantSku: c.variantSku,
          specs: c.specs,
          price: c.price,
          discountedPrice: c.discountedPrice,
          stockStatus: c.stockStatus
        }))
      })
      setValidCombinations(combinations)
    } else {
      console.log('⚠️ [DEBUG] No combinations - variants:', variants.length, 'product.specs:', !!product?.specs)
      setValidCombinations([])
    }
  }, [variants, product?.specs])

  // Check if a spec has variant options
  const hasVariantOptions = (specKey) => {
    const matchingKey = findMatchingVariantKey(specKey)
    return !!matchingKey
  }

  // Get all available values for a spec (product value + variant values)
  // Only includes values that have at least one in-stock variant
  const getSpecOptions = (specKey) => {
    const options = new Set()
    
    // Add product spec value (always available as default)
    if (product.specs[specKey]) {
      const productValue = String(product.specs[specKey])
      if (productValue && productValue !== 'null' && productValue !== 'undefined') {
        options.add(productValue)
      }
    }
    
    // Add variant values - use case-insensitive matching
    // Only include values that have at least one in-stock variant
    const matchingVariantKey = findMatchingVariantKey(specKey)
    if (matchingVariantKey) {
      variants.forEach((variant) => {
        if (variant.attributes && variant.attributes[matchingVariantKey]) {
          const value = variant.attributes[matchingVariantKey]
          // Only add if variant is in stock
          if (variant.stockStatus !== 'out-of-stock') {
            options.add(value)
          }
        }
      })
    }
    
    return Array.from(options)
  }

  // Handle spec value selection - only updates selection state
  // Price/variant updates are handled by the useEffect
  const handleSpecValueSelect = (specKey, value) => {
    console.log('🖱️ [DEBUG] Spec value selected:', {
      specKey,
      value,
      productDefault: product.specs[specKey],
      currentSelection: selectedSpecValues
    })
    
    setSelectedSpecValues((prev) => {
      const productValue = String(product.specs[specKey] || '')
      const newSelection = { ...prev }
      
      if (value === productValue) {
        // Clicking default value - remove from selection to use product default
        console.log('🔄 [DEBUG] Removing spec from selection (using default):', specKey)
        delete newSelection[specKey]
      } else {
        // Clicking variant value - add to selection
        console.log('➕ [DEBUG] Adding spec to selection:', { specKey, value })
        newSelection[specKey] = value
      }
      
      console.log('📝 [DEBUG] New selection state:', newSelection)
      return newSelection
    })
  }

  // Get display value for a spec (either selected variant value or product value)
  const getSpecDisplayValue = (specKey) => {
    if (selectedSpecValues[specKey]) {
      return selectedSpecValues[specKey]
    }
    return product.specs[specKey]
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <p className="text-3xl font-semibold text-gray-800">Product Currently Unavailable</p>
        <p className="text-lg text-gray-600 mt-2">
          Sorry, this product is out of stock or no longer available.
        </p>
        
        <Link
          href="/products"
          className="mt-5 px-6 py-3 bg-[var(--shreeji-primary)] text-white font-medium rounded-lg hover:scale-105 transition"
        >
          View More Products
        </Link>
      </div>
    );
  }
  
  // Brand logo path mapping - maps incorrect paths to actual file paths
  const mapBrandLogoPath = (path) => {
    if (!path || typeof path !== 'string') return path;
    
    const brandLogoMap = {
      '/logos/HP.png': '/logos/HP-Logo.png',
      '/logos/Lenovo.png': '/products/brand logos/lenovo.svg',
      '/logos/Dell.png': '/products/brand logos/dell.png',
      '/logos/Asus.png': '/products/brand logos/Asus.png',
      '/logos/APC.png': '/products/brand logos/APC.svg',
      '/logos/LG.png': '/products/brand logos/LG.png',
      '/logos/Huawei.png': '/products/brand logos/huawei.png',
      '/logos/XPG.png': '/products/brand logos/xpg-logo.svg',
      '/logos/TPLink.png': '/products/brand logos/tp-link.png',
    };
    
    // Return mapped path if exists, otherwise return original
    return brandLogoMap[path] || path;
  };
  
  // Helper to normalize brand logo URL - handles both object and string formats
  const getBrandLogoUrl = () => {
    const brandLogo = product['brand logo'];
    if (!brandLogo) return null;
    
    // If it's an object with url property (Strapi format)
    if (typeof brandLogo === 'object' && brandLogo !== null) {
      const url = brandLogo.url || brandLogo.logoUrl || null;
      return url ? mapBrandLogoPath(url) : null;
    }
    
    // If it's a string, map it to correct path
    if (typeof brandLogo === 'string' && brandLogo.trim()) {
      return mapBrandLogoPath(brandLogo);
    }
    
    return null;
  };
  
  const brandLogoUrl = getBrandLogoUrl();
  
  // Helper function to format price with currency prefix
  const formatPrice = (price) => {
    if (!price) return null;
    
    // If price is already a string with "K" prefix, return as is
    if (typeof price === 'string' && price.trim().startsWith('K')) {
      return price;
    }
    
    // If price is a number, format it with "K" prefix
    if (typeof price === 'number') {
      return `K ${price.toLocaleString()}`;
    }
    
    // If price is a string without "K", try to extract number and format
    if (typeof price === 'string') {
      const numericValue = parseFloat(price.replace(/[^0-9.]/g, ''));
      if (!isNaN(numericValue)) {
        return `K ${numericValue.toLocaleString()}`;
      }
    }
    
    return price; // Fallback to original value
  };
  
  return (
    <div className="pl-5 md:pl-10 pr-5 text-black h-full pt-5 product-details pb-[2rem]">
      {brandLogoUrl && !brandLogoError && (
        <div className='w-full h-fit flex-center mb-6'>
          <Image 
            src={brandLogoUrl} 
            quality={100} 
            alt={product['name'] || 'Brand logo'} 
            width={150}
            height={64}
            className='w-auto h-16 z-[1] object-contain' 
            unoptimized={typeof brandLogoUrl === 'string' && brandLogoUrl.startsWith('http')}
            onError={() => {
              console.warn('Brand logo image failed to load:', brandLogoUrl);
              setBrandLogoError(true);
            }}
          />
        </div>
      )}
      {product['name'] && <h1 className="text-6xl font-bold text-center pb-5 bg-gradient-to-r from-[#807045] to-[#544829] bg-clip-text text-transparent">{product['name']}</h1>}
      {product['description'] && (
        <div className='relative'>
          <p className="text-2xl text-[#544829] text-center relative z-[2]">{product['description']}</p>
          
          <SpecialFeaturBudge product={product} />
        </div>
      )}
      
      <div className={`flex justify-center items-start flex-col md:flex-row ${ product['special feature'] ? 'mt-14' : ''}`}>
        <div className='flex-1 mt-10 sticky top-[250px]'>
          {product['images'] && (
            <ProductImage images={product['images']} name={product.name} product={product} />
          )}      
        </div>
          
        <div className='product-specs mt-10 md:mt-0 flex-1 md:p-10 pr-0'>  
            {/* Price Display */}
            {(displayPrice || displayDiscountedPrice) && (
              <div className='mb-6 flex items-center gap-3 flex-wrap'>
                <div className='flex items-center gap-3 flex-wrap'>
                  {displayDiscountedPrice ? (
                    <div className='flex flex-col gap-2'>
                      <div className='flex items-center gap-3 flex-wrap'>
                        <span className='text-3xl font-bold text-white bg-[var(--shreeji-primary)] w-fit px-5 py-2 rounded-lg'>
                          {formatPrice(displayDiscountedPrice)}
                        </span>
                        {displayPrice && (
                          <span className='text-xl text-gray-500 line-through'>
                            {formatPrice(displayPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    displayPrice && (
                      <div className='text-3xl font-bold text-white bg-[var(--shreeji-primary)] w-fit px-5 py-2 rounded-lg'>
                        {formatPrice(displayPrice)}
                      </div>
                    )
                  )}
                </div>
                {product?.id && (
                  <WishlistButton productId={product.id} size="md" />
                )}
              </div>
            )}

          {product['tagline'] && (
            <h1 className="text-3xl text-center md:text-start mb-1 font-bold bg-gradient-to-r from-[#807045] to-[#544829] bg-clip-text text-transparent relative">
              {product['tagline']}
            </h1>
          )}            

          {product['specs'] && (
            <div className='relative'>
              <ul className='scroll-container text-xl flex flex-col gap-2' style={{ minHeight: 'fit-content' }}>                          
                {Object.entries(product.specs).map(([key, value]) => {
                  const hasVariants = hasVariantOptions(key)
                  const specOptions = hasVariants ? getSpecOptions(key) : []
                  const displayValue = getSpecDisplayValue(key)
                  const isProductValue = !selectedSpecValues[key] || selectedSpecValues[key] === String(value)
                  
                  return (
                    <li key={key} className='flex flex-wrap gap-2 items-center'>
                      <strong className='text-[#544829] capitalize'>{key.replace(/-/g, ' ')}:</strong>{" "}
                      
                      {hasVariants && specOptions.length > 1 ? (
                        // Render as toggleable buttons - only if more than one option
                        <div className='mt-2'>
                          <div className='flex flex-wrap gap-2'>
                            {specOptions.map((option) => {
                              const isSelected = selectedSpecValues[key] === option || 
                                (!selectedSpecValues[key] && option === String(value))
                              const isProductOption = option === String(value)
                              
                              // Note: Out-of-stock options are already filtered out in getSpecOptions
                              // So all options shown here are available
                              
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => handleSpecValueSelect(key, option)}
                                  className={`px-2 py-1 rounded-lg border-2 transition-all text-base font-medium ${
                                    isSelected
                                      ? 'border-[var(--shreeji-primary)] bg-[var(--shreeji-primary)] text-white shadow-md'
                                      : 'border-gray-300 bg-white text-gray-700 hover:border-[var(--shreeji-primary)] hover:bg-gray-50'
                                  } cursor-pointer`}
                                >
                                  {option}
                                  {isProductOption && <span className="ml-1 text-xs">(Default)</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        // Render as regular text
                        typeof value === "object" && !Array.isArray(value) ? (
                          // Handle nested objects
                          Object.entries(value).map(([subKey, subValue]) => (
                            <div className='ml-10' key={subKey}>
                              <strong className='text-[#544829] capitalize'>{subKey.replace(/-/g, ' ')}:</strong> {subValue}
                            </div>
                          ))
                        ) : Array.isArray(value) ? (
                          // Handle arrays
                          <ul className='ml-10 list-disc'>
                            {value.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          // Handle regular values
                          value
                        )
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Invalid Combination Warning */}
          {invalidCombination && Object.keys(selectedSpecValues).length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ This combination is not available. Please select a different combination or contact us for custom pricing.
              </p>
            </div>
          )}

          <div>
            {/* Recommendations */}
            
            {/* <p className='text-xl font-semibold text-[#544829]'>Ready to purchase?</p>
            <p className='text-sm text-gray-500 mb-4'>Add this product to your cart and complete checkout when you&apos;re ready.</p> */}
            <div className='flex flex-col gap-3 md:flex-row md:items-center'>
              <QuantityInput
                value={quantity}
                onChange={setQuantity}
                min={1}
                className="w-auto"
              />
              
              <button
                type='button'
                onClick={async () => {
                  if (previewMode) return;
                  const productIdentifier = product?.documentId ?? product?.id
                  if (!productIdentifier) {
                    toast.error('Product identifier is missing')
                    return
                  }
                  setAddingToCart(true)
                  try {
                    // If variant is selected, we need to pass variant info
                    // For now, add the base product - variant handling in cart will be added later
                    await addItem(productIdentifier, quantity, selectedVariant?.id)
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
                    })
                  } catch (err) {
                    console.error('Add to cart error:', err)
                    toast.error(err instanceof Error ? err.message : 'Unable to add to cart. Please check if the backend is running.')
                  } finally {
                    setAddingToCart(false)
                  }
                }}
                className='w-fit rounded-2xl bg-[var(--shreeji-primary)] px-6 py-3 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70'
                disabled={previewMode || addingToCart || !(product?.documentId || product?.id)}
                style={previewMode ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
              >
                {addingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* <div className='bg-[var(--shreeji-primary)] px-10 py-3 mt-16 text-white md:text-2xl font-semibold flex justify-between items-center rounded-full border-t-[#e8d9c2] border-4'>
        <p className='hidden md:flex flex-1 text-base'>
          Shreeji House, Plot No. 1209,
          <br />
          Addis Ababa Drive
        </p>
        
        <div className='flex-1 flex justify-center items-center gap-2 text-center uppercase cursor-pointer'>
          <button onClick={handleOpenModal}>Request Quote</button>
          <ArrowRightCircle size={30} strokeWidth={2.5} />
        </div>

        <p className='hidden md:flex flex-1 text-right'>
          +260 77 116 1111
        </p>
      </div> */}

      <RequestQuoteModal 
        product={product}
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </div>
  )
}

export default ProductDetails