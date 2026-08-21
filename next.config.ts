import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Standalone output ships a self-contained server.js, so the runtime image
  // carries no package manager and no dev dependencies.
  output: 'standalone',
  poweredByHeader: false,
  // Next's SWC output requires @swc/helpers at runtime, but tracing only copies the
  // handful of files it sees imported, and misses the copy nested under next's own
  // pnpm directory — the standalone server then dies with MODULE_NOT_FOUND at boot.
  outputFileTracingIncludes: {
    '/**/*': ['./node_modules/.pnpm/**/@swc/helpers/**', './node_modules/.pnpm/**/@node-rs/argon2*/**'],
  },
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
