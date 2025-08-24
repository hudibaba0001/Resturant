/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        source: '/widget.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ];
  },

  // Enable HSTS for production
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: '/api/health/route',
      },
    ];
  },

  // Optimizations
  compress: true,
  poweredByHeader: false,
  
  // Bundle analyzer (optional)
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     config.resolve.fallback = {
  //       ...config.resolve.fallback,
  //       fs: false,
  //     };
  //   }
  //   return config;
  // },

  // Environment variables (if needed)
  // env: {
  //   CUSTOM_KEY: process.env.CUSTOM_KEY,
  // },

  // Experimental features
  experimental: {
    // Enable if needed for performance
    // optimizeCss: true,
    // scrollRestoration: true,
  },
};

module.exports = nextConfig;
