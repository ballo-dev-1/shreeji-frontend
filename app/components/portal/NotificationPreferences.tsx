"use client";

import { useState, useEffect } from 'react';
import {
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  BellIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import clientApi from '@/app/lib/client/api';
import toast from 'react-hot-toast';

interface NotificationPreference {
  id: number;
  type: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
}

const notificationTypes = [
  { value: 'order_placed', label: 'Order Confirmation' },
  { value: 'order_status_changed', label: 'Order Status Updates' },
  { value: 'order_shipped', label: 'Shipping Updates' },
  { value: 'order_delivered', label: 'Delivery Confirmation' },
  { value: 'order_cancelled', label: 'Order Cancellation' },
  { value: 'payment_received', label: 'Payment Confirmation' },
  { value: 'payment_failed', label: 'Payment Failed' },
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'password_changed', label: 'Password Changed' },
  { value: 'welcome', label: 'Welcome Messages' },
  { value: 'profile_updated', label: 'Profile Updates' },
  { value: 'email_changed', label: 'Email Changed' },
  { value: 'marketing', label: 'Promotional Messages' },
];

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Record<string, NotificationPreference>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await clientApi.getNotificationPreferences();
      const prefsMap: Record<string, NotificationPreference> = {};
      data.forEach((pref: NotificationPreference) => {
        prefsMap[pref.type] = pref;
      });
      setPreferences(prefsMap);
    } catch (error: any) {
      console.error('Failed to load preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const getPreference = (type: string): NotificationPreference => {
    return preferences[type] || {
      id: 0,
      type,
      emailEnabled: true,
      inAppEnabled: true,
      smsEnabled: false,
    };
  };

  const updatePreference = async (
    type: string,
    field: 'emailEnabled' | 'inAppEnabled' | 'smsEnabled',
    value: boolean,
  ) => {
    try {
      setSaving((prev) => ({ ...prev, [type]: true }));
      const current = getPreference(type);
      await clientApi.updateNotificationPreference(
        type,
        field === 'emailEnabled' ? value : current.emailEnabled,
        field === 'inAppEnabled' ? value : current.inAppEnabled,
        field === 'smsEnabled' ? value : current.smsEnabled,
      );
      
      setPreferences((prev) => ({
        ...prev,
        [type]: {
          ...current,
          [field]: value,
        },
      }));
      
      toast.success('Preferences updated');
    } catch (error: any) {
      console.error('Failed to update preference:', error);
      toast.error(error.message || 'Failed to update preference');
    } finally {
      setSaving((prev) => ({ ...prev, [type]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse py-12">
        <div className="h-12 w-12 bg-gray-200 rounded-full mx-auto"></div>
        <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose how you want to receive notifications for different events
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
        {notificationTypes.map((type) => {
          const pref = getPreference(type.value);
          const isSaving = saving[type.value];

          return (
            <div
              key={type.value}
              className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{type.label}</h3>
              
              <div className="space-y-4">
                {/* Email Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <p className="text-xs text-gray-500">Receive notifications via email</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pref.emailEnabled}
                      onChange={(e) => updatePreference(type.value, 'emailEnabled', e.target.checked)}
                      disabled={isSaving}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {/* In-App Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BellIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">In-App</p>
                      <p className="text-xs text-gray-500">Show notifications in your account</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pref.inAppEnabled}
                      onChange={(e) => updatePreference(type.value, 'inAppEnabled', e.target.checked)}
                      disabled={isSaving}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {/* SMS Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">SMS</p>
                      <p className="text-xs text-gray-500">Receive text message notifications</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pref.smsEnabled}
                      onChange={(e) => updatePreference(type.value, 'smsEnabled', e.target.checked)}
                      disabled={isSaving}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">About Notification Preferences</p>
            <p>
              You can customize how you receive notifications for different events. Changes are saved automatically.
              Some notifications (like order confirmations) may still be sent via email for record-keeping purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

