'use client'

import { useState, useEffect } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

interface ProductSEOEditorProps {
  seoData: {
    metaTitle?: string
    metaDescription?: string
    metaKeywords?: string
    ogImage?: string
    schemaMarkup?: Record<string, any> | string
  }
  productName?: string
  productDescription?: string
  productImages?: Array<{ url: string; alt?: string }>
  onChange: (seoData: {
    metaTitle?: string
    metaDescription?: string
    metaKeywords?: string
    ogImage?: string
    schemaMarkup?: Record<string, any>
  }) => void
}

export default function ProductSEOEditor({
  seoData,
  productName,
  productDescription,
  productImages,
  onChange,
}: ProductSEOEditorProps) {
  const normalizeSchemaMarkupText = (value?: Record<string, any> | string) => {
    if (!value) return ''

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return ''
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2)
      } catch {
        // Keep raw input visible if backend sent non-JSON text.
        return value
      }
    }

    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return ''
    }
  }

  const [metaTitle, setMetaTitle] = useState(seoData.metaTitle || '')
  const [metaDescription, setMetaDescription] = useState(seoData.metaDescription || '')
  const [metaKeywords, setMetaKeywords] = useState(seoData.metaKeywords || '')
  const [ogImage, setOgImage] = useState(seoData.ogImage || '')
  const [schemaMarkup, setSchemaMarkup] = useState(() => normalizeSchemaMarkupText(seoData.schemaMarkup))

  useEffect(() => {
    setMetaTitle(seoData.metaTitle || '')
    setMetaDescription(seoData.metaDescription || '')
    setMetaKeywords(seoData.metaKeywords || '')
    setOgImage(seoData.ogImage || '')
    setSchemaMarkup(normalizeSchemaMarkupText(seoData.schemaMarkup))
  }, [seoData.metaTitle, seoData.metaDescription, seoData.metaKeywords, seoData.ogImage, seoData.schemaMarkup])

  useEffect(() => {
    const payload: {
      metaTitle?: string
      metaDescription?: string
      metaKeywords?: string
      ogImage?: string
      schemaMarkup?: Record<string, any>
    } = {
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      metaKeywords: metaKeywords || undefined,
      ogImage: ogImage || undefined,
    }

    const trimmedSchemaMarkup = schemaMarkup.trim()
    if (trimmedSchemaMarkup) {
      try {
        payload.schemaMarkup = JSON.parse(trimmedSchemaMarkup)
      } catch {
        // Do not throw while user is editing invalid JSON.
      }
    }

    onChange({
      ...payload,
    })
  }, [metaTitle, metaDescription, metaKeywords, ogImage, schemaMarkup, onChange])

  const handleAutoGenerate = () => {
    if (productName) {
      setMetaTitle(productName)
    }
    if (productDescription) {
      setMetaDescription(productDescription.substring(0, 160))
    }
    if (productImages && productImages.length > 0) {
      setOgImage(productImages[0].url)
    }
  }

  const handleSchemaMarkupChange = (value: string) => {
    setSchemaMarkup(value)
    try {
      JSON.parse(value)
    } catch (e) {
      // Invalid JSON, but allow user to continue editing
    }
  }

  const isSchemaValid = () => {
    if (!schemaMarkup.trim()) return true
    try {
      JSON.parse(schemaMarkup)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">SEO Settings</h3>
        <button
          type="button"
          onClick={handleAutoGenerate}
          className="text-sm text-[var(--shreeji-primary)] hover:underline"
        >
          Auto-generate from product
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Title
            <span className="text-gray-400 font-normal ml-1">
              ({metaTitle.length}/60 recommended)
            </span>
          </label>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            maxLength={255}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
            placeholder={productName || 'Product title for search engines'}
          />
          <p className="mt-1 text-xs text-gray-500">
            The title that appears in search engine results. Keep it under 60 characters.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Description
            <span className="text-gray-400 font-normal ml-1">
              ({metaDescription.length}/160 recommended)
            </span>
          </label>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
            placeholder={productDescription?.substring(0, 160) || 'Product description for search engines'}
          />
          <p className="mt-1 text-xs text-gray-500">
            A brief description that appears in search results. Keep it under 160 characters.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Keywords
          </label>
          <input
            type="text"
            value={metaKeywords}
            onChange={(e) => setMetaKeywords(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
            placeholder="keyword1, keyword2, keyword3"
          />
          <p className="mt-1 text-xs text-gray-500">
            Comma-separated keywords relevant to this product.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Open Graph Image URL
          </label>
          <input
            type="text"
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)]"
            placeholder="https://example.com/image.jpg"
          />
          <p className="mt-1 text-xs text-gray-500">
            Image URL for social media sharing (Facebook, Twitter, etc.). Recommended size: 1200x630px.
          </p>
          {ogImage && (
            <div className="mt-2">
              <img
                src={ogImage}
                alt="OG Preview"
                className="max-w-xs h-auto rounded border border-gray-200"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Schema.org Markup (JSON-LD)
            {!isSchemaValid() && (
              <span className="ml-2 text-red-600 text-xs">Invalid JSON</span>
            )}
          </label>
          <textarea
            value={schemaMarkup}
            onChange={(e) => handleSchemaMarkupChange(e.target.value)}
            rows={8}
            className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:ring-[var(--shreeji-primary)] focus:border-[var(--shreeji-primary)] ${
              !isSchemaValid() ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder='{\n  "@context": "https://schema.org",\n  "@type": "Product",\n  "name": "Product Name",\n  "description": "Product description",\n  "offers": {\n    "@type": "Offer",\n    "price": "29.99",\n    "priceCurrency": "ZMW"\n  }\n}'
          />
          <div className="mt-1 flex items-start space-x-2">
            <InformationCircleIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500">
              Structured data in JSON-LD format for rich search results. Leave empty to auto-generate
              from product data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

