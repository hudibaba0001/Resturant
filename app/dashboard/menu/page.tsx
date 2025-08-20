'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createTenant } from '@/app/onboard/actions';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'default-no-store';

export default function DashboardMenuPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pending = searchParams.get('pending');
    const welcome = searchParams.get('welcome');

    if (pending === 'restaurant' && welcome === 'true') {
      // Handle pending restaurant creation
      handlePendingRestaurant();
    }
  }, [searchParams]);

  const handlePendingRestaurant = async () => {
    const pendingData = localStorage.getItem('pendingRestaurantData');
    if (!pendingData) {
      setError('No pending restaurant data found');
      return;
    }

    setIsCreating(true);
    try {
      const formData = new FormData();
      const data = JSON.parse(pendingData);
      
      formData.append('name', data.name);
      formData.append('description', data.description || '');
      formData.append('cuisine', data.cuisine || '');

      const result = await createTenant(formData);
      
      if ('error' in result) {
        setError(result.error);
        return;
      }

      // Success! Clean up and show welcome
      localStorage.removeItem('pendingRestaurantData');
      router.replace('/dashboard/menu?welcome=true');
      
    } catch (err) {
      setError('Failed to create restaurant');
      console.error('Restaurant creation error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (isCreating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Creating your restaurant...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium">Error</div>
          <p className="mt-2 text-gray-600">{error}</p>
          <button 
            onClick={() => router.push('/onboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {searchParams.get('welcome') === 'true' ? 'Welcome to Stjarna!' : 'Dashboard'}
              </h1>
              <p className="text-gray-600">
                {searchParams.get('welcome') === 'true' 
                  ? 'Your restaurant has been created successfully. Menu management coming soon!'
                  : 'Menu management dashboard coming soon...'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
