'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface EmbedClientProps {
  restaurantId: string;
  isActive: boolean;
}

export default function EmbedClient({ restaurantId, isActive }: EmbedClientProps) {
  const [copied, setCopied] = useState(false);
  
  const widgetOrigin = process.env.NEXT_PUBLIC_WIDGET_ORIGIN || 'http://localhost:3000';
  const embedSnippet = `<script src="${widgetOrigin}/widget.js" data-restaurant="${restaurantId}" defer></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isActive) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          Your restaurant needs to be active and verified before you can embed the widget.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{embedSnippet}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
          aria-label="Copy embed code"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      
      {copied && (
        <p className="text-sm text-green-600">Embed code copied to clipboard!</p>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Quick Setup</h4>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Copy the embed code above</li>
          <li>2. Paste it into your website's HTML, just before &lt;/body&gt;</li>
          <li>3. Save and publish your website</li>
          <li>4. The widget will appear as a floating button</li>
        </ol>
      </div>
    </div>
  );
}

