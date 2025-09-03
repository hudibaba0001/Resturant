'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ChefHat } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Implement actual login logic
    console.log('Login attempt:', { email, password });
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">
      {/* Food-themed doodle overlay */}
      <div 
        className="absolute inset-0 opacity-5 z-0"
        style={{
          backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="40">🍕🍔🍟🌮🍜🍣🍱🥘🍲🥗</text></svg>')`,
          backgroundSize: '200px 200px',
          backgroundRepeat: 'repeat'
        }}
      />
      
      {/* Login Card */}
      <div className="relative w-96 p-10 bg-gray-900/85 rounded-2xl shadow-2xl shadow-orange-500/15 backdrop-blur-md z-10 border border-gray-800">
        {/* Chef Hat Icon */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
            <ChefHat className="w-6 h-6 text-black" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
            Gastronome AI
          </h1>
          <p className="text-gray-400 text-sm">
            Optimizing kitchens with intelligence for the restaurant industry.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <input
              type="email"
              placeholder="Restaurant Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="relative w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Password Input */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Kitchen Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-4 pr-12 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-orange-400 to-orange-600 text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-orange-500/25 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                Logging In...
              </div>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <Link 
            href="/forgot-password" 
            className="text-orange-400 hover:text-orange-300 text-sm transition-colors"
          >
            Forgot credentials?
          </Link>
        </div>

        {/* Sign Up Link */}
        <div className="mt-4 text-center">
          <span className="text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link 
              href="/signup" 
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              Sign up
            </Link>
          </span>
        </div>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        <div className="absolute top-40 right-32 w-1 h-1 bg-orange-400 rounded-full animate-pulse delay-1000" />
        <div className="absolute bottom-32 left-32 w-1.5 h-1.5 bg-orange-600 rounded-full animate-pulse delay-2000" />
        <div className="absolute bottom-20 right-20 w-1 h-1 bg-orange-500 rounded-full animate-pulse delay-3000" />
      </div>
    </div>
  );
}
