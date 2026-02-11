'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface StickyCheckoutNavigationProps {
  currentStep: number
  totalSteps: number
  onPrevious: () => void
  onNext: () => void
  canProceed: boolean
  isLastStep: boolean
  isProcessing?: boolean
}

export default function StickyCheckoutNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  canProceed,
  isLastStep,
  isProcessing = false,
}: StickyCheckoutNavigationProps) {
  const [showButtons, setShowButtons] = useState(false)
  const SCROLL_THRESHOLD = 200 // Show buttons after scrolling 300px

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset
      setShowButtons(scrollY > SCROLL_THRESHOLD)
    }

    // Check initial scroll position
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [SCROLL_THRESHOLD])

  const canGoPrevious = currentStep > 1
  const canGoNext = canProceed && !isProcessing

  if (!showButtons) {
    return null
  }

  return (
    <>
      {/* Previous Button */}
      <button
        type='button'
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className='fixed top-1/2 -translate-y-1/2 left-10 flex h-14 w-14 items-center justify-center rounded-full bg-white border-2 border-gray-300 shadow-lg transition-all hover:bg-gray-50 hover:border-[var(--shreeji-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-gray-300'
        aria-label='Previous step'
      >
        <ChevronLeft className='h-6 w-6 text-gray-700' />
      </button>

      {/* Next Button */}
      <button
        type='button'
        onClick={onNext}
        disabled={!canGoNext}
        className='fixed top-1/2 -translate-y-1/2 right-10 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--shreeji-primary)] text-white shadow-lg transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
        aria-label={isLastStep ? 'Complete order' : 'Next step'}
      >
        {isProcessing ? (
          <div className='h-5 w-5 bg-white/30 rounded animate-pulse' />
        ) : (
          <ChevronRight className='h-6 w-6' />
        )}
      </button>
    </>
  )
}

