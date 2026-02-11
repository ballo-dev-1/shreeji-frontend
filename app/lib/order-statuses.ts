export interface OrderStatusOption {
  value: string;
  label: string;
}

// Single source of truth for all possible order statuses in the UI
export const ALL_ORDER_STATUSES: OrderStatusOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

/**
 * Returns the list of order status options that should be shown,
 * given an optional list of enabled status values.
 *
 * - If enabledValues is null/undefined/empty, all statuses are returned.
 * - Otherwise, only options whose `value` is present in enabledValues are returned.
 */
export function getEnabledOrderStatusOptions(
  enabledValues?: string[] | null,
): OrderStatusOption[] {
  if (!enabledValues || enabledValues.length === 0) {
    return ALL_ORDER_STATUSES;
  }

  const enabledSet = new Set(enabledValues);
  return ALL_ORDER_STATUSES.filter((option) => enabledSet.has(option.value));
}

