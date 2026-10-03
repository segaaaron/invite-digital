import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eventoDeLaInvitacion } from '@/app/(guest)/i/[token]/calendario'
import { portadaParaCompartir } from '@/modules/events/ui/themes/portada-para-compartir'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { enlaceDeGoogle } from '@/shared/calendario/ics'
import { env } from '@/shared/config/env'
import { fechaEnBolivia } from '@/shared/format/fecha'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { leerSaveTheDate } from './datos'

const sitio = () => env.SITE_URL.replace(/\/+$/, '')

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const datos = await leerSaveTheDate(token)
  if (datos === null) return {}
  const { tarjeta } = datos
  const titulo = `${tarjeta.antetitulo} · ${tarjeta.nombres ?? tarjeta.titulo}`
  const imagen = `${sitio()}/guarda/${token}/imagen`
  return {
    title: titulo,
    description: tarjeta.descripcion,
    robots: { index: false, follow: false },
    openGraph: { title: titulo, description: tarjeta.descripcion, images: [{ url: imagen, secureUrl: imagen, width: 1200, height: 630, type: 'image/jpeg', alt: titulo }] },
    twitter: { card: 'summary_large_image', title: titulo, description: tarjeta.descripcion, images: [imagen] },
  }
}

/**
 * El «save the date»: antes de la invitación, la portada del diseño con los nombres, la fecha,
 * cuánto falta y «Agregar a mi calendario». Cuánto falta se calcula al pedir la página: sin
 * temporizadores.
 */
export default async function SaveTheDatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const datos = await leerSaveTheDate(token)
  if (datos === null) notFound()
  const { event, contenido, tarjeta } = datos
  const t = getDictionary(event.locale).saveTheDate
  const dias = Math.round((Date.parse(`${event.eventDate}T00:00:00Z`) - Date.parse(`${fechaEnBolivia(new Date())}T00:00:00Z`)) / 86_400_000)
  const faltan = dias <= 0 ? t.hoy : dias === 1 ? t.faltaUno : t.faltan.replace('{n}', String(dias))
  const calendario = enlaceDeGoogle(eventoDeLaInvitacion({ ...event, title: tarjeta.nombres ?? event.title }, contenido, `${sitio()}/guarda/${token}`))
  const portada = portadaParaCompartir(themeFor(event.themeKey).key)

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6 py-12 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- arte propio ya optimizado, a sangre */}
      <img alt="" className="absolute inset-0 size-full object-cover blur-[2px] brightness-[0.45]" src={portada} />
      <section className="relative flex max-w-[460px] flex-col items-center gap-5 text-center">
        <p className="font-mono text-[11px] tracking-[0.4em] text-gold-light uppercase">{tarjeta.antetitulo}</p>
        <h1 className="font-display text-[52px] leading-[1.02] font-light text-balance">{tarjeta.nombres ?? tarjeta.titulo}</h1>
        <span aria-hidden className="h-px w-16 bg-white/70" />
        <p className="text-[16px] tracking-[0.04em]">{tarjeta.fecha}</p>
        <p className="font-display text-[26px] text-gold-light">{faltan}</p>
        <a
          className="mt-2 rounded-[var(--radius-pill)] border border-white/60 px-6 py-3 font-mono text-[11px] tracking-[0.28em] uppercase transition-colors hover:bg-white/10"
          href={calendario}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t.addCalendar}
        </a>
        <p className="text-[13px] text-white/80">{t.soon}</p>
      </section>
    </main>
  )
}
