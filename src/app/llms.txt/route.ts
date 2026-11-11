import { site, webPublica } from '@/app/composition/container'
import { formatMoney } from '@/modules/catalog'
import { sitioPublico } from '@/modules/admin/domain/site-settings'
import { env } from '@/shared/config/env'
import { registrarFallo } from '@/shared/observability/fallos'
import { attempt, isOk } from '@/shared/result'

// Se arma por petición: precios y diseños salen de la base, así el fichero no se queda viejo.
export const dynamic = 'force-dynamic'

// llmstxt.org: H1, cita en bloque y listas de enlaces. Solo lo publicado; si la base falla, queda lo fijo.
// Se registra aquí, con el `Error` original: `registrarFallo` lo guarda en el Registro de fallos del admin y trae la pila.
// `registrados` evita el doble aviso cuando además el `Err` llega a la rama de abajo.
const caida = (que: string, registrados: Set<string>) => (cause: unknown) => {
  registrados.add(que)
  registrarFallo('llms.txt', `llms.txt no se pudo leer ${que}:`, cause)
  return { kind: 'not_found' as const, detail: cause instanceof Error ? cause.message : 'error desconocido' }
}

export async function GET(): Promise<Response> {
  const base = env.SITE_URL
  const registrados = new Set<string>()
  const [planes, modelos, sitio] = await Promise.all([
    attempt(() => webPublica.planes('es'), caida('los planes', registrados)),
    attempt(() => webPublica.modelos('es'), caida('los diseños', registrados)),
    site.settings().then((s) => sitioPublico(s, 'es')).catch((e: unknown) => (registrarFallo('llms.txt', 'llms.txt no se pudo leer los ajustes:', e), null)),
  ])

  const lineas = [
    '# Luxury Atelier',
    '',
    '> Invitaciones digitales de lujo para bodas, XV años y otras celebraciones, en Bolivia. Se abren desde WhatsApp sin instalar nada, con el nombre de cada invitado, música, confirmación en vivo y pase QR. Español e inglés.',
    '',
    'El panel de clientes, los enlaces de invitados y la puerta del evento son privados y no están pensados para rastreo.',
    '',
  ]

  // Con `webPublica.planes` fallando devuelve [] y se omite la sección entera: mejor nada que un precio viejo.
  // Un `Err` devuelto (sin excepción) también se avisa; el que lanzó ya quedó registrado arriba.
  if (!isOk(planes) && !registrados.has('los planes')) registrarFallo('llms.txt', 'llms.txt no se pudo leer los planes:', planes.error.detail)
  const lista = isOk(planes) ? planes.value : []
  if (lista.length > 0) {
    lineas.push('## Planes', ...lista.map((p) => `- [${p.name}, ${formatMoney(p.price, 'es')}](${base}/es#planes): ${p.tagline}`), '')
  }

  lineas.push('## Servicios', `- [Invitaciones de boda](${base}/es/bodas)`, `- [Invitaciones de XV años](${base}/es/xv-anos)`, `- [Catálogo de diseños](${base}/es/colecciones)`, '')

  if (!isOk(modelos) && !registrados.has('los diseños')) registrarFallo('llms.txt', 'llms.txt no se pudo leer los diseños:', modelos.error.detail)
  const diseños = isOk(modelos) ? modelos.value : []
  if (diseños.length > 0) {
    lineas.push('## Diseños', ...diseños.map((m) => (m.description.startsWith('Modelo ') ? `- [${m.name}](${base}/es/modelos/${m.slug})` : `- [${m.name}](${base}/es/modelos/${m.slug}): ${m.description}`.replace(/\s+/g, ' '))), '')
  }

  lineas.push('## English', `- [Home](${base}/en)`, `- [Collections](${base}/en/collections)`)
  if (sitio !== null && sitio.whatsappVisible !== '') lineas.push('', '## Contacto', `- WhatsApp ${sitio.whatsappVisible}`)

  return new Response(lineas.join('\n') + '\n', { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}
