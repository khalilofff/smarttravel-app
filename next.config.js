/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    // Allow local uploaded images
    localPatterns: [
      { pathname: '/uploads/**' },
    ],
  },
  // Increase body size limit for file uploads (5MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
};

module.exports = nextConfig;
