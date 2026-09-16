import { redirect } from 'next/navigation'

/** Los porteros viven ahora en Equipo, con el resto de quien ayuda. Los enlaces viejos siguen. */
export default async function PorterosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/panel/eventos/${slug}/equipo`)
}
