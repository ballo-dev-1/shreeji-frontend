"use client";

import { useEffect, useState } from 'react';
import {
  UserIcon,
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  KeyIcon,
  DocumentTextIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Layout from './Layout'
import api from '@/app/lib/admin/api';
import { ALL_ORDER_STATUSES } from '@/app/lib/order-statuses';

const settingsSections = [
  {
    id: 'profile',
    name: 'Profile',
    icon: UserIcon,
    description: 'Manage your personal information and preferences'
  },
  {
    id: 'general',
    name: 'General',
    icon: CogIcon,
    description: 'Configure general application settings'
  },
  {
    id: 'security',
    name: 'Security',
    icon: ShieldCheckIcon,
    description: 'Manage security settings and authentication'
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: BellIcon,
    description: 'Configure notification preferences'
  },
  {
    id: 'appearance',
    name: 'Appearance',
    icon: PaintBrushIcon,
    description: 'Customize the look and feel of your dashboard'
  },
  {
    id: 'integrations',
    name: 'Integrations',
    icon: GlobeAltIcon,
    description: 'Manage third-party integrations and APIs'
  },
  {
    id: 'api',
    name: 'API Settings',
    icon: KeyIcon,
    description: 'Configure API keys and access tokens'
  },
  {
    id: 'payments',
    name: 'Payments',
    icon: BanknotesIcon,
    description: 'Configure payment gateways and bank transfer details'
  },
  {
    id: 'orders',
    name: 'Orders',
    icon: CogIcon,
    description: 'Configure order management options'
  },
  {
    id: 'backup',
    name: 'Backup & Export',
    icon: DocumentTextIcon,
    description: 'Manage data backup and export options'
  }
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [formData, setFormData] = useState({
    // Profile
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@shreeji.com',
    phone: '+1234567890',
    timezone: 'UTC',
    
    // General
    companyName: 'Shreeji Technologies',
    currency: 'ZMW',
    manualExchangeRateZmwPerUsd: '',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    
    // Security
    twoFactorEnabled: false,
    sessionTimeout: '30',
    passwordExpiry: '90',
    
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    orderAlerts: true,
    inventoryAlerts: false,
    
    // Appearance
    theme: 'light',
    sidebarCollapsed: false,
    compactMode: false,
    
    // API
    apiKey: 'sk-1234567890abcdef',
    webhookUrl: 'https://example.com/webhook',
    rateLimit: '1000'
  });
  const [bankSettings, setBankSettings] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    swiftCode: '',
    iban: '',
    deadlineHours: 24,
    isEnabled: true,
  });
  const [mobileMoneySettings, setMobileMoneySettings] = useState({
    isEnabled: true,
  });
  const [cardSettings, setCardSettings] = useState({
    isEnabled: true,
  });
  const [copSettings, setCopSettings] = useState({
    isEnabled: true,
  });
  const [dpoSettings, setDpoSettings] = useState({
    companyToken: '',
    apiUrl: 'https://secure.3gdirectpay.com/API/v6/',
    serviceType: '5525',
    redirectUrl: '',
    backUrl: '',
    isEnabled: false,
  });
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  });
  const [settingsStatus, setSettingsStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  });

  // Order status visibility settings (stored under general.enabledOrderStatuses)
  const [enabledOrderStatuses, setEnabledOrderStatuses] = useState<string[] | null>(null);

  // Store initial state for cancel functionality
  const [initialFormData, setInitialFormData] = useState(formData);
  const [initialBankSettings, setInitialBankSettings] = useState(bankSettings);
  const [initialMobileMoneySettings, setInitialMobileMoneySettings] = useState(mobileMoneySettings);
  const [initialCardSettings, setInitialCardSettings] = useState(cardSettings);
  const [initialCopSettings, setInitialCopSettings] = useState(copSettings);
  const [initialDpoSettings, setInitialDpoSettings] = useState(dpoSettings);

  // Load payment settings
  useEffect(() => {
    let mounted = true;
    const fetchPaymentSettings = async () => {
      try {
        setPaymentLoading(true);
        const [bankResponse, dpoResponse, mobileMoneyResponse, cardResponse, copResponse] = await Promise.all([
          api.getSettingsByCategory('payment_bank_transfer'),
          api.getSettingsByCategory('payment_dpo'),
          api.getSettingsByCategory('payment_mobile_money'),
          api.getSettingsByCategory('payment_card'),
          api.getSettingsByCategory('payment_cop'),
        ]);
        if (!mounted) return;
        
        // Handle response structure - check if wrapped in 'data' property
        const bank = bankResponse?.data || bankResponse;
        const dpo = dpoResponse?.data || dpoResponse;
        const mobileMoney = mobileMoneyResponse?.data || mobileMoneyResponse;
        const card = cardResponse?.data || cardResponse;
        const cop = copResponse?.data || copResponse;
        
        setBankSettings({
          bankName: bank?.bankName ?? '',
          accountNumber: bank?.accountNumber ?? '',
          accountName: bank?.accountName ?? '',
          swiftCode: bank?.swiftCode ?? '',
          iban: bank?.iban ?? '',
          deadlineHours: bank?.deadlineHours ?? 24,
          // Preserve false values - only default to true if undefined/null
          isEnabled: bank?.isEnabled !== undefined && bank?.isEnabled !== null ? bank.isEnabled : true,
        });
        setDpoSettings({
          companyToken: dpo?.companyToken ?? '',
          apiUrl: dpo?.apiUrl ?? 'https://secure.3gdirectpay.com/API/v6/',
          serviceType: dpo?.serviceType ?? '5525',
          redirectUrl: dpo?.redirectUrl ?? '',
          backUrl: dpo?.backUrl ?? '',
          // Preserve false values - only default to false if undefined/null
          isEnabled: dpo?.isEnabled !== undefined && dpo?.isEnabled !== null ? dpo.isEnabled : false,
        });
        setMobileMoneySettings({
          // Preserve false values - only default to true if undefined/null
          isEnabled: mobileMoney?.isEnabled !== undefined && mobileMoney?.isEnabled !== null ? mobileMoney.isEnabled : true,
        });
        setCardSettings({
          // Preserve false values - only default to true if undefined/null
          isEnabled: card?.isEnabled !== undefined && card?.isEnabled !== null ? card.isEnabled : true,
        });
        setCopSettings({
          // Preserve false values - only default to true if undefined/null
          isEnabled: cop?.isEnabled !== undefined && cop?.isEnabled !== null ? cop.isEnabled : true,
        });

        // Store initial payment settings after loading
        setInitialBankSettings({
          bankName: bank?.bankName ?? '',
          accountNumber: bank?.accountNumber ?? '',
          accountName: bank?.accountName ?? '',
          swiftCode: bank?.swiftCode ?? '',
          iban: bank?.iban ?? '',
          deadlineHours: bank?.deadlineHours ?? 24,
          isEnabled: bank?.isEnabled !== undefined && bank?.isEnabled !== null ? bank.isEnabled : true,
        });
        setInitialDpoSettings({
          companyToken: dpo?.companyToken ?? '',
          apiUrl: dpo?.apiUrl ?? 'https://secure.3gdirectpay.com/API/v6/',
          serviceType: dpo?.serviceType ?? '5525',
          redirectUrl: dpo?.redirectUrl ?? '',
          backUrl: dpo?.backUrl ?? '',
          isEnabled: dpo?.isEnabled !== undefined && dpo?.isEnabled !== null ? dpo.isEnabled : false,
        });
        setInitialMobileMoneySettings({
          isEnabled: mobileMoney?.isEnabled !== undefined && mobileMoney?.isEnabled !== null ? mobileMoney.isEnabled : true,
        });
        setInitialCardSettings({
          isEnabled: card?.isEnabled !== undefined && card?.isEnabled !== null ? card.isEnabled : true,
        });
        setInitialCopSettings({
          isEnabled: cop?.isEnabled !== undefined && cop?.isEnabled !== null ? cop.isEnabled : true,
        });
      } catch (error) {
        console.error('Failed to load payment settings', error);
        if (mounted) {
          setPaymentStatus({ type: 'error', message: (error as Error).message || 'Failed to load payment settings.' });
        }
      } finally {
        if (mounted) setPaymentLoading(false);
      }
    };

    fetchPaymentSettings();
    return () => {
      mounted = false;
    };
  }, []);

  // Load all other settings
  useEffect(() => {
    let mounted = true;
    const fetchAllSettings = async () => {
      try {
        setSettingsLoading(true);
        const [generalResponse, notificationResponse] = await Promise.all([
          api.getSettingsByCategory('general'),
          api.getSettingsByCategory('notification'),
        ]);
        if (!mounted) return;
        
        // Handle response structure
        const general = generalResponse?.data || generalResponse;
        const notification = notificationResponse?.data || notificationResponse;
        
        // Update formData with loaded settings
        setFormData(prev => {
          const updated = {
            ...prev,
            // Profile settings (stored in general)
            firstName: general?.firstName ?? prev.firstName,
            lastName: general?.lastName ?? prev.lastName,
            email: general?.email ?? prev.email,
            phone: general?.phone ?? prev.phone,
            timezone: general?.timezone ?? prev.timezone,
            
            // General settings
            companyName: general?.companyName ?? prev.companyName,
            currency: general?.currency ?? prev.currency,
            manualExchangeRateZmwPerUsd: general?.manualExchangeRateZmwPerUsd ?? prev.manualExchangeRateZmwPerUsd,
            dateFormat: general?.dateFormat ?? prev.dateFormat,
            timeFormat: general?.timeFormat ?? prev.timeFormat,
            
            // Security settings (stored in general)
            twoFactorEnabled: general?.twoFactorEnabled !== undefined && general?.twoFactorEnabled !== null ? general.twoFactorEnabled : prev.twoFactorEnabled,
            sessionTimeout: general?.sessionTimeout ?? prev.sessionTimeout,
            passwordExpiry: general?.passwordExpiry ?? prev.passwordExpiry,
            
            // Appearance settings (stored in general)
            theme: general?.theme ?? prev.theme,
            sidebarCollapsed: general?.sidebarCollapsed !== undefined && general?.sidebarCollapsed !== null ? general.sidebarCollapsed : prev.sidebarCollapsed,
            compactMode: general?.compactMode !== undefined && general?.compactMode !== null ? general.compactMode : prev.compactMode,
            
            // API settings (stored in general)
            apiKey: general?.apiKey ?? prev.apiKey,
            webhookUrl: general?.webhookUrl ?? prev.webhookUrl,
            rateLimit: general?.rateLimit ?? prev.rateLimit,
            
            // Notification settings
            emailNotifications: notification?.emailNotifications !== undefined && notification?.emailNotifications !== null ? notification.emailNotifications : prev.emailNotifications,
            smsNotifications: notification?.smsNotifications !== undefined && notification?.smsNotifications !== null ? notification.smsNotifications : prev.smsNotifications,
            pushNotifications: notification?.pushNotifications !== undefined && notification?.pushNotifications !== null ? notification.pushNotifications : prev.pushNotifications,
            orderAlerts: notification?.orderAlerts !== undefined && notification?.orderAlerts !== null ? notification.orderAlerts : prev.orderAlerts,
            inventoryAlerts: notification?.inventoryAlerts !== undefined && notification?.inventoryAlerts !== null ? notification.inventoryAlerts : prev.inventoryAlerts,
          };
          // Store initial state after loading
          setInitialFormData(updated);
          return updated;
        });

        // Initialize order status visibility from general.enabledOrderStatuses (if present)
        if (general && Array.isArray(general.enabledOrderStatuses)) {
          setEnabledOrderStatuses(general.enabledOrderStatuses);
        } else {
          setEnabledOrderStatuses(null);
        }
      } catch (error) {
        console.error('Failed to load settings', error);
        if (mounted) {
          setSettingsStatus({ type: 'error', message: (error as Error).message || 'Failed to load settings.' });
        }
      } finally {
        if (mounted) setSettingsLoading(false);
      }
    };

    fetchAllSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Apply theme immediately when changed (before saving)
    if (field === 'theme' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: value }))
    }
  };

  const handleCancel = () => {
    // Restore formData
    setFormData(initialFormData);
    
    // Restore payment settings if on payments section
    if (activeSection === 'payments') {
      setBankSettings(initialBankSettings);
      setMobileMoneySettings(initialMobileMoneySettings);
      setCardSettings(initialCardSettings);
      setCopSettings(initialCopSettings);
      setDpoSettings(initialDpoSettings);
    }
    
    // Revert theme if it was changed
    if (initialFormData.theme && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: initialFormData.theme }));
    }
    
    // Clear any status messages
    setSettingsStatus({ type: 'idle' });
    setPaymentStatus({ type: 'idle' });
  };

  const handleSave = async () => {
    console.log('🔵 handleSave called, activeSection:', activeSection);
    // If on payments section, use the payment-specific save handler
    if (activeSection === 'payments') {
      console.log('🔵 Routing to handleSavePaymentSettings...');
      await handleSavePaymentSettings();
      return;
    }
    
    // Handle save logic for other sections
    setSettingsSaving(true);
    setSettingsStatus({ type: 'idle' });
    
    try {
      if (activeSection === 'profile') {
        // Save profile settings to general category
        await api.updateSettings('general', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          timezone: formData.timezone,
        });
      } else if (activeSection === 'general') {
        // Save general settings
        await api.updateSettings('general', {
          companyName: formData.companyName,
          currency: formData.currency,
          manualExchangeRateZmwPerUsd: formData.manualExchangeRateZmwPerUsd,
          dateFormat: formData.dateFormat,
          timeFormat: formData.timeFormat,
        });
      } else if (activeSection === 'security') {
        // Save security settings to general category
        await api.updateSettings('general', {
          twoFactorEnabled: formData.twoFactorEnabled,
          sessionTimeout: formData.sessionTimeout,
          passwordExpiry: formData.passwordExpiry,
        });
      } else if (activeSection === 'notifications') {
        // Save notification settings
        await api.updateSettings('notification', {
          emailNotifications: formData.emailNotifications,
          smsNotifications: formData.smsNotifications,
          pushNotifications: formData.pushNotifications,
          orderAlerts: formData.orderAlerts,
          inventoryAlerts: formData.inventoryAlerts,
        });
      } else if (activeSection === 'appearance') {
        // Save appearance settings to general category
        await api.updateSettings('general', {
          theme: formData.theme,
          sidebarCollapsed: formData.sidebarCollapsed,
          compactMode: formData.compactMode,
        });
        
        // Dispatch theme change event to apply immediately
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('themeChanged', { detail: formData.theme }))
        }
      } else if (activeSection === 'api') {
        // Save API settings to general category
        await api.updateSettings('general', {
          apiKey: formData.apiKey,
          webhookUrl: formData.webhookUrl,
          rateLimit: formData.rateLimit,
        });
      } else if (activeSection === 'orders') {
        // Save order status visibility to general category
        const allValues = ALL_ORDER_STATUSES.map((s) => s.value);
        const valuesToSave =
          enabledOrderStatuses && enabledOrderStatuses.length > 0
            ? enabledOrderStatuses
            : allValues;

        await api.updateSetting('general', 'enabledOrderStatuses', valuesToSave, 'json');
      }
      
      // Update initial state after successful save
      setInitialFormData(formData);
      
      setSettingsStatus({ type: 'success', message: 'Settings updated successfully.' });
      
      // Reload settings after a short delay to verify persistence
      setTimeout(async () => {
        try {
          const [generalResponse, notificationResponse] = await Promise.all([
            api.getSettingsByCategory('general'),
            api.getSettingsByCategory('notification'),
          ]);
          
          const general = generalResponse?.data || generalResponse;
          const notification = notificationResponse?.data || notificationResponse;
          
          console.log('🟡 Reloaded settings from backend:', {
            general,
            notification,
          });
        } catch (reloadError) {
          console.error('❌ Error reloading settings:', reloadError);
        }
      }, 1500);
    } catch (error) {
      console.error('❌ Failed to save settings', error);
      setSettingsStatus({
        type: 'error',
        message: (error as Error).message || 'Failed to update settings.',
      });
    } finally {
      setSettingsSaving(false);
    }
  };

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
        <p className="mt-2 text-sm text-gray-500">Update your personal details and contact information.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Last Name</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email Address</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Timezone</label>
          <select
            value={formData.timezone}
            onChange={(e) => handleInputChange('timezone', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderOrderSettings = () => {
    // When no explicit setting is stored, treat all statuses as enabled
    const allValues = ALL_ORDER_STATUSES.map((s) => s.value);
    const currentEnabled =
      enabledOrderStatuses && enabledOrderStatuses.length > 0
        ? enabledOrderStatuses
        : allValues;

    const isEnabled = (value: string) => currentEnabled.includes(value);

    const handleToggle = (value: string) => {
      setEnabledOrderStatuses((prev) => {
        const base = prev && prev.length > 0 ? prev : allValues;
        const set = new Set(base);

        if (set.has(value)) {
          set.delete(value);
        } else {
          set.add(value);
        }

        const next = Array.from(set);
        // Ensure at least one status remains enabled
        if (next.length === 0) {
          return base;
        }
        return next;
      });
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Order status options</h3>
          <p className="mt-2 text-sm text-gray-500">
            Choose which order statuses are available in admin filters and the Edit Order modal.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_ORDER_STATUSES.map((status) => {
            const checked = isEnabled(status.value);
            return (
              <label
                key={status.value}
                className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{status.label}</p>
                  <p className="text-xs text-gray-500">
                    {`Show the \"${status.label}\" status in admin.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(status.value)}
                  className={clsx(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:ring-offset-2',
                    checked ? 'bg-[var(--shreeji-primary)]' : 'bg-gray-200',
                  )}
                >
                  <span
                    className={clsx(
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      checked ? 'translate-x-5' : 'translate-x-0',
                    )}
                  />
                </button>
              </label>
            );
          })}
        </div>

        <p className="text-xs text-gray-500">
          Note: Existing orders keep their current status even if you hide that status here.
        </p>
      </div>
    );
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">General Settings</h3>
        <p className="mt-2 text-sm text-gray-500">Configure general application preferences.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Company Name</label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Default Currency</label>
          <select
            value={formData.currency}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          >
            <option value="ZMW">ZMW - Zambian Kwacha</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CAD">CAD - Canadian Dollar</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Manual Exchange Rate (1 USD in ZMW)
          </label>
          <input
            type="number"
            value={formData.manualExchangeRateZmwPerUsd}
            onChange={(e) => handleInputChange('manualExchangeRateZmwPerUsd', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
            placeholder="e.g. 20.00"
            min={0}
            step="0.01"
          />
          <p className="mt-1 text-xs text-gray-500">
            When set, this value will be used for pricing calculations instead of the live Exchange Rate API.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date Format</label>
          <select
            value={formData.dateFormat}
            onChange={(e) => handleInputChange('dateFormat', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Time Format</label>
          <select
            value={formData.timeFormat}
            onChange={(e) => handleInputChange('timeFormat', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          >
            <option value="12h">12-hour</option>
            <option value="24h">24-hour</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Security Settings</h3>
        <p className="mt-2 text-sm text-gray-500">Manage your account security and authentication preferences.</p>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
            <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
          </div>
          <button
            type="button"
            onClick={() => handleInputChange('twoFactorEnabled', !formData.twoFactorEnabled)}
            className={clsx(
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:ring-offset-2',
              formData.twoFactorEnabled ? 'bg-[var(--shreeji-primary)]' : 'bg-gray-200'
            )}
          >
            <span
              className={clsx(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                formData.twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
          <select
            value={formData.sessionTimeout}
            onChange={(e) => handleInputChange('sessionTimeout', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Password Expiry (days)</label>
          <select
            value={formData.passwordExpiry}
            onChange={(e) => handleInputChange('passwordExpiry', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          >
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">1 year</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Notification Preferences</h3>
        <p className="mt-2 text-sm text-gray-500">Choose how you want to receive notifications.</p>
      </div>
      
      <div className="space-y-4">
        {[
          { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
          { key: 'smsNotifications', label: 'SMS Notifications', description: 'Receive notifications via SMS' },
          { key: 'pushNotifications', label: 'Push Notifications', description: 'Receive push notifications in browser' },
          { key: 'orderAlerts', label: 'Order Alerts', description: 'Get notified about new orders' },
          { key: 'inventoryAlerts', label: 'Inventory Alerts', description: 'Get notified about low stock levels' }
        ].map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">{label}</h4>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
            <button
              type="button"
              onClick={() => handleInputChange(key, !formData[key as keyof typeof formData])}
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:ring-offset-2',
                formData[key as keyof typeof formData] ? 'bg-[var(--shreeji-primary)]' : 'bg-gray-200'
              )}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  formData[key as keyof typeof formData] ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Appearance Settings</h3>
        <p className="mt-2 text-sm text-gray-500">Customize the look and feel of your dashboard.</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Theme</label>
          <div className="mt-2 flex space-x-4">
            {[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'Auto' }
            ].map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={formData.theme === option.value}
                  onChange={(e) => handleInputChange('theme', e.target.value)}
                  className="h-4 w-4 text-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Compact Mode</h4>
            <p className="text-sm text-gray-500">Use smaller spacing and condensed layout</p>
          </div>
          <button
            type="button"
            onClick={() => handleInputChange('compactMode', !formData.compactMode)}
            className={clsx(
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:ring-offset-2',
              formData.compactMode ? 'bg-[var(--shreeji-primary)]' : 'bg-gray-200'
            )}
          >
            <span
              className={clsx(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                formData.compactMode ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );

  const renderApiSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">API Settings</h3>
        <p className="mt-1 text-sm text-gray-500">Manage your API keys and integration settings.</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">API Key</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              value={formData.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              className="flex-1 rounded-none rounded-l-md border border-[#dddddd] focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm"
              readOnly
            />
            <button className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm hover:bg-gray-100">
              Copy
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
          <input
            type="url"
            value={formData.webhookUrl}
            onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Rate Limit (requests per hour)</label>
          <select
            value={formData.rateLimit}
            onChange={(e) => handleInputChange('rateLimit', e.target.value)}
            className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
          >
            <option value="100">100</option>
            <option value="500">500</option>
            <option value="1000">1,000</option>
            <option value="5000">5,000</option>
            <option value="10000">10,000</option>
          </select>
        </div>
      </div>
    </div>
  );

  const handleSavePaymentSettings = async () => {
    console.log('🔵 handleSavePaymentSettings called');
    console.log('🔵 Current payment settings state:', {
      bank: { isEnabled: bankSettings.isEnabled, type: typeof bankSettings.isEnabled },
      dpo: { isEnabled: dpoSettings.isEnabled, type: typeof dpoSettings.isEnabled },
      mobileMoney: { isEnabled: mobileMoneySettings.isEnabled, type: typeof mobileMoneySettings.isEnabled },
      card: { isEnabled: cardSettings.isEnabled, type: typeof cardSettings.isEnabled },
      cop: { isEnabled: copSettings.isEnabled, type: typeof copSettings.isEnabled },
    });
    
    setPaymentSaving(true);
    setPaymentStatus({ type: 'idle' });
    try {
      const payloads = {
        bank_transfer: {
          bankName: bankSettings.bankName,
          accountNumber: bankSettings.accountNumber,
          accountName: bankSettings.accountName,
          swiftCode: bankSettings.swiftCode,
          iban: bankSettings.iban,
          deadlineHours: Number(bankSettings.deadlineHours) || 24,
          isEnabled: bankSettings.isEnabled,
        },
        dpo: {
          companyToken: dpoSettings.companyToken,
          apiUrl: dpoSettings.apiUrl,
          serviceType: dpoSettings.serviceType,
          redirectUrl: dpoSettings.redirectUrl,
          backUrl: dpoSettings.backUrl,
          isEnabled: dpoSettings.isEnabled,
        },
        mobile_money: {
          isEnabled: mobileMoneySettings.isEnabled,
        },
        card: {
          isEnabled: cardSettings.isEnabled,
        },
        cop: {
          isEnabled: copSettings.isEnabled,
        },
      };
      
      console.log('🔵 Sending payment settings to backend:', JSON.stringify(payloads, null, 2));
      
      const results = await Promise.all([
        api.updateSettings('payment_bank_transfer', payloads.bank_transfer),
        api.updateSettings('payment_dpo', payloads.dpo),
        api.updateSettings('payment_mobile_money', payloads.mobile_money),
        api.updateSettings('payment_card', payloads.card),
        api.updateSettings('payment_cop', payloads.cop),
      ]);
      
      console.log('🟢 Backend response received:', results);
      
      // Update initial payment settings after successful save
      setInitialBankSettings(bankSettings);
      setInitialMobileMoneySettings(mobileMoneySettings);
      setInitialCardSettings(cardSettings);
      setInitialCopSettings(copSettings);
      setInitialDpoSettings(dpoSettings);
      
      setPaymentStatus({ type: 'success', message: 'Payment settings updated successfully.' });
      
      // Reload settings after a short delay to verify persistence
      setTimeout(async () => {
        console.log('🟡 Reloading settings to verify persistence...');
        try {
          const [bank, dpo, mobileMoney, card, cop] = await Promise.all([
            api.getSettingsByCategory('payment_bank_transfer'),
            api.getSettingsByCategory('payment_dpo'),
            api.getSettingsByCategory('payment_mobile_money'),
            api.getSettingsByCategory('payment_card'),
            api.getSettingsByCategory('payment_cop'),
          ]);
          
          const bankData = bank?.data || bank;
          const dpoData = dpo?.data || dpo;
          const mobileMoneyData = mobileMoney?.data || mobileMoney;
          const cardData = card?.data || card;
          const copData = cop?.data || cop;
          
          console.log('🟡 Reloaded settings from backend:', {
            bank: { isEnabled: bankData?.isEnabled, type: typeof bankData?.isEnabled },
            dpo: { isEnabled: dpoData?.isEnabled, type: typeof dpoData?.isEnabled },
            mobileMoney: { isEnabled: mobileMoneyData?.isEnabled, type: typeof mobileMoneyData?.isEnabled },
            card: { isEnabled: cardData?.isEnabled, type: typeof cardData?.isEnabled },
            cop: { isEnabled: copData?.isEnabled, type: typeof copData?.isEnabled },
          });
        } catch (reloadError) {
          console.error('❌ Error reloading settings:', reloadError);
        }
      }, 1500);
    } catch (error) {
      console.error('❌ Failed to save payment settings', error);
      setPaymentStatus({
        type: 'error',
        message: (error as Error).message || 'Failed to update payment settings.',
      });
    } finally {
      setPaymentSaving(false);
    }
  };

  const renderPaymentSettings = () => {
    if (paymentLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-500">Loading payment settings...</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Payment Configuration</h3>
          <p className="mt-1 text-sm text-gray-500">Enable or disable payment methods and configure payment gateway settings.</p>
        </div>

        {/* Payment Method Toggles */}
        <div className="bg-white rounded-3xl p-8 space-y-6 shadow-[0_0_20px_0_rgba(0,0,0,0.1)]">
          <h4 className="text-lg font-semibold text-gray-900">Payment Methods</h4>
          
          {/* Card Payments */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h5 className="text-sm font-medium text-gray-900">Credit / Debit Card</h5>
              <p className="text-sm text-gray-500">Enable card payments via DPO gateway</p>
            </div>
            <button
              type="button"
              onClick={() => setCardSettings((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:ring-offset-2',
                cardSettings.isEnabled ? 'bg-[var(--shreeji-primary)]' : 'bg-gray-200'
              )}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  cardSettings.isEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Mobile Money */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h5 className="text-sm font-medium text-gray-900">Mobile Money</h5>
              <p className="text-sm text-gray-500">Enable mobile money payments (MTN, Airtel, Zamtel, Orange)</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileMoneySettings((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:ring-offset-2',
                mobileMoneySettings.isEnabled ? 'bg-[var(--shreeji-primary)]' : 'bg-gray-200'
              )}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  mobileMoneySettings.isEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Bank Transfer */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h5 className="text-sm font-medium text-gray-900">Bank Transfer</h5>
              <p className="text-sm text-gray-500">Enable bank transfer payments</p>
            </div>
            <button
              type="button"
              onClick={() => setBankSettings((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
              className={clsx(
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:ring-offset-2',
              bankSettings.isEnabled ? 'bg-[var(--shreeji-primary)]' : 'bg-gray-200'
              )}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  bankSettings.isEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Cash on Pickup */}
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-sm font-medium text-gray-900">Cash on Pickup</h5>
              <p className="text-sm text-gray-500">Enable cash on pickup</p>
            </div>
            <button
              type="button"
              onClick={() => setCopSettings((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:ring-offset-2',
                copSettings.isEnabled ? 'bg-[var(--shreeji-primary)]' : 'bg-gray-200'
              )}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  copSettings.isEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>

        {paymentStatus.type !== 'idle' && (
          <div
            className={clsx(
              'rounded-2xl p-4 mb-6',
              paymentStatus.type === 'success' ? 'bg-[#7FB06F]/10 text-[#7FB06F] border border-[#7FB06F]/20' : 'bg-[#D96C6C]/10 text-[#D96C6C] border border-[#D96C6C]/20'
            )}
          >
            <p className="text-sm font-medium">{paymentStatus.message}</p>
          </div>
        )}

        <div className="bg-gray-50 rounded-3xl p-8 space-y-6 shadow-[0_0_20px_0_rgba(0,0,0,0.1)]">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Bank Transfer Configuration</h4>
            <p className="text-sm text-gray-500 mt-1">Information shown to customers who choose bank transfer.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Bank Name</label>
              <input
                type="text"
                value={bankSettings.bankName}
                onChange={(e) => setBankSettings({ ...bankSettings, bankName: e.target.value })}
                className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Number</label>
              <input
                type="text"
                value={bankSettings.accountNumber}
                onChange={(e) => setBankSettings({ ...bankSettings, accountNumber: e.target.value })}
                className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Name</label>
              <input
                type="text"
                value={bankSettings.accountName}
                onChange={(e) => setBankSettings({ ...bankSettings, accountName: e.target.value })}
                className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">SWIFT Code</label>
              <input
                type="text"
                value={bankSettings.swiftCode}
                onChange={(e) => setBankSettings({ ...bankSettings, swiftCode: e.target.value })}
                className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">IBAN</label>
              <input
                type="text"
                value={bankSettings.iban}
                onChange={(e) => setBankSettings({ ...bankSettings, iban: e.target.value })}
                className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Deadline (hours)</label>
              <input
                type="number"
                min={1}
                value={bankSettings.deadlineHours}
                onChange={(e) =>
                  setBankSettings({ ...bankSettings, deadlineHours: Number(e.target.value) || 1 })
                }
                className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-3xl p-8 space-y-6 shadow-[0_0_20px_0_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">DPO Gateway</h4>
              <p className="text-sm text-gray-500">Configure Direct Pay Online credentials.</p>
            </div>
            <button
              type="button"
              onClick={() => setDpoSettings((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--shreeji-primary)] focus:ring-offset-2',
                dpoSettings.isEnabled ? 'bg-[var(--shreeji-primary)]' : 'bg-gray-200'
              )}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  dpoSettings.isEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Token</label>
              <input
                type="text"
                value={dpoSettings.companyToken}
                onChange={(e) => setDpoSettings({ ...dpoSettings, companyToken: e.target.value })}
                className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">API URL</label>
              <input
                type="text"
                value={dpoSettings.apiUrl}
                onChange={(e) => setDpoSettings({ ...dpoSettings, apiUrl: e.target.value })}
                className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Service Type</label>
              <input
                type="text"
                value={dpoSettings.serviceType}
                onChange={(e) => setDpoSettings({ ...dpoSettings, serviceType: e.target.value })}
                className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Redirect URL</label>
              <input
                type="url"
                value={dpoSettings.redirectUrl}
                onChange={(e) => setDpoSettings({ ...dpoSettings, redirectUrl: e.target.value })}
                className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Back URL</label>
              <input
                type="url"
                value={dpoSettings.backUrl}
                onChange={(e) => setDpoSettings({ ...dpoSettings, backUrl: e.target.value })}
                className="block w-full rounded-2xl border border-[#dddddd] shadow-sm focus:border-[var(--shreeji-primary)] focus:ring-[var(--shreeji-primary)] sm:text-sm px-4 py-3"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSettings();
      case 'general':
        return renderGeneralSettings();
      case 'security':
        return renderSecuritySettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'appearance':
        return renderAppearanceSettings();
      case 'api':
        return renderApiSettings();
      case 'payments':
        return renderPaymentSettings();
      case 'orders':
        return renderOrderSettings();
      default:
        return (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">Coming Soon</h3>
            <p className="mt-1 text-sm text-gray-500">This section is under development.</p>
          </div>
        );
    }
  };

  return (
    <Layout currentPage="Settings" pageTitle="Settings">
    <div className="space-y-6 pb-24">
      <div>
        <p className="text-sm text-gray-500">Manage your account settings and preferences.</p>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
        {/* Sidebar */}
        <aside className="py-6 px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-3 lg:sticky lg:top-6 lg:self-start">
          <nav className="space-y-2">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={clsx(
                  'group w-full flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-200',
                  activeSection === section.id
                    ? 'bg-[var(--shreeji-primary)] text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <section.icon
                  className={clsx(
                    'mr-3 flex-shrink-0 h-6 w-6',
                    activeSection === section.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {section.name}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
          <div className="bg-white shadow-[0_0_20px_0_rgba(113,103,103,0.1)] rounded-3xl">
            <div className="px-6 py-8 sm:p-8">
              {renderSectionContent()}
              
              {/* Settings Status Messages */}
              {settingsStatus.type !== 'idle' && activeSection !== 'payments' && (
                <div
                  className={clsx(
                    'mt-6 rounded-2xl p-4',
                    settingsStatus.type === 'success' ? 'bg-[#7FB06F]/10 text-[#7FB06F] border border-[#7FB06F]/20' : 'bg-[#D96C6C]/10 text-[#D96C6C] border border-[#D96C6C]/20'
                  )}
                >
                  <p className="text-sm font-medium">{settingsStatus.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-5 left-0 right-0 z-50 px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
            className="inline-flex items-center px-8 py-4 border border-gray-300 shadow-lg text-sm font-medium rounded-2xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--shreeji-primary)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
            disabled={(activeSection === 'payments' && paymentSaving) || (activeSection !== 'payments' && settingsSaving)}
            className={clsx(
              'inline-flex items-center px-8 py-4 border border-transparent text-sm font-medium rounded-2xl shadow-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--shreeji-primary)] transition-all',
              ((activeSection === 'payments' && paymentSaving) || (activeSection !== 'payments' && settingsSaving))
                ? 'bg-[var(--shreeji-primary)]/50 cursor-not-allowed'
                : 'bg-[var(--shreeji-primary)] hover:opacity-90'
            )}
          >
            {(activeSection === 'payments' && paymentSaving) || (activeSection !== 'payments' && settingsSaving) ? 'Saving...' : 'Save Changes'}
                </button>
        </div>
      </div>
    </div>
    </Layout>
  );
}
