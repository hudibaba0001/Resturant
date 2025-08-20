'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

type Restaurant = {
  id: string
  name: string
  is_active: boolean
  is_verified: boolean
}

type EmbedClientProps = {
  restaurant: Restaurant
  isOpen: boolean
  embedSnippet: string
}

export default function EmbedClient({ restaurant, isOpen, embedSnippet }: EmbedClientProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Embed Widget</h1>
          <p className="mt-2 text-sm text-gray-700">
            Copy the widget snippet to embed it on your website.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {/* Restaurant Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Restaurant Status</h2>
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${isOpen ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-sm font-medium text-gray-900">
              {isOpen ? 'Open' : 'Closed'}
            </span>
            <span className="text-sm text-gray-500">
              Restaurant ID: {restaurant.id}
            </span>
          </div>
        </div>

        {/* Embed Snippet */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Embed Snippet</h2>
          <p className="text-sm text-gray-600 mb-4">
            Copy this code and paste it into your website's HTML where you want the widget to appear.
          </p>
          <div className="relative">
            <pre className="bg-gray-50 rounded-md p-4 text-sm overflow-x-auto">
              <code>{embedSnippet}</code>
            </pre>
            <CopyButton text={embedSnippet} />
          </div>
        </div>

        {/* Live Preview */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h2>
          <p className="text-sm text-gray-600 mb-4">
            See how the widget will appear on your website.
          </p>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <EmbedPreview restaurantId={restaurant.id} />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">How to use</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Copy the embed snippet above</li>
            <li>Paste it into your website's HTML (in the &lt;head&gt; or before &lt;/body&gt;)</li>
            <li>The widget will appear as a "Menu & Order" button in the bottom right corner</li>
            <li>Visitors can click it to chat and place orders</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

// Copy button component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
      aria-label="Copy embed snippet"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  )
}

// Embed preview component
function EmbedPreview({ restaurantId }: { restaurantId: string }) {
  return (
    <div className="relative h-96 bg-white rounded border">
      <div className="absolute bottom-4 right-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors">
          Menu & Order
        </button>
      </div>
      <div className="absolute top-4 left-4 text-sm text-gray-500">
        Widget preview (click to test)
      </div>
    </div>
  )
}

