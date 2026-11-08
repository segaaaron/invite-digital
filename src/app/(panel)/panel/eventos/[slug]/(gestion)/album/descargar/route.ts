import { notFound } from 'next/navigation'
import { events, plans } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { zipEnFlujo } from '@/modules/events/domain/zip'
import { registrarFallo } from '@/shared/observability/fallos'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

/**
 * **Todas las fotos del álbum en un ZIP** (documento del 6 nov): la pareja las descarga antes de que se borren
 * con la invitación. Es de quien lleva el evento —sesión y sección `cliente`, como el resto del panel—; un
 * evento ajeno responde 404, nunca 403.
 *
 * Solo lo que subieron los invitados: la galería de la invitación ya la tiene quien la armó. Y solo en los
 * planes con álbum: sin él no hay nada que descargar y la ruta no existe.
 */
export async function GET(_peticion: Request, { params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  if (isErr(await plans.requireFeature(event.value.id, 'guestPhotos'))) notFound()

  const fotos = (await events.media.list(event.value.id))
    .filter((fila) => fila.uploadedByGroupId !== null && fila.contentType.startsWith('image/'))
    .sort((a, b) => a.id.localeCompare(b.id))
  if (fotos.length === 0) notFound()

  // Nombres con número y sin el nombre original: el invitado escribe ese nombre, y dentro de un ZIP sería un
  // `../` esperando a quien lo abra con una herramienta descuidada.
  const ancho = String(fotos.length).length
  const flujo = zipEnFlujo(
    fotos.map((fila, i) => ({
      nombre: `foto-${String(i + 1).padStart(Math.max(ancho, 4), '0')}.webp`,
      leer: async () => (await events.media.read(fila.id))?.bytes ?? null,
    })),
    (nombre, causa) => registrarFallo('album/descargar', 'No se pudo meter %s en el ZIP del evento %s:', nombre, event.value.id, causa),
  )

  return new Response(flujo, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="album-${slug.replace(/[^a-z0-9-]/gi, '')}.zip"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
