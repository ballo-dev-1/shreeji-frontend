"use client";

import { useState, useEffect } from 'react';
import { BellIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import api from '@/app/lib/admin/api';
import toast from 'react-hot-toast';
import Layout from './Layout';

interface AlertSettings {
  emailAlertsEnabled: boolean;
  dashboardNotificationsEnabled: boolean;
  defaultThreshold: number;
  alertFrequencyHours: number;
}

export default function InventoryAlertsSettings() {
  const [settings, setSettings] = useState<AlertSettings>({
    emailAlertsEnabled: true,
    dashboardNotificationsEnabled: true,
    defaultThreshold: 0,
    alertFrequencyHours: 24,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response: any = await api.getAlertSettings();
      setSettings(response?.data || settings);
    } catch (error: any) {
      console.error('Error fetching alert settings:', error);
      toast.error('Failed to load alert settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateAlertSettings(settings);
      toast.success('Alert settings updated successfully');
    } catch (error: any) {
      console.error('Error updating alert settings:', error);
      toast.error(error.message || 'Failed to update alert settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof AlertSettings, value: boolean | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Layout currentPage="Inventory Alerts">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-64"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="Inventory Alerts" pageTitle="Inventory Alert Settings">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure how and when you receive low stock alerts
          </p>
        </div>

        {/* Settings Form */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="space-y-6">
            {/* Email Alerts */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={settings.emailAlertsEnabled}
                  onChange={(e) => handleChange('emailAlertsEnabled', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <label className="text-sm font-medium text-gray-700">Email Alerts</label>
                </div>
                <p className="text-sm text-gray-500">
                  Receive email notifications when products reach low stock levels
                </p>
              </div>
            </div>

            {/* Dashboard Notifications */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={settings.dashboardNotificationsEnabled}
                  onChange={(e) => handleChange('dashboardNotificationsEnabled', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center">
                  <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <label className="text-sm font-medium text-gray-700">Dashboard Notifications</label>
                </div>
                <p className="text-sm text-gray-500">
                  Show in-app notifications for low stock alerts
                </p>
              </div>
            </div>

            {/* Default Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Threshold
              </label>
              <input
                type="number"
                min="0"
                value={settings.defaultThreshold}
                onChange={(e) => handleChange('defaultThreshold', parseInt(e.target.value) || 0)}
                className="input-field w-32"
              />
              <p className="mt-1 text-xs text-gray-500">
                Use product's minStockLevel if set to 0. Otherwise, alert when stock falls below this number.
              </p>
            </div>

            {/* Alert Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert Frequency (Hours)
              </label>
              <input
                type="number"
                min="1"
                value={settings.alertFrequencyHours}
                onChange={(e) => handleChange('alertFrequencyHours', parseInt(e.target.value) || 24)}
                className="input-field w-32"
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum hours between alerts for the same product to prevent spam
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

