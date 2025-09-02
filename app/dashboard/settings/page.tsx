'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  CreditCard, 
  Truck, 
  Bell, 
  Shield, 
  BarChart3, 
  Palette, 
  Save,
  Upload,
  MapPin,
  Clock,
  Phone,
  Mail,
  Globe,
  Settings as SettingsIcon
} from 'lucide-react';

interface RestaurantSettings {
  name: string;
  description: string;
  cuisine: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  openingHours: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
  autoAcceptOrders: boolean;
  smsNotifications: boolean;
  emailReceipts: boolean;
  preparationTime: number;
  maxOrdersPerHour: number;
  timezone: string;
  currency: string;
  language: string;
}

const defaultSettings: RestaurantSettings = {
  name: '',
  description: '',
  cuisine: 'Italian',
  phone: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'Sweden',
  openingHours: {
    monday: { open: '11:00', close: '22:00', closed: false },
    tuesday: { open: '11:00', close: '22:00', closed: false },
    wednesday: { open: '11:00', close: '22:00', closed: false },
    thursday: { open: '11:00', close: '22:00', closed: false },
    friday: { open: '11:00', close: '23:00', closed: false },
    saturday: { open: '12:00', close: '23:00', closed: false },
    sunday: { open: '12:00', close: '21:00', closed: false },
  },
  autoAcceptOrders: true,
  smsNotifications: true,
  emailReceipts: false,
  preparationTime: 15,
  maxOrdersPerHour: 20,
  timezone: 'Europe/Stockholm',
  currency: 'SEK',
  language: 'sv-SE'
};

const cuisineOptions = [
  'Italian', 'Swedish', 'International', 'Asian', 'Mediterranean', 
  'American', 'Mexican', 'Indian', 'Japanese', 'Chinese', 'Thai', 'Other'
];

const timezoneOptions = [
  'Europe/Stockholm', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Shanghai'
];

const currencyOptions = ['SEK', 'EUR', 'USD', 'GBP', 'NOK', 'DKK'];

const languageOptions = [
  { code: 'sv-SE', name: 'Svenska' },
  { code: 'en-US', name: 'English' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'fr-FR', name: 'Français' }
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState('restaurant');
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update dashboard header and navigation when component mounts
  useEffect(() => {
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const settingsNav = document.getElementById('nav-settings');
    
    if (pageTitle) pageTitle.textContent = 'Settings';
    if (pageSubtitle) pageSubtitle.textContent = 'Configure your restaurant settings and preferences';
    
    // Highlight settings navigation
    if (settingsNav) {
      settingsNav.classList.add('bg-blue-50', 'text-blue-700');
      settingsNav.classList.remove('text-gray-600');
    }
    
    // Cleanup function to remove highlighting when component unmounts
    return () => {
      if (settingsNav) {
        settingsNav.classList.remove('bg-blue-50', 'text-blue-700');
        settingsNav.classList.add('text-gray-600');
      }
    };
  }, []);

  // Load settings from API (placeholder for now)
  useEffect(() => {
    // TODO: Load actual settings from API
    console.log('Loading restaurant settings...');
  }, []);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleOpeningHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: any) => {
    setSettings(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: {
          ...prev.openingHours[day],
          [field]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Save settings to API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setHasChanges(false);
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderRestaurantTab = () => (
    <div className="space-y-6">
      {/* Restaurant Information */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Restaurant Information</h3>
          <p className="text-xs text-gray-600">Basic information about your restaurant</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Restaurant Name</label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => handleSettingChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter restaurant name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cuisine Type</label>
              <select
                value={settings.cuisine}
                onChange={(e) => handleSettingChange('cuisine', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Cuisine type"
              >
                {cuisineOptions.map(cuisine => (
                  <option key={cuisine} value={cuisine}>{cuisine}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={settings.description}
                onChange={(e) => handleSettingChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your restaurant..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Contact Information</h3>
          <p className="text-xs text-gray-600">How customers can reach you</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => handleSettingChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+46 8 123 456 78"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => handleSettingChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="info@restaurant.se"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Address</h3>
          <p className="text-xs text-gray-600">Restaurant location</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => handleSettingChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter street address"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={settings.city}
                onChange={(e) => handleSettingChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Postal Code</label>
              <input
                type="text"
                value={settings.postalCode}
                onChange={(e) => handleSettingChange('postalCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123 45"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={settings.country}
                onChange={(e) => handleSettingChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Country"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Opening Hours */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Opening Hours</h3>
          <p className="text-xs text-gray-600">When your restaurant is open</p>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {Object.entries(settings.openingHours).map(([day, hours]) => (
              <div key={day} className="flex items-center gap-3">
                <div className="w-20 text-xs font-medium text-gray-700 capitalize">
                  {day}
                </div>
                                 <label className="flex items-center gap-2">
                   <input
                     type="checkbox"
                     checked={!hours.closed}
                     onChange={(e) => handleOpeningHoursChange(day, 'closed', !e.target.checked)}
                     className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                     aria-label={`${day} open status`}
                   />
                   <span className="text-xs text-gray-600">Open</span>
                 </label>
                {!hours.closed && (
                  <>
                                         <input
                       type="time"
                       value={hours.open}
                       onChange={(e) => handleOpeningHoursChange(day, 'open', e.target.value)}
                       className="px-2 py-1 border border-gray-300 rounded text-xs"
                       aria-label={`${day} opening time`}
                       title={`${day} opening time`}
                     />
                     <span className="text-xs text-gray-500">to</span>
                     <input
                       type="time"
                       value={hours.close}
                       onChange={(e) => handleOpeningHoursChange(day, 'close', e.target.value)}
                       className="px-2 py-1 border border-gray-300 rounded text-xs"
                       aria-label={`${day} closing time`}
                       title={`${day} closing time`}
                     />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderOrderSettingsTab = () => (
    <div className="space-y-6">
      {/* Order Management */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Order Management</h3>
          <p className="text-xs text-gray-600">Configure order handling and automation</p>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <div className="text-sm font-medium text-gray-900">Auto-accept orders</div>
                <div className="text-xs text-gray-600">Automatically accept new orders without manual confirmation</div>
              </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                 <input
                   type="checkbox"
                   checked={settings.autoAcceptOrders}
                   onChange={(e) => handleSettingChange('autoAcceptOrders', e.target.checked)}
                   className="sr-only peer"
                   aria-label="Auto-accept orders"
                 />
                 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
               </label>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <div className="text-sm font-medium text-gray-900">SMS notifications</div>
                <div className="text-xs text-gray-600">Send SMS updates to customers about order status</div>
              </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                 <input
                   type="checkbox"
                   checked={settings.smsNotifications}
                   onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                   className="sr-only peer"
                   aria-label="SMS notifications"
                 />
                 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
               </label>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium text-gray-900">Email receipts</div>
                <div className="text-xs text-gray-600">Send email receipts to customers after payment</div>
              </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                 <input
                   type="checkbox"
                   checked={settings.emailReceipts}
                   onChange={(e) => handleSettingChange('emailReceipts', e.target.checked)}
                   className="sr-only peer"
                   aria-label="Email receipts"
                 />
                 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
               </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Preparation Time (minutes)</label>
                             <input
                 type="number"
                 value={settings.preparationTime}
                 onChange={(e) => handleSettingChange('preparationTime', parseInt(e.target.value))}
                 min={5}
                 max={60}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 aria-label="Preparation time in minutes"
               />
              <p className="text-xs text-gray-500 mt-1">Average time to prepare orders</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Orders per Hour</label>
                             <input
                 type="number"
                 value={settings.maxOrdersPerHour}
                 onChange={(e) => handleSettingChange('maxOrdersPerHour', parseInt(e.target.value))}
                 min={1}
                 max={100}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 aria-label="Maximum orders per hour"
               />
              <p className="text-xs text-gray-500 mt-1">Maximum orders your kitchen can handle</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      {/* Regional Settings */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Regional Settings</h3>
          <p className="text-xs text-gray-600">Location and language preferences</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => handleSettingChange('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Timezone"
              >
                {timezoneOptions.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => handleSettingChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Currency"
              >
                {currencyOptions.map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
              <select
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Language"
              >
                {languageOptions.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'restaurant', label: 'Restaurant', icon: Building2, content: renderRestaurantTab },
    { id: 'orders', label: 'Orders', icon: Bell, content: renderOrderSettingsTab },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon, content: renderPreferencesTab },
  ];

  return (
    <div className="space-y-6">
      {/* Settings Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Content */}
      <div className="min-h-[400px]">
        {tabs.find(tab => tab.id === activeTab)?.content()}
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
