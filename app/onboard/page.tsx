import dynamicImport from 'next/dynamic';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'default-no-store';

// Dynamically import the new signup client component
const SignupClient = dynamicImport(() => import('./SignupClient'), {
  ssr: false,
  loading: () => <div className="animate-pulse">Loading form...</div>
});

export default function OnboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Stjarna</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create your restaurant's digital menu and start taking orders
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                     <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
               <SignupClient />
             </div>
      </div>

      {/* Features Preview */}
      <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-4 shadow sm:rounded-lg sm:px-10">
          <h3 className="text-lg font-medium text-gray-900 mb-4">What you'll get:</h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Digital menu with real-time updates
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              AI-powered customer chat
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Order management system
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Payment processing with Stripe
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Widget for your website
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
