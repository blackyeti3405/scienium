/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },
  experimental: {
    // firecrawl uses undici (Node built-in HTTP) which webpack can't bundle.
    // sharp likewise needs native bindings. Mark both as server-side externals.
    serverComponentsExternalPackages: ['sharp', 'firecrawl'],
  },
}

export default nextConfig
