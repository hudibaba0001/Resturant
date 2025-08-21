'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { createTenant } from './actions';
import { z } from 'zod';

const restaurantSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters'),
  description: z.string().optional(),
  cuisine_type: z.string().min(1, 'Please select a cuisine type'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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
  const [err, setErr] = useState<string | null>(null);

  async function syncCookie(session: any) {
    // Make server see the session for RLS
    await fetch('/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'SIGNED_IN', session }),
    });
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Clear error when user starts typing
    if (err) {
      setErr(null);
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
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErr(Object.values(newErrors)[0] || 'Please check your input.');
      }
      return false;
    }
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setErr(null);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');

    // Basic client validation to avoid 422s
    if (!email.includes('@')) { setErr('Enter a valid email.'); return; }
    if (password.length < 8) { setErr('Password must be at least 8 characters.'); return; }

    if (!validateForm(fd)) return;

    start(async () => {
      try {
        // 1) Try signUp
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // ⚠️ Only include emailRedirectTo if you ENABLE email confirmation
          // options: { emailRedirectTo: `${origin}/auth/callback` }
        });

        if (error) {
          setErr(`signup: ${error.status ?? 422} - ${error.message}`);
          // if user already exists, try sign-in with same password:
          if ((error.message || '').toLowerCase().includes('already')) {
            const si = await supabase.auth.signInWithPassword({ email, password });
            if (si.error) { setErr(`signin: ${si.error.message}`); return; }
            await fetch('/auth/callback', { method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ event:'SIGNED_IN', session: si.data.session }) });
          } else {
            return; // stop on other 422 causes (policy, disabled signups, captcha)
          }
        } else {
          // success: sync cookie
          await fetch('/auth/callback', { method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ event:'SIGNED_IN', session: data.session }) });
        }

        // 4) Create restaurant on server (RLS sees user now)
        const res = await createTenant(fd);
        if ((res as any).error) { setErr(String((res as any).error)); return; }

        router.replace('/dashboard/menu?welcome=true');
      } catch (error) {
        console.error('Onboarding error:', error);
        setErr('An unexpected error occurred');
      }
    });
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Your Restaurant Name"
          />
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select cuisine type</option>
            {cuisineTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="you@restaurant.com"
          />
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="••••••••"
          />
        </div>
      </div>

      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Creating…' : 'Create Restaurant'}
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
