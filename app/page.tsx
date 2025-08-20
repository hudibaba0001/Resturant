import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-6xl font-bold text-gray-900 mb-6">
          Stjarna
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-powered restaurant ordering and chat platform
        </p>
        <p className="text-lg text-gray-700 mb-12 max-w-2xl mx-auto">
          Transform your restaurant with a digital menu, AI chat assistant, and seamless ordering system. 
          Get started in minutes and start taking orders today.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/onboard" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            Get Started - Free
          </Link>
          <Link 
            href="/login" 
            className="bg-white hover:bg-gray-50 text-blue-600 font-semibold py-3 px-8 rounded-lg text-lg border-2 border-blue-600 transition-colors"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Digital Menu</h3>
            <p className="text-gray-600">Create and manage your menu with real-time updates and beautiful presentation.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Chat Assistant</h3>
            <p className="text-gray-600">Let AI handle customer questions about your menu, allergens, and recommendations.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Management</h3>
            <p className="text-gray-600">Accept orders online with payment processing and real-time notifications.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
