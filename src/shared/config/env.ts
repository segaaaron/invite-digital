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
  /**
   * La clave de Resend, para el correo saliente.
   *
   * **Opcional a propósito.** Sin ella no se envía nada y el resto de la aplicación
   * funciona igual: el alta de un cliente sigue creando la cuenta y enseñando la
   * contraseña en pantalla, que es como se repartía antes de haber correo. Hacerla
   * obligatoria impediría arrancar en desarrollo y a quien despliegue sin proveedor.
   */
  RESEND_API_KEY: z
    .string()
    .optional()
    // El compose pasa `${RESEND_API_KEY:-}`, que sin variable definida llega como cadena
    // vacía y no como ausente: sin esto, «vacía» y «no configurada» serían dos cosas
    // distintas y el adaptador tendría que saberlo.
    .transform((valor) => (valor === '' ? undefined : valor)),
  /**
   * El remitente, en el dominio raíz: Resend verificó `luxuryatelier.net` (la clave DKIM
   * vive en `resend._domainkey.luxuryatelier.net`). El subdominio `send` que aparece en el
   * DNS es solo la dirección de rebotes (MX y SPF del Return-Path), **no** va en el From.
   *
   * `no-reply` porque este buzón no atiende respuestas: el correo lleva dentro a dónde
   * escribir de verdad.
   */
  //
  // Ojo con el `default`: sólo actúa cuando el valor es **ausente**, y el compose pasa
  // `${EMAIL_FROM:-}`, que llega como cadena vacía. Sin el `preprocess`, el remitente
  // quedaría en blanco en producción y Resend rechazaría todos los envíos.
  EMAIL_FROM: z.preprocess(
    (valor) => (valor === '' ? undefined : valor),
    z.string().min(1).default('Luxury Atelier <no-reply@luxuryatelier.net>'),
  ),
  /**
   * `1` escribe en el registro cada consulta a Postgres. Es para **medir** —cuántas consultas
   * cuesta una página— antes y después de optimizar; apagado por defecto y nunca en producción,
   * porque el texto de una consulta puede llevar datos.
   */
  DB_LOG_QUERIES: z.enum(['0', '1']).default('0'),
  /** La clave con la que se guarda cifrado el enlace de cada invitado. Sin ella se deriva de `DATABASE_URL`. */
  LINK_KEY: z.preprocess((valor) => (valor === '' ? undefined : valor), z.string().min(16).optional()),
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
