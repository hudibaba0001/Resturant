'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';

interface OpeningHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
}

interface SettingsFormProps {
  restaurantId: string;
  openingHours: OpeningHours | null;
  userRole: string;
}

export default function SettingsForm({ restaurantId, openingHours, userRole }: SettingsFormProps) {
  const [hours, setHours] = useState<OpeningHours>(openingHours || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isReadOnly = userRole === 'viewer';

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  const updateDayHours = (day: string, field: 'open' | 'close', value: string) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof OpeningHours],
        [field]: value
      }
    }));
  };

  const clearDayHours = (day: string) => {
    setHours(prev => {
      const newHours = { ...prev };
      delete newHours[day as keyof OpeningHours];
      return newHours;
    });
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/restaurant/opening-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          openingHours: hours
        })
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        console.error('Failed to save opening hours');
      }
    } catch (error) {
      console.error('Error saving opening hours:', error);
    } finally {
      setSaving(false);
    }
  };

  if (isReadOnly) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          You need editor permissions or higher to modify opening hours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {days.map(({ key, label }) => {
          const dayHours = hours[key as keyof OpeningHours];
          const isOpen = dayHours && (dayHours.open || dayHours.close);
          
          return (
            <div key={key} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="w-24">
                <label className="text-sm font-medium text-gray-700">{label}</label>
              </div>
              
              <div className="flex-1 flex items-center space-x-2">
                <input
                  type="time"
                  value={dayHours?.open || ''}
                  onChange={(e) => updateDayHours(key, 'open', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  aria-label={`${label} opening time`}
                />
                <span className="text-gray-500">to</span>
                <input
                  type="time"
                  value={dayHours?.close || ''}
                  onChange={(e) => updateDayHours(key, 'close', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  aria-label={`${label} closing time`}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${isOpen ? 'text-green-600' : 'text-gray-400'}`}>
                  {isOpen ? 'Open' : 'Closed'}
                </span>
                {isOpen && (
                  <button
                    onClick={() => clearDayHours(key)}
                    className="text-sm text-red-600 hover:text-red-800"
                    aria-label={`Mark ${label} as closed`}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {saved && (
            <span className="text-green-600">Opening hours saved successfully!</span>
          )}
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Hours'}
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Current Schedule</h4>
        <div className="text-sm text-gray-600 space-y-1">
          {days.map(({ key, label }) => {
            const dayHours = hours[key as keyof OpeningHours];
            if (!dayHours || (!dayHours.open && !dayHours.close)) {
              return <div key={key}>{label}: Closed</div>;
            }
            return (
              <div key={key}>
                {label}: {dayHours.open || '--:--'} - {dayHours.close || '--:--'}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

