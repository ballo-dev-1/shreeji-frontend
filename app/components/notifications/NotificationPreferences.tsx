'use client';

import { useState, useEffect } from 'react';
import { notificationsApi, NotificationPreferences as NotificationPrefs } from '../../lib/notifications/api';
import { Switch } from '@headlessui/react';
import clientApi from '@/app/lib/client/api';
import toast from 'react-hot-toast';

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPrefs[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [marketingSubscribed, setMarketingSubscribed] = useState(false);
  const [marketingLoading, setMarketingLoading] = useState(true);
  const [marketingSaving, setMarketingSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
    loadMarketingSubscription();
  }, []);

  const loadMarketingSubscription = async () => {
    try {
      setMarketingLoading(true);
      const response = await clientApi.getMarketingSubscription();
      setMarketingSubscribed(response.subscribed);
    } catch (error) {
      console.error('Failed to load marketing subscription:', error);
    } finally {
      setMarketingLoading(false);
    }
  };

  const handleMarketingToggle = async (subscribed: boolean) => {
    try {
      setMarketingSaving(true);
      if (subscribed) {
        await clientApi.subscribeToMarketing();
        toast.success('Subscribed to marketing emails');
      } else {
        await clientApi.unsubscribeFromMarketing();
        toast.success('Unsubscribed from marketing emails');
      }
      setMarketingSubscribed(subscribed);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update marketing preferences');
    } finally {
      setMarketingSaving(false);
    }
  };

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await notificationsApi.getPreferences();
      setPreferences(response.data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (type: string, field: 'emailEnabled' | 'inAppEnabled', value: boolean) => {
    const pref = preferences.find((p) => p.type === type);
    if (!pref) return;

    setSaving((prev) => ({ ...prev, [type]: true }));

    try {
      await notificationsApi.updatePreference(
        type,
        field === 'emailEnabled' ? value : pref.emailEnabled,
        field === 'inAppEnabled' ? value : pref.inAppEnabled,
      );

      setPreferences((prev) =>
        prev.map((p) => (p.type === type ? { ...p, [field]: value } : p)),
      );
    } catch (error) {
      console.error('Failed to update preference:', error);
    } finally {
      setSaving((prev) => ({ ...prev, [type]: false }));
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      order_placed: 'Order Placed',
      order_status_changed: 'Order Status Updates',
      order_shipped: 'Order Shipped',
      order_delivered: 'Order Delivered',
      payment_received: 'Payment Received',
      payment_failed: 'Payment Failed',
      password_reset: 'Password Reset',
      password_changed: 'Password Changed',
      welcome: 'Welcome Emails',
      profile_updated: 'Profile Updates',
      email_changed: 'Email Changes',
      marketing: 'Marketing Emails',
    };
    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading preferences...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
      <div className="space-y-6">
        {preferences.length === 0 ? (
          <p className="text-gray-500">No preferences available. Preferences will be created as you receive notifications.</p>
        ) : (
          preferences.map((pref) => (
            <div key={pref.type} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                {getNotificationTypeLabel(pref.type)}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">Email notifications</p>
                    <p className="text-xs text-gray-500">Receive email notifications for this type</p>
                  </div>
                  <Switch
                    checked={pref.emailEnabled}
                    onChange={(checked) => updatePreference(pref.type, 'emailEnabled', checked)}
                    disabled={saving[pref.type]}
                    className={`${
                      pref.emailEnabled ? 'bg-primary-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50`}
                  >
                    <span
                      className={`${
                        pref.emailEnabled ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">In-app notifications</p>
                    <p className="text-xs text-gray-500">Show notifications in the app</p>
                  </div>
                  <Switch
                    checked={pref.inAppEnabled}
                    onChange={(checked) => updatePreference(pref.type, 'inAppEnabled', checked)}
                    disabled={saving[pref.type]}
                    className={`${
                      pref.inAppEnabled ? 'bg-primary-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50`}
                  >
                    <span
                      className={`${
                        pref.inAppEnabled ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Marketing Email Preferences */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            Marketing Communications
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Marketing emails</p>
              <p className="text-xs text-gray-500">Receive promotional emails, special offers, and updates</p>
            </div>
            {marketingLoading ? (
              <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <Switch
                checked={marketingSubscribed}
                onChange={handleMarketingToggle}
                disabled={marketingSaving}
                className={`${
                  marketingSubscribed ? 'bg-primary-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50`}
              >
                <span
                  className={`${
                    marketingSubscribed ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

