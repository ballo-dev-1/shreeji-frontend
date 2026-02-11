"use client";

import { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  BellIcon,
  EnvelopeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '@/app/lib/admin/api';
import Layout from './Layout';
import toast from 'react-hot-toast';

interface LowStockItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  warehouseId: number | null;
  warehouseName: string | null;
  quantity: number;
  minStockLevel: number;
  availableQuantity: number;
}

export default function LowStockAlerts() {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [threshold, setThreshold] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchWarehouses();
    fetchLowStockItems();
  }, [selectedWarehouse, threshold]);

  const fetchWarehouses = async () => {
    try {
      const response: any = await api.getWarehouses({ isActive: true });
      setWarehouses(response?.data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchLowStockItems = async () => {
    try {
      setLoading(true);
      const response: any = await api.getLowStockProducts(
        selectedWarehouse || undefined,
        threshold,
      );
      setLowStockItems(response?.data || []);
    } catch (error: any) {
      console.error('Error fetching low stock items:', error);
      toast.error('Failed to load low stock alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAlerts = async () => {
    try {
      await api.checkAlerts(selectedWarehouse || undefined);
      toast.success('Alert check completed');
      fetchLowStockItems();
    } catch (error: any) {
      console.error('Error checking alerts:', error);
      toast.error('Failed to check alerts');
    }
  };

  return (
    <Layout currentPage="Low Stock Alerts" pageTitle="Low Stock Alerts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Low Stock Alerts</h1>
            <p className="mt-1 text-sm text-gray-500">
              Products that need restocking ({lowStockItems.length} items)
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <button onClick={handleCheckAlerts} className="btn-secondary flex items-center">
              <BellIcon className="w-5 h-5 mr-2" />
              Check Alerts
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Warehouse Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
              <select
                value={selectedWarehouse || ''}
                onChange={(e) => setSelectedWarehouse(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="input-field"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Threshold Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Threshold</label>
              <input
                type="number"
                min="0"
                value={threshold || ''}
                onChange={(e) => setThreshold(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="input-field"
                placeholder="Use product min level"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to use product's minStockLevel
              </p>
            </div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {loading ? (
            <div className="space-y-2 animate-pulse py-16">
              <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
              <div className="h-1 bg-gray-200 rounded w-24 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Product</th>
                    <th className="table-header">Warehouse</th>
                    <th className="table-header">Current Stock</th>
                    <th className="table-header">Min Level</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          <p className="text-sm text-gray-500">SKU: {item.productSku}</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        {item.warehouseName || 'Default'}
                      </td>
                      <td className="table-cell">
                        <span className="font-medium text-red-600">{item.quantity}</span>
                      </td>
                      <td className="table-cell text-gray-500">{item.minStockLevel}</td>
                      <td className="table-cell">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                          Low Stock
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && lowStockItems.length === 0 && (
            <div className="text-center py-12">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">All good!</h3>
              <p className="mt-1 text-sm text-gray-500">
                No products are currently low in stock.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

