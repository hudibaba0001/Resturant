'use client';
import { useState, useTransition } from 'react';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { createTenant } from './actions';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

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

export default function SignupClient() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (formData: FormData) => {
    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        cuisine_type: formData.get('cuisine_type') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      };
      restaurantSchema.parse(data);
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    
    const formData = new FormData(e.currentTarget);
    
    if (!validateForm(formData)) return;

    // Prevent double click / 429
    if (pending) return;

    const email = String(formData.get('email') || '');
    const password = String(formData.get('password') || '');

    start(async () => {
      try {
        // Store form data for after email confirmation
        const formDataObj = {
          name: formData.get('name'),
          description: formData.get('description'),
          cuisine: formData.get('cuisine_type'),
        };
        localStorage.setItem('pendingRestaurantData', JSON.stringify(formDataObj));

        // 1. Sign up the user with email redirect
        const base = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL;
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: `${base}/auth/callback` }
        });
        
        if (error) {
          if (error.message.includes('429') || error.message.includes('rate limit')) {
            setErrors({ email: 'Too many requests. Please wait a moment and try again.' });
          } else {
            setErrors({ email: error.message });
          }
          return;
        }

        if (!data.session) {
          setErrors({ email: 'Check your inbox to verify your email. After clicking the link, you\'ll be redirected automatically.' });
          return;
        }

        // Ensure server sees the session immediately
        await fetch("/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "SIGNED_IN", session: data.session }),
        });

        // 2. Create restaurant using server action (immediate session case)
        const res = await createTenant(formData);
        if ('error' in res) {
          console.error('Restaurant creation error:', res.error);
          setErrors({ name: String(res.error) });
          return;
        }

        // 3. Success! Redirect to dashboard
        localStorage.removeItem('pendingRestaurantData'); // Clean up
        router.replace('/dashboard/menu?welcome=true');
        
      } catch (error) {
        console.error('Onboarding error:', error);
        setErrors({ email: 'An unexpected error occurred' });
      }
    });
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
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
          disabled={pending}
          className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Creating your restaurant...' : 'Create Restaurant'}
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
