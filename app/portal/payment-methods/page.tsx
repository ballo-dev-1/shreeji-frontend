'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/app/contexts/ClientAuthContext'
import clientApi from '@/app/lib/client/api'
import { CreditCardIcon, TrashIcon, StarIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'
import SavedCardsList from '@/app/components/portal/SavedCardsList'
import DeleteCardModal from '@/app/components/portal/DeleteCardModal'

export interface SavedCard {
  id: number
  last4: string
  cardType: string
  expiryMonth: string
  expiryYear: string
  cardholderName?: string
  isDefault: boolean
  createdAt?: string
}

export default function PaymentMethodsPage() {
  const { loading: authLoading, isAuthenticated, user } = useClientAuth()
  const router = useRouter()
  const [cards, setCards] = useState<SavedCard[]>([])
  const [loading, setLoading] = useState(true)
  const [cardToDelete, setCardToDelete] = useState<SavedCard | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/portal/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadCards()
    }
  }, [isAuthenticated])

  const loadCards = async () => {
    try {
      setLoading(true)
      const response = await clientApi.getSavedCards()
      setCards(response.data || [])
    } catch (error: any) {
      console.error('Failed to load saved cards:', error)
      toast.error(error.message || 'Failed to load saved cards')
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (cardId: number) => {
    try {
      await clientApi.setDefaultCard(cardId)
      toast.success('Default card updated')
      loadCards()
    } catch (error: any) {
      toast.error(error.message || 'Failed to set default card')
    }
  }

  const handleDeleteClick = (card: SavedCard) => {
    setCardToDelete(card)
  }

  const handleDeleteConfirm = async () => {
    if (!cardToDelete) return

    try {
      await clientApi.deleteSavedCard(cardToDelete.id)
      toast.success('Card deleted successfully')
      setCardToDelete(null)
      loadCards()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete card')
    }
  }

  const handleDeleteCancel = () => {
    setCardToDelete(null)
  }

  const getCardTypeIcon = (cardType: string) => {
    const type = cardType?.toLowerCase() || ''
    if (type.includes('visa')) return '💳'
    if (type.includes('mastercard') || type.includes('master')) return '💳'
    if (type.includes('amex') || type.includes('american')) return '💳'
    return '💳'
  }

  const formatExpiry = (month: string, year: string) => {
    if (!month || !year) return 'N/A'
    const monthNum = parseInt(month)
    const yearNum = parseInt(year)
    if (isNaN(monthNum) || isNaN(yearNum)) return 'N/A'
    return `${monthNum.toString().padStart(2, '0')}/${yearNum.toString().slice(-2)}`
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1e8]">
        <div className="space-y-4 animate-pulse">
          <div className="h-12 w-12 bg-gray-300 rounded-full mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payment Methods</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage your saved payment methods for faster checkout
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_0_20px_0_rgba(0,0,0,0.1)] p-8">
        {cards.length === 0 ? (
          <div className="text-center py-12">
            <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No saved cards</h3>
            <p className="mt-2 text-sm text-gray-500">
              You haven't saved any payment methods yet. Cards will be saved automatically when you check out with "Save this card" enabled.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between p-6 border border-gray-200 rounded-2xl hover:border-[var(--shreeji-primary)] transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{getCardTypeIcon(card.cardType)}</div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {card.cardType?.toUpperCase() || 'CARD'} •••• {card.last4}
                      </h3>
                      {card.isDefault && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--shreeji-primary)] text-white">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {card.cardholderName || 'Cardholder'} • Expires {formatExpiry(card.expiryMonth, card.expiryYear)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {!card.isDefault && (
                    <button
                      onClick={() => handleSetDefault(card.id)}
                      className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                      title="Set as default"
                    >
                      <StarIcon className="h-5 w-5" />
                    </button>
                  )}
                  {card.isDefault && (
                    <div className="p-2 text-yellow-500" title="Default card">
                      <StarIconSolid className="h-5 w-5" />
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteClick(card)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete card"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteCardModal
        card={cardToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}

