import type { Metadata } from 'next'
import { metadataDeFiesta, PaginaDeFiesta } from '../fiesta-page'

// Lee Postgres: se sirve por petición, como la portada.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return metadataDeFiesta((await params).locale, 'boda')
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <PaginaDeFiesta fiesta="boda" raw={(await params).locale} />
}
