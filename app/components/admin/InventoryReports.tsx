"use client";

import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import api from '@/app/lib/admin/api';
import Layout from './Layout';
import toast from 'react-hot-toast';

interface Warehouse {
  id: number;
  name: string;
}

type ReportType = 'stock-levels' | 'valuation' | 'movements' | 'slow-moving';

export default function InventoryReports() {
  const [reportType, setReportType] = useState<ReportType>('stock-levels');
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    daysThreshold: 90,
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (reportType) {
      fetchReport();
    }
  }, [reportType, selectedWarehouse, filters]);

  const fetchWarehouses = async () => {
    try {
      const response: any = await api.getWarehouses({ isActive: true });
      setWarehouses(response?.data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      let response: any;

      switch (reportType) {
        case 'stock-levels':
          response = await api.getStockLevelReport(selectedWarehouse || undefined);
          break;
        case 'valuation':
          response = await api.getValuationReport(selectedWarehouse || undefined);
          break;
        case 'movements':
          response = await api.getMovementReport({
            warehouseId: selectedWarehouse || undefined,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
          });
          break;
        case 'slow-moving':
          response = await api.getSlowMovingReport(
            selectedWarehouse || undefined,
            filters.daysThreshold,
          );
          break;
        default:
          return;
      }

      setReportData(response?.data || []);
    } catch (error: any) {
      console.error('Error fetching report:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      // Build URL with format parameter
      const params = new URLSearchParams();
      if (selectedWarehouse) params.append('warehouseId', selectedWarehouse.toString());
      if (format) params.append('format', format);
      if (reportType === 'movements') {
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
      }
      if (reportType === 'slow-moving') {
        params.append('daysThreshold', filters.daysThreshold.toString());
      }

      let endpoint = '';
      switch (reportType) {
        case 'stock-levels':
          endpoint = `/inventory/reports/stock-levels?${params.toString()}`;
          break;
        case 'valuation':
          endpoint = `/inventory/reports/valuation?${params.toString()}`;
          break;
        case 'movements':
          endpoint = `/inventory/reports/movements?${params.toString()}`;
          break;
        case 'slow-moving':
          endpoint = `/inventory/reports/slow-moving?${params.toString()}`;
          break;
        default:
          return;
      }

      // Use fetch with proxy support to get blob response
      const API_URL = process.env.NEXT_PUBLIC_ECOM_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_jwt') : null;
      
      // Determine if we should use proxy (when frontend is HTTPS and backend is HTTP)
      const shouldUseProxy = typeof window !== 'undefined' && 
        window.location.protocol === 'https:' && 
        API_URL.startsWith('http://');
      
      const url = shouldUseProxy ? `/api/backend${endpoint}` : `${API_URL}${endpoint}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const renderReportTable = () => {
    if (reportData.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No data available for this report</p>
        </div>
      );
    }

    const columns = getReportColumns();
    const firstRow = reportData[0];

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col} className="table-header">
                  {col.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reportData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col} className="table-cell">
                    {formatCellValue(row[col], col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const getReportColumns = (): string[] => {
    if (reportData.length === 0) return [];
    return Object.keys(reportData[0]);
  };

  const formatCellValue = (value: any, column: string): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      if (column.toLowerCase().includes('price') || column.toLowerCase().includes('value') || column.toLowerCase().includes('cost')) {
        return `K${value.toLocaleString()}`;
      }
      return value.toLocaleString();
    }
    if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
      return new Date(value).toLocaleString();
    }
    return String(value);
  };

  return (
    <Layout currentPage="Inventory Reports" pageTitle="Inventory Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Reports</h1>
            <p className="mt-1 text-sm text-gray-500">
              Generate and export inventory reports ({reportData.length} records)
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <button
              onClick={() => handleExport('csv')}
              className="btn-secondary flex items-center"
              disabled={loading || reportData.length === 0}
            >
              <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="btn-secondary flex items-center"
              disabled={loading || reportData.length === 0}
            >
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setReportType('stock-levels')}
              className={`p-4 rounded-lg border-2 text-left ${
                reportType === 'stock-levels'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <ChartBarIcon className="h-6 w-6 mb-2 text-primary-600" />
              <h3 className="font-medium text-gray-900">Stock Levels</h3>
              <p className="text-xs text-gray-500 mt-1">Current inventory levels</p>
            </button>

            <button
              onClick={() => setReportType('valuation')}
              className={`p-4 rounded-lg border-2 text-left ${
                reportType === 'valuation'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CurrencyDollarIcon className="h-6 w-6 mb-2 text-primary-600" />
              <h3 className="font-medium text-gray-900">Valuation</h3>
              <p className="text-xs text-gray-500 mt-1">Inventory value report</p>
            </button>

            <button
              onClick={() => setReportType('movements')}
              className={`p-4 rounded-lg border-2 text-left ${
                reportType === 'movements'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <ArrowPathIcon className="h-6 w-6 mb-2 text-primary-600" />
              <h3 className="font-medium text-gray-900">Movements</h3>
              <p className="text-xs text-gray-500 mt-1">Stock movement history</p>
            </button>

            <button
              onClick={() => setReportType('slow-moving')}
              className={`p-4 rounded-lg border-2 text-left ${
                reportType === 'slow-moving'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <ClockIcon className="h-6 w-6 mb-2 text-primary-600" />
              <h3 className="font-medium text-gray-900">Slow Moving</h3>
              <p className="text-xs text-gray-500 mt-1">Items with low activity</p>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            {/* Date From (for movements) */}
            {reportType === 'movements' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                  className="input-field"
                />
              </div>
            )}

            {/* Date To (for movements) */}
            {reportType === 'movements' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                  className="input-field"
                />
              </div>
            )}

            {/* Days Threshold (for slow-moving) */}
            {reportType === 'slow-moving' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days Threshold</label>
                <input
                  type="number"
                  min="1"
                  value={filters.daysThreshold}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, daysThreshold: parseInt(e.target.value) || 90 }))
                  }
                  className="input-field"
                />
              </div>
            )}
          </div>
        </div>

        {/* Report Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            renderReportTable()
          )}
        </div>
      </div>
    </Layout>
  );
}

