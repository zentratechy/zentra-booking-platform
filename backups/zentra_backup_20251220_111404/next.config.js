/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimized for Vercel deployment
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  images: {
    unoptimized: true,
  },
  // Enable static exports for better performance
  output: 'standalone',
  // Exclude Web folder from build (we're using root structure)
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/Web/**'],
    };
    return config;
  },
};

module.exports = nextConfig;
