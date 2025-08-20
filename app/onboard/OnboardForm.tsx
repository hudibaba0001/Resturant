'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { z } from 'zod';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const restaurantSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters'),
  description: z.string().optional(),
  cuisine_type: z.string().min(1, 'Please select a cuisine type'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const cuisineTypes = [
  'Italian',
  'Mexican', 
  'Chinese',
  'Japanese',
  'Indian',
  'Thai',
  'American',
  'French',
  'Mediterranean',
  'Greek',
  'Spanish',
  'Korean',
  'Vietnamese',
  'Middle Eastern',
  'African',
  'Caribbean',
  'Other'
];

export default function OnboardForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisine_type: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    try {
      restaurantSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        setErrors({ email: authError.message });
        return;
      }

      if (!authData.user) {
        setErrors({ email: 'Failed to create account' });
        return;
      }

      // 2. Create restaurant
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: formData.name,
          description: formData.description,
          cuisine_type: formData.cuisine_type,
          slug: formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          is_active: true,
          is_verified: false, // Will be verified by admin
        })
        .select()
        .single();

      if (restaurantError) {
        setErrors({ name: restaurantError.message });
        return;
      }

      // 3. Add user as restaurant owner
      const { error: staffError } = await supabase
        .from('restaurant_staff')
        .insert({
          restaurant_id: restaurant.id,
          user_id: authData.user.id,
          role: 'owner',
        });

      if (staffError) {
        setErrors({ name: staffError.message });
        return;
      }

      // 4. Create default menu section
      const { error: sectionError } = await supabase
        .from('menu_sections')
        .insert({
          restaurant_id: restaurant.id,
          name: 'Main Menu',
          description: 'Our main menu items',
          position: 1,
        });

      if (sectionError) {
        console.warn('Failed to create default menu section:', sectionError);
      }

      // Success! Redirect to dashboard
      router.push('/dashboard/menu?welcome=true');
      
    } catch (error) {
      console.error('Onboarding error:', error);
      setErrors({ email: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Restaurant Information */}
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Restaurant Name *
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.name ? 'border-red-300' : ''
            }`}
            placeholder="Your Restaurant Name"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            id="description"
            rows={3}
            value={formData.description}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Tell customers about your restaurant..."
          />
        </div>

        <div>
          <label htmlFor="cuisine_type" className="block text-sm font-medium text-gray-700">
            Cuisine Type *
          </label>
          <select
            name="cuisine_type"
            id="cuisine_type"
            value={formData.cuisine_type}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.cuisine_type ? 'border-red-300' : ''
            }`}
          >
            <option value="">Select cuisine type</option>
            {cuisineTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {errors.cuisine_type && <p className="mt-1 text-sm text-red-600">{errors.cuisine_type}</p>}
        </div>
      </div>

      {/* Account Information */}
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            id="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.email ? 'border-red-300' : ''
            }`}
            placeholder="you@restaurant.com"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password *
          </label>
          <input
            type="password"
            name="password"
            id="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.password ? 'border-red-300' : ''
            }`}
            placeholder="••••••••"
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating your restaurant...' : 'Create Restaurant'}
        </button>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </a>
        </p>
      </div>
    </form>
  );
}
