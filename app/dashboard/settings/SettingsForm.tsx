'use client'

import { useState } from 'react'

type OpeningHours = {
  monday?: { open: string; close: string } | null
  tuesday?: { open: string; close: string } | null
  wednesday?: { open: string; close: string } | null
  thursday?: { open: string; close: string } | null
  friday?: { open: string; close: string } | null
  saturday?: { open: string; close: string } | null
  sunday?: { open: string; close: string } | null
}

type SettingsFormProps = {
  restaurantId: string
  initialOpeningHours: OpeningHours | null
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

export default function SettingsForm({ restaurantId, initialOpeningHours }: SettingsFormProps) {
  const [openingHours, setOpeningHours] = useState<OpeningHours>(initialOpeningHours || {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleDayChange = (day: string, field: 'open' | 'close', value: string) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof OpeningHours],
        [field]: value
      }
    }))
  }

  const handleDayToggle = (day: string, enabled: boolean) => {
    if (enabled) {
      setOpeningHours(prev => ({
        ...prev,
        [day]: { open: '09:00', close: '17:00' }
      }))
    } else {
      setOpeningHours(prev => ({
        ...prev,
        [day]: null
      }))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // This would be a server action in a real implementation
      console.log('Saving opening hours:', openingHours)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save opening hours:', error)
    } finally {
      setSaving(false)
    }
  }

  const validateHours = (hours: OpeningHours) => {
    for (const [day, dayHours] of Object.entries(hours)) {
      if (dayHours && (!dayHours.open || !dayHours.close)) {
        return false
      }
    }
    return true
  }

  const isValid = validateHours(openingHours)

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600">
        Set your restaurant's opening hours. Leave a day empty to mark it as closed.
      </div>

      <div className="space-y-4">
        {DAYS.map(({ key, label }) => {
          const dayHours = openingHours[key as keyof OpeningHours]
          const isEnabled = dayHours !== null && dayHours !== undefined

          return (
            <div key={key} className="flex items-center space-x-4">
              <div className="w-24">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => handleDayToggle(key, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">{label}</span>
                </label>
              </div>
              
              {isEnabled ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={dayHours?.open || ''}
                    onChange={(e) => handleDayChange(key, 'open', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    aria-label={`${label} opening time`}
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={dayHours?.close || ''}
                    onChange={(e) => handleDayChange(key, 'close', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    aria-label={`${label} closing time`}
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-500">Closed</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-gray-600">
          {!isValid && (
            <span className="text-red-600">Please fill in both opening and closing times for enabled days.</span>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {saved && (
            <span className="text-sm text-green-600">Settings saved!</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Preview</h3>
        <div className="text-sm text-gray-600 space-y-1">
          {DAYS.map(({ key, label }) => {
            const dayHours = openingHours[key as keyof OpeningHours]
            return (
              <div key={key} className="flex justify-between">
                <span>{label}:</span>
                <span>
                  {dayHours && dayHours.open && dayHours.close
                    ? `${dayHours.open} - ${dayHours.close}`
                    : 'Closed'
                  }
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

