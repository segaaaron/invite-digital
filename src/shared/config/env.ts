import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  SITE_URL: z.string().url('SITE_URL debe ser una URL absoluta'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /**
   * Dónde viven los comprobantes de pago. **Fuera de `public/`**: ahí dentro estarían
   * publicados en internet, y un comprobante lleva nombre, banco y cuenta de una persona.
   * En producción es un volumen montado; en desarrollo, una carpeta ignorada por git.
   */
  ORDERS_DIR: z.string().min(1).default('.data/comprobantes'),
  /**
   * Dónde viven las fotografías que el atelier sube para las invitaciones.
   *
   * Fuera de `public/`, como los comprobantes y por el mismo motivo: en `public/` estarían
   * publicadas en internet, y son fotografías de la novia y de su familia. En producción
   * es un **volumen**, no una carpeta de la imagen — dentro de la imagen, cada despliegue
   * borraría las fotos de todas las bodas en curso.
   */
  EVENT_MEDIA_DIR: z.string().min(1).default('.data/eventos'),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Configuración de entorno inválida — ${detail}`)
  }
  return parsed.data
}

export const env: Env = parseEnv(process.env)
