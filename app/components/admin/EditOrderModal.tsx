"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Package, Truck, CreditCard, FileText } from 'lucide-react';
import api from '@/app/lib/admin/api';
import toast from 'react-hot-toast';
import { ALL_ORDER_STATUSES, getEnabledOrderStatusOptions } from '@/app/lib/order-statuses';

// Status color helper functions (matching customer order page)
const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'delivered':
    case 'fulfilled':
      return 'bg-green-100 text-green-800';
    case 'shipped':
      return 'bg-blue-100 text-blue-800';
    case 'processing':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-indigo-100 text-indigo-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'refunded':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'refunded':
    case 'partially-refunded':
      return 'bg-orange-100 text-orange-800';
    case 'partially-paid':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
};

interface Order {
  id: number;
  orderId?: number;
  orderNumber: string;
  status?: string;
  orderStatus?: string;
  paymentStatus?: string;
  trackingNumber?: string;
  estimatedDelivery?: string | Date;
  shippedAt?: string | Date;
  deliveredAt?: string | Date;
  notes?: string;
  internalNotes?: string;
  rawOrder?: any;
}

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSave: () => void;
  enabledOrderStatuses?: string[] | null;
}

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially-paid', label: 'Partially Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partially-refunded', label: 'Partially Refunded' },
];

export default function EditOrderModal({
  isOpen,
  onClose,
  order,
  onSave,
  enabledOrderStatuses,
}: EditOrderModalProps) {
  const [formData, setFormData] = useState({
    orderStatus: '',
    paymentStatus: '',
    trackingNumber: '',
    estimatedDelivery: '',
    shippedAt: '',
    deliveredAt: '',
    notes: '',
    internalNotes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  // Compute which order status options should be shown, based on settings.
  const rawStatusOptions = getEnabledOrderStatusOptions(enabledOrderStatuses);
  const currentStatusValue = formData.orderStatus?.toLowerCase() || '';
  const hasCurrentInOptions =
    !!currentStatusValue &&
    rawStatusOptions.some((option) => option.value === currentStatusValue);

  const orderStatusOptions = !currentStatusValue || hasCurrentInOptions
    ? rawStatusOptions
    : [
        ...rawStatusOptions,
        {
          value: currentStatusValue,
          label:
            currentStatusValue.charAt(0).toUpperCase() +
            currentStatusValue.slice(1),
        },
      ];

  // Load order details when modal opens
  useEffect(() => {
    if (isOpen && order) {
      loadOrderDetails();
    }
  }, [isOpen, order]);

  // Initialize form data when order details are loaded
  useEffect(() => {
    if (orderDetails) {
      const orderStatus = orderDetails.orderStatus || orderDetails.status || '';
      const estimatedDelivery = orderDetails.estimatedDelivery
        ? new Date(orderDetails.estimatedDelivery).toISOString().split('T')[0]
        : '';
      const shippedAt = orderDetails.shippedAt
        ? new Date(orderDetails.shippedAt).toISOString().split('T')[0]
        : '';
      const deliveredAt = orderDetails.deliveredAt
        ? new Date(orderDetails.deliveredAt).toISOString().split('T')[0]
        : '';

      setFormData({
        orderStatus,
        paymentStatus: orderDetails.paymentStatus || '',
        trackingNumber: orderDetails.trackingNumber || '',
        estimatedDelivery,
        shippedAt,
        deliveredAt,
        notes: orderDetails.notes || '',
        internalNotes: orderDetails.internalNotes || '',
      });
    }
  }, [orderDetails]);

  const loadOrderDetails = async () => {
    if (!order) return;

    try {
      setLoading(true);
      const orderId = order.orderId || order.id || order.rawOrder?.id;
      
      if (!orderId) {
        console.error('Order ID not found');
        return;
      }

      // Try to get full order details from API
      try {
        const response = await api.getOrder(orderId);
        setOrderDetails(response.data);
      } catch (error: any) {
        console.error('Error loading order details:', error);
        // Fallback to using order data directly
        if (order.rawOrder) {
          setOrderDetails(order.rawOrder);
        } else {
          setOrderDetails(order);
        }
      }
    } catch (error: any) {
      console.error('Error loading order:', error);
      toast.error('Failed to load order details');
      // Fallback to using order data directly
      if (order.rawOrder) {
        setOrderDetails(order.rawOrder);
      } else {
        setOrderDetails(order);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Tracking number validation (optional but if provided, should be reasonable)
    if (formData.trackingNumber && formData.trackingNumber.length > 100) {
      newErrors.trackingNumber = 'Tracking number must be 100 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (!order) return;

    try {
      setLoading(true);
      const orderId = order.orderId || order.id || order.rawOrder?.id;

      if (!orderId) {
        toast.error('Order ID not found');
        return;
      }

      // Prepare update payload
      const updateData: any = {};

      if (formData.orderStatus && formData.orderStatus !== orderDetails?.orderStatus && formData.orderStatus !== orderDetails?.status) {
        updateData.orderStatus = formData.orderStatus;
      }

      if (formData.paymentStatus && formData.paymentStatus !== orderDetails?.paymentStatus) {
        updateData.paymentStatus = formData.paymentStatus;
      }

      if (formData.trackingNumber !== (orderDetails?.trackingNumber || '')) {
        updateData.trackingNumber = formData.trackingNumber || null;
      }

      if (formData.estimatedDelivery) {
        const estimatedDeliveryDate = new Date(formData.estimatedDelivery);
        if (!isNaN(estimatedDeliveryDate.getTime())) {
          updateData.estimatedDelivery = estimatedDeliveryDate.toISOString();
        }
      } else if (orderDetails?.estimatedDelivery && !formData.estimatedDelivery) {
        // Clear estimated delivery if it was removed
        updateData.estimatedDelivery = null;
      }

      if (formData.shippedAt) {
        const shippedAtDate = new Date(formData.shippedAt);
        if (!isNaN(shippedAtDate.getTime())) {
          updateData.shippedAt = shippedAtDate.toISOString();
        }
      } else if (orderDetails?.shippedAt && !formData.shippedAt) {
        updateData.shippedAt = null;
      }

      if (formData.deliveredAt) {
        const deliveredAtDate = new Date(formData.deliveredAt);
        if (!isNaN(deliveredAtDate.getTime())) {
          updateData.deliveredAt = deliveredAtDate.toISOString();
        }
      } else if (orderDetails?.deliveredAt && !formData.deliveredAt) {
        updateData.deliveredAt = null;
      }

      if (formData.notes !== (orderDetails?.notes || '')) {
        updateData.notes = formData.notes || null;
      }

      if (formData.internalNotes !== (orderDetails?.internalNotes || '')) {
        updateData.internalNotes = formData.internalNotes || null;
      }

      // Only update if there are changes
      if (Object.keys(updateData).length === 0) {
        toast.error('No changes to save');
        setLoading(false);
        return;
      }

      await api.updateOrder(orderId, updateData);

      toast.success('Order updated successfully');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error(error.message || 'Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        orderStatus: '',
        paymentStatus: '',
        trackingNumber: '',
        estimatedDelivery: '',
        shippedAt: '',
        deliveredAt: '',
        notes: '',
        internalNotes: '',
      });
      setErrors({});
      setOrderDetails(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal panel - styled like customer order page */}
        <div className="inline-block align-bottom bg-white max-h-[90vh] overflow-y-auto rounded-lg text-left shadow-[0_0_20px_0_rgba(0,0,0,0.1)] transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <form onSubmit={handleSubmit} className="relative">
            {/* Header - styled like customer order page */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Edit Order #{order?.orderNumber || order?.id}
                  </h1>
                  {orderDetails?.createdAt && (
                    <p className="text-sm text-gray-500 mt-1">
                      Placed on {new Date(orderDetails.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {(orderDetails?.orderStatus || orderDetails?.status) && (
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(orderDetails?.orderStatus || orderDetails?.status)}`}>
                      {orderDetails?.orderStatus || orderDetails?.status || 'pending'}
                    </span>
                  )}
                  {orderDetails?.paymentStatus && (
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(orderDetails?.paymentStatus)}`}>
                      {orderDetails?.paymentStatus}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none disabled:opacity-50"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {loading && !orderDetails ? (
                <div className="space-y-2 animate-pulse py-8">
                  <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
                  <div className="h-1 bg-gray-200 rounded w-24 mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Order & Payment Status Section */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Package className="h-5 w-5 text-[var(--shreeji-primary)]" />
                      <h2 className="text-xl font-semibold text-gray-900">Order Status</h2>
                    </div>
                    <div className="p-4 bg-[#f5f1e8] rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="orderStatus" className="block text-sm font-medium text-gray-700 mb-1">
                            Order Status
                          </label>
                          <select
                            id="orderStatus"
                            name="orderStatus"
                            value={formData.orderStatus}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                          >
                            <option value="">Select Status</option>
                            {orderStatusOptions.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="paymentStatus" className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Status
                          </label>
                          <select
                            id="paymentStatus"
                            name="paymentStatus"
                            value={formData.paymentStatus}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                          >
                            <option value="">Select Payment Status</option>
                            {PAYMENT_STATUSES.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pickup Details Section */}
                  {orderDetails && (
                    (orderDetails.paymentMethod === 'cash_on_pickup' || orderDetails.payments?.[0]?.paymentMethod === 'cash_on_pickup') &&
                    orderDetails.preferredPickupDate && (
                      <div className="mb-6 border-t border-gray-200 pt-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Package className="h-5 w-5 text-[var(--shreeji-primary)]" />
                          <h2 className="text-xl font-semibold text-gray-900">Pickup Collection Details</h2>
                        </div>
                        <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700">Preferred Pickup Date</p>
                              <p className="text-sm text-gray-900 font-semibold mt-1">
                                {orderDetails.preferredPickupDate 
                                  ? new Date(orderDetails.preferredPickupDate).toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Preferred Pickup Time</p>
                              <p className="text-sm text-gray-900 font-semibold mt-1">
                                {orderDetails.preferredPickupTime || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {(orderDetails.collectingPersonName || orderDetails.collectingPersonPhone) && (
                            <div className="border-t border-amber-200 pt-4">
                              <p className="text-sm font-medium text-gray-700 mb-2">Person Collecting</p>
                              <div className="space-y-1">
                                {orderDetails.collectingPersonName && (
                                  <p className="text-sm text-gray-900">
                                    <span className="font-medium">Name:</span> {orderDetails.collectingPersonName}
                                  </p>
                                )}
                                {orderDetails.collectingPersonPhone && (
                                  <p className="text-sm text-gray-900">
                                    <span className="font-medium">Phone:</span> {orderDetails.collectingPersonPhone}
                                  </p>
                                )}
                                {orderDetails.collectingPersonRelationship && (
                                  <p className="text-sm text-gray-900">
                                    <span className="font-medium">Relationship:</span> {orderDetails.collectingPersonRelationship.replace('_', ' ')}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="border-t border-amber-200 pt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">ID Verification Required</p>
                            <div className="space-y-1">
                              {orderDetails.idType && (
                                <p className="text-sm text-gray-900">
                                  <span className="font-medium">ID Type:</span> {orderDetails.idType.toUpperCase().replace('_', ' ')}
                                </p>
                              )}
                              {orderDetails.idNumber && (
                                <p className="text-sm text-gray-900">
                                  <span className="font-medium">ID Number:</span> {orderDetails.idNumber}
                                </p>
                              )}
                            </div>
                            <p className="text-xs text-amber-700 mt-2">
                              ⚠️ Verify ID matches details above before releasing order.
                            </p>
                          </div>

                          {orderDetails.vehicleInfo && (
                            <div className="border-t border-amber-200 pt-4">
                              <p className="text-sm font-medium text-gray-700 mb-1">Vehicle Information</p>
                              <p className="text-sm text-gray-900">{orderDetails.vehicleInfo}</p>
                            </div>
                          )}

                          {orderDetails.pickupSpecialInstructions && (
                            <div className="border-t border-amber-200 pt-4">
                              <p className="text-sm font-medium text-gray-700 mb-1">Special Instructions</p>
                              <p className="text-sm text-gray-900 whitespace-pre-wrap">{orderDetails.pickupSpecialInstructions}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )}

                  {/* Shipping & Tracking Section - hide for pickup orders */}
                  {!(
                    orderDetails?.paymentMethod === 'cash_on_pickup' ||
                    orderDetails?.payments?.[0]?.paymentMethod === 'cash_on_pickup' ||
                    orderDetails?.preferredPickupDate
                  ) && (
                  <div className="mb-6 border-t border-gray-200 pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Truck className="h-5 w-5 text-[var(--shreeji-primary)]" />
                      <h2 className="text-xl font-semibold text-gray-900">Shipping & Tracking</h2>
                    </div>
                    <div className="p-4 bg-[#f5f1e8] rounded-lg space-y-4">
                      {/* Tracking Number */}
                      <div>
                        <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700 mb-1">
                          Tracking Number
                        </label>
                        <input
                          type="text"
                          id="trackingNumber"
                          name="trackingNumber"
                          value={formData.trackingNumber}
                          onChange={handleChange}
                          maxLength={100}
                          placeholder="Enter tracking number"
                          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white ${
                            errors.trackingNumber ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors.trackingNumber && (
                          <p className="mt-1 text-sm text-red-600">{errors.trackingNumber}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Adding a tracking number will automatically set the order status to "Shipped" and set the shipped date.
                        </p>
                      </div>

                      {/* Date Fields Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-200 pt-4">
                        <div>
                          <label htmlFor="estimatedDelivery" className="block text-sm font-medium text-gray-700 mb-1">
                            Estimated Delivery
                          </label>
                          <input
                            type="date"
                            id="estimatedDelivery"
                            name="estimatedDelivery"
                            value={formData.estimatedDelivery}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label htmlFor="shippedAt" className="block text-sm font-medium text-gray-700 mb-1">
                            Shipped Date
                          </label>
                          <input
                            type="date"
                            id="shippedAt"
                            name="shippedAt"
                            value={formData.shippedAt}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label htmlFor="deliveredAt" className="block text-sm font-medium text-gray-700 mb-1">
                            Delivered Date
                          </label>
                          <input
                            type="date"
                            id="deliveredAt"
                            name="deliveredAt"
                            value={formData.deliveredAt}
                            onChange={handleChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Notes Section */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="h-5 w-5 text-[var(--shreeji-primary)]" />
                      <h2 className="text-xl font-semibold text-gray-900">Notes</h2>
                    </div>
                    <div className="space-y-4">
                      {/* Customer Notes */}
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                          Customer Notes
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          value={formData.notes}
                          onChange={handleChange}
                          rows={3}
                          placeholder="Notes visible to customer"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                        />
                        <p className="mt-1 text-xs text-blue-600">These notes will be visible to the customer.</p>
                      </div>

                      {/* Internal Notes */}
                      <div className="p-4 bg-[#f5f1e8] rounded-lg">
                        <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 mb-1">
                          Internal Notes
                        </label>
                        <textarea
                          id="internalNotes"
                          name="internalNotes"
                          value={formData.internalNotes}
                          onChange={handleChange}
                          rows={3}
                          placeholder="Internal notes (not visible to customer)"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                        />
                        <p className="mt-1 text-xs text-gray-500">Internal use only - not visible to customer.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Floating actions */}
            <div className="sticky bottom-0 z-20 mt-6 px-4 pb-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl p-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary-500/40 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="inline-flex items-center rounded-xl border border-primary-100 bg-white px-5 py-3 text-sm font-semibold text-primary-700 shadow-sm hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

