'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_verified: boolean;
}

interface RestaurantContextType {
  restaurant: Restaurant;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function RestaurantProvider({ 
  children, 
  restaurant 
}: { 
  children: ReactNode;
  restaurant: Restaurant;
}) {
  return (
    <RestaurantContext.Provider value={{ restaurant }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}
