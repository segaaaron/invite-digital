import { redirect } from 'next/navigation'

/**
 * «Estadísticas» se unió al resumen (28 de septiembre): repetía su donut y sus visitas, y lo único
 * suyo —el embudo, los aparatos y las fuentes— ahora está ahí. La dirección vieja sigue llevando.
 */
export default async function EstadisticasUnidas({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/panel/eventos/${slug}#invitacion`)
}
