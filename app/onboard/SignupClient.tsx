'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import { createTenant } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/Card';

export default function SignupClient() {
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = getSupabaseBrowser();
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const cuisine = formData.get('cuisine') as string;
    const address = formData.get('address') as string;
    const city = formData.get('city') as string;
    const country = formData.get('country') as string;

    // Client-side validation
    if (!email || !email.includes('@')) {
      setErr('Please enter a valid email address');
      return;
    }

    if (!password || password.length < 8) {
      setErr('Password must be at least 8 characters long');
      return;
    }

    if (!name || name.length < 2) {
      setErr('Restaurant name must be at least 2 characters');
      return;
    }

    if (!address || address.length < 2) {
      setErr('Address is required');
      return;
    }

    if (!city || city.length < 2) {
      setErr('City is required');
      return;
    }

    startTransition(async () => {
      try {
        // Step 1: Try signup
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
        });

        let session = signupData.session;

        // Step 2: Handle 422 "already registered" by falling back to signin
        if (signupError) {
          if (signupError.message.includes('already registered') || signupError.status === 422) {
            const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (signinError) {
              setErr(`signin: ${signinError.status} - ${signinError.message}`);
              return;
            }

            session = signinData.session;
          } else {
            setErr(`signup: ${signupError.status} - ${signupError.message}`);
            return;
          }
        }

        if (!session) {
          setErr('No session established after authentication');
          return;
        }

        // Step 3: Sync cookies with server
        const syncResponse = await fetch('/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'SIGNED_IN',
            session: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            },
          }),
        });

        if (!syncResponse.ok) {
          setErr('Failed to sync authentication session');
          return;
        }

        // Small delay to ensure cookies are propagated
        await new Promise(resolve => setTimeout(resolve, 100));

        // Step 4: Create restaurant tenant
        const result = await createTenant(formData);

        if (result.error) {
          if (result.error === 'validation' && result.details) {
            // Show field-specific validation errors
            const fieldErrors = result.details.fieldErrors || {};
            const errorMessages = [
              ...(fieldErrors.address || []),
              ...(fieldErrors.city || []),
              ...(fieldErrors.country || []),
              ...(fieldErrors.name || []),
              ...(fieldErrors.description || []),
              ...(fieldErrors.cuisine || []),
            ];
            setErr(errorMessages.join(' • ') || 'Please check the form');
          } else {
            setErr(result.error);
          }
          return;
        }

        setSuccess(true);
        router.push('/dashboard/menu?welcome=true');

      } catch (error: any) {
        setErr(`unhandled: ${error?.message || 'Unknown error occurred'}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text mb-2">Create Your Restaurant</h1>
          <p className="text-text-muted">Get started with Stjarna in minutes</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Restaurant Details */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text mb-2">
                Restaurant Name *
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                placeholder="Your Restaurant Name"
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text mb-2">
                Description
              </label>
              <Input
                id="description"
                name="description"
                type="text"
                placeholder="Brief description of your restaurant"
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="cuisine" className="block text-sm font-medium text-text mb-2">
                Cuisine Type
              </label>
              <Input
                id="cuisine"
                name="cuisine"
                type="text"
                placeholder="e.g., Italian, Japanese, etc."
                className="w-full"
              />
            </div>
          </div>

          {/* Location Details */}
          <div className="space-y-4">
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-text mb-2">
                Address *
              </label>
              <Input
                id="address"
                name="address"
                type="text"
                required
                minLength={2}
                autoComplete="street-address"
                placeholder="123 Main Street"
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-text mb-2">
                City *
              </label>
              <Input
                id="city"
                name="city"
                type="text"
                required
                minLength={2}
                autoComplete="address-level2"
                placeholder="Stockholm"
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-text mb-2">
                Country *
              </label>
              <select
                id="country"
                name="country"
                required
                defaultValue="SE"
                className="w-full rounded-input border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="SE">Sweden</option>
                <option value="NO">Norway</option>
                <option value="DK">Denmark</option>
                <option value="FI">Finland</option>
                <option value="IS">Iceland</option>
                <option value="DE">Germany</option>
                <option value="US">United States</option>
              </select>
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text mb-2">
                Email Address *
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="your@email.com"
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text mb-2">
                Password *
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full"
              />
            </div>
          </div>

          {/* Error Display */}
          {err && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{err}</p>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">Restaurant created successfully! Redirecting...</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full"
            aria-label={isPending ? "Creating restaurant..." : "Create restaurant"}
          >
            {isPending ? 'Creating...' : 'Create Restaurant'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-text-muted">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </Card>
    </div>
  );
}
