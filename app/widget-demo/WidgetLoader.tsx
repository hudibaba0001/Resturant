'use client';

import { useEffect } from 'react';

interface WidgetLoaderProps {
  restaurantId: string;
}

export default function WidgetLoader({ restaurantId }: WidgetLoaderProps) {
  useEffect(() => {
    // Load the widget script
    const script = document.createElement('script');
    script.src = '/widget.js'; // Use local widget.js for development
    script.setAttribute('data-restaurant', restaurantId);
    script.async = true;
    
    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script when component unmounts
      document.head.removeChild(script);
    };
  }, [restaurantId]);

  return null; // This component doesn't render anything
}
