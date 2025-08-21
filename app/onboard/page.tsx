export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'default-no-store';

import { Suspense } from 'react';
import dynamicImport from 'next/dynamic';

const SignupClient = dynamicImport(() => import('./SignupClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-text">Loading...</div>
    </div>
  ),
});

export default function OnboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupClient />
    </Suspense>
  );
}
