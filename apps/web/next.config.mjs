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
  async headers() {
    // Sprite URLs are content-addressed (the manifest appends a ?v=<hash> token, see
    // lib/sprites/manifest.ts + scripts/gen-sprite-versions.mjs), so a redraw changes
    // the URL. That lets us cache immutably in production — instant on reload and on
    // the next classroom session, and never stale, because fresh art arrives on a new
    // URL. In development we send no-cache so local sprite edits show up immediately.
    const isProd = process.env.NODE_ENV === 'production'
    return [
      {
        source: '/sprites/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isProd ? 'public, max-age=31536000, immutable' : 'no-cache',
          },
        ],
      },
    ]
  },
}

export default nextConfig
