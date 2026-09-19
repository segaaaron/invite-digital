import withSerwistInit from '@serwist/next'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Standalone output ships a self-contained server.js, so the runtime image
  // carries no package manager and no dev dependencies.
  // Solo al construir la imagen. El rastreo de ficheros del `standalone` es lo que se come
  // el heap y los dos minutos de cada build, y en local no sirve para nada: `next start`
  // arranca del `.next` normal. El Dockerfile pone `STANDALONE=1`.
  ...(process.env.STANDALONE === '1' ? { output: 'standalone' as const } : {}),
  // Dos `next dev` no pueden compartir la misma carpeta de compilación: el segundo se
  // niega a arrancar. Las e2e contra desarrollo usan la suya con `NEXT_DIST_DIR`, así que
  // corren sin apagar el servidor que ya tengas abierto.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  poweredByHeader: false,
  // Los mapas de origen de la fase de prerenderizado se generan aunque nadie los use en
  // producción, y cuestan memoria en el momento más caro del build.
  enablePrerenderSourceMaps: false,
  experimental: {
    // Las fotos del evento y los comprobantes suben por Server Action con un tope de 8 MB
    // (`MAX_MEDIA_BYTES`, `MAX_PROOF_BYTES`), y Next corta el cuerpo en **1 MB** si nadie
    // dice otra cosa: cualquier foto de teléfono respondía 413 antes de llegar a nuestra
    // comprobación. Las e2e subían un PNG de un píxel y no lo veían; ahora sube uno de
    // tres megas. 10 MB son los 8 del fichero más el sobre del multipart, y el mismo
    // techo que Next ya pone por defecto al proxy.
    serverActions: { bodySizeLimit: '32mb' },
    // **Esta línea es la que baja el heap.** Next compila webpack en un worker aparte
    // para no cargar el proceso principal, pero lo apaga solo en cuanto detecta
    // configuración de webpack propia:
    //
    //   next/dist/build/index.js:930
    //   const useBuildWorker = config.experimental.webpackBuildWorker ||
    //     (config.experimental.webpackBuildWorker === undefined && !config.webpack)
    //
    // Y `@serwist/next` inyecta la suya (`dist/index.mjs:121`) para meter el
    // `InjectManifest` del Service Worker. Es decir: activar el modo puerta sin red
    // apagó el aislamiento de memoria del build **sin que nada lo dijera**, y por eso
    // el `--max-old-space-size` fue subiendo 8 → 12 → 16 GB en vez de arreglarse.
    // Puesto a mano, el worker vuelve pese a la configuración de Serwist.
    webpackBuildWorker: true,
    // Documentado por Vercel como de bajo riesgo: menos memoria máxima a cambio de algo
    // más de tiempo de compilación.
    webpackMemoryOptimizations: true,
    serverSourceMaps: false,
  },
  // Next's SWC output requires @swc/helpers at runtime, but tracing only copies the
  // handful of files it sees imported, and misses the copy nested under next's own
  // pnpm directory — the standalone server then dies with MODULE_NOT_FOUND at boot.
  // El comodín va **anclado al nombre del paquete en la raíz del almacén**, nunca
  // `.pnpm/**`. Un `**` ahí obliga a recorrer los 584 paquetes del almacén y sus
  // `node_modules` anidados —cerca de un gigabyte— reteniendo la lista entera en
  // memoria: es lo que hacía morir al build en «Collecting build traces», y la razón
  // real de que el `--max-old-space-size` fuera subiendo hasta 16 GB. La compilación de
  // webpack tarda doce segundos; el que se comía los cuatro gigas era este glob.
  //
  // Sigue sin fijar la versión, que es lo que se quería: `@swc+helpers@*` y
  // `@node-rs+argon2*` cubren cualquier actualización, y el segundo cubre también el
  // binario nativo de Linux que se instala dentro de la imagen.
  outputFileTracingIncludes: {
    '/**/*': [
      './node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**',
      './node_modules/.pnpm/@node-rs+argon2*/node_modules/@node-rs/**',
      // Las fuentes de las imágenes de vista previa (satori solo lee TTF). Se leen con una
      // ruta compuesta en tiempo de ejecución, así que el rastreo no las ve seguro; son tres
      // ficheros pequeños y anclados, no un glob sobre una carpeta grande.
      './src/shared/seo/*.ttf',
    ],
  },
  images: { formats: ['image/avif', 'image/webp'], qualities: [75, 90] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // La ponía Caddy; con Dokploy delante está Traefik, que no la pone. Un día, como
          // en el Caddyfile: subirla a un año solo con el dominio estable semanas. Sobre
          // http —desarrollo— el navegador la ignora por especificación.
          { key: 'Strict-Transport-Security', value: 'max-age=86400' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // El check-in del día del evento lee el QR del pase con la cámara del
        // dispositivo de la puerta. La política global la niega, así que se reabre
        // solo para esta ruta y solo para el propio origen: esta regla va después a
        // propósito, porque la última coincidencia es la que manda.
        //
        // La excepción gemela para `/dashboard/:path*` se retiró: la maqueta pasó a
        // `docs/design-reference/dashboard/` y ya no se sirve, así que apuntaba a una
        // ruta que hoy responde 404. Sin esta excepción la política
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
