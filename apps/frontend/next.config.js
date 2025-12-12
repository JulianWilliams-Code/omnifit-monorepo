/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@omnifit/shared', '@omnifit/ui'],
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet',
  },
};

module.exports = nextConfig;