import withSerwistInit from '@serwist/next'
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
      {
        // El check-in del día del evento lee el QR del pase con la cámara del
        // dispositivo de la puerta. La política global la niega, así que se
        // reabre solo para esta ruta y solo para el propio origen: esta regla
        // va después a propósito, porque la última coincidencia es la que manda.
        source: '/dashboard/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
      {
        // La puerta de verdad, ya no la maqueta. Sin esta excepción la política
        // global deja `getUserMedia` en un fallo de permiso que ninguna prueba
        // unitaria ve, porque la cabecera solo existe en el servidor.
        source: '/panel/eventos/:slug/puerta',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // El Service Worker se versiona con el build: si no, un despliegue nuevo deja a la
  // puerta sirviendo el JS de ayer. En desarrollo va apagado, así que probarlo con
  // `pnpm dev` no prueba nada: se comprueba contra la imagen.
  disable: process.env.NODE_ENV === 'development',
})

export default withSerwist(nextConfig)
