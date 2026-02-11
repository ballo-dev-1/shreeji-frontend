"use client";

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '@/app/lib/admin/api';
import Layout from './Layout';
import toast from 'react-hot-toast';

interface ReorderPoint {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  warehouseId: number | null;
  warehouseName: string | null;
  reorderLevel: number;
  reorderQuantity: number;
  isActive: boolean;
}

interface Warehouse {
  id: number;
  name: string;
}

export default function ReorderPointsManagement() {
  const [reorderPoints, setReorderPoints] = useState<ReorderPoint[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);

  useEffect(() => {
    fetchWarehouses();
    fetchReorderPoints();
  }, [selectedWarehouse]);

  const fetchWarehouses = async () => {
    try {
      const response: any = await api.getWarehouses({ isActive: true });
      setWarehouses(response?.data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchReorderPoints = async () => {
    try {
      setLoading(true);
      const response: any = await api.getReorderPoints(selectedWarehouse || undefined);
      setReorderPoints(response?.data || []);
    } catch (error: any) {
      console.error('Error fetching reorder points:', error);
      toast.error('Failed to load reorder points');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout currentPage="Reorder Points" pageTitle="Reorder Points Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reorder Points</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage automated reorder levels for products ({reorderPoints.length} configured)
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>

        {/* Reorder Points Table */}
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
                    <th className="table-header">Reorder Level</th>
                    <th className="table-header">Reorder Quantity</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reorderPoints.map((point) => (
                    <tr key={point.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900">{point.productName}</p>
                          <p className="text-sm text-gray-500">SKU: {point.productSku}</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        {point.warehouseName || 'Default'}
                      </td>
                      <td className="table-cell font-medium">{point.reorderLevel}</td>
                      <td className="table-cell font-medium">{point.reorderQuantity}</td>
                      <td className="table-cell">
                        {point.isActive ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        <button
                          className="text-primary-600 hover:text-primary-700"
                          title="Edit reorder point"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && reorderPoints.length === 0 && (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No reorder points configured</h3>
              <p className="mt-1 text-sm text-gray-500">
                Configure reorder points to get automated alerts when stock is low.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

