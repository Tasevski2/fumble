/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
    // domains: ['tokens.1inch.io', 'raw.githubusercontent.com'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      encoding: false,
      stream: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;
