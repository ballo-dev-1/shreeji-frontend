"use client";

import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  AdjustmentsHorizontalIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import api from '@/app/lib/admin/api';
import toast from 'react-hot-toast';

interface Movement {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  warehouseId: number | null;
  warehouseName: string | null;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: string;
}

interface Warehouse {
  id: number;
  name: string;
}

export default function InventoryMovementHistory() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    warehouseId: '',
    movementType: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    fetchWarehouses();
    fetchMovements();
  }, [filters]);

  const fetchWarehouses = async () => {
    try {
      const response: any = await api.getWarehouses();
      setWarehouses(response?.data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const response: any = await api.getInventoryMovements({
        warehouseId: filters.warehouseId ? parseInt(filters.warehouseId, 10) : undefined,
        movementType: filters.movementType || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        limit: 100,
      });
      setMovements(response?.data || []);
    } catch (error: any) {
      console.error('Error fetching movements:', error);
      toast.error('Failed to load movement history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <ArrowDownIcon className="h-5 w-5 text-green-500" />;
      case 'OUT':
        return <ArrowUpIcon className="h-5 w-5 text-red-500" />;
      case 'ADJUSTMENT':
        return <AdjustmentsHorizontalIcon className="h-5 w-5 text-blue-500" />;
      case 'TRANSFER':
        return <ArrowsRightLeftIcon className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  const getMovementTypeClass = (type: string) => {
    switch (type) {
      case 'IN':
        return 'bg-green-100 text-green-800';
      case 'OUT':
        return 'bg-red-100 text-red-800';
      case 'ADJUSTMENT':
        return 'bg-blue-100 text-blue-800';
      case 'TRANSFER':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventory Movement History</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track all inventory movements and adjustments ({movements.length} records)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Warehouse Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
            <select
              value={filters.warehouseId}
              onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
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

          {/* Movement Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type</label>
            <select
              value={filters.movementType}
              onChange={(e) => handleFilterChange('movementType', e.target.value)}
              className="input-field"
            >
              <option value="">All Types</option>
              <option value="IN">In</option>
              <option value="OUT">Out</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="input-field"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Movements Table */}
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
                  <th className="table-header">Date</th>
                  <th className="table-header">Product</th>
                  <th className="table-header">Warehouse</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Quantity</th>
                  <th className="table-header">Previous</th>
                  <th className="table-header">New</th>
                  <th className="table-header">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="table-cell text-sm text-gray-500">
                      {formatDate(movement.createdAt)}
                    </td>
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-gray-900">{movement.productName}</p>
                        <p className="text-sm text-gray-500">{movement.productSku}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      {movement.warehouseName || 'Default'}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        {getMovementIcon(movement.movementType)}
                        <span
                          className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getMovementTypeClass(
                            movement.movementType,
                          )}`}
                        >
                          {movement.movementType}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell font-medium">
                      {movement.movementType === 'IN' || movement.movementType === 'ADJUSTMENT' ? (
                        <span className="text-green-600">+{movement.quantity}</span>
                      ) : (
                        <span className="text-red-600">-{movement.quantity}</span>
                      )}
                    </td>
                    <td className="table-cell text-gray-500">{movement.previousQuantity}</td>
                    <td className="table-cell font-medium">{movement.newQuantity}</td>
                    <td className="table-cell text-sm text-gray-500">
                      {movement.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && movements.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No movement history found</p>
          </div>
        )}
      </div>
    </div>
  );
}

