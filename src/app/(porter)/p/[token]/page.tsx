import { PorterPinForm } from '@/modules/checkin/ui/PorterPinForm'
import { tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Entrar a la puerta', 'Door sign-in') }
}
export const dynamic = 'force-dynamic'

/**
 * El enlace del portero. Pide su PIN y no enseña nada del evento: el enlace solo, sin PIN,
 * no dice de qué fiesta es.
 */
export default async function PorterEntryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const t = await tr()

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12 text-center text-shell-ink">
      <div className="flex flex-col items-center gap-2">
        <span className="font-display text-[28px] italic">Luxury Atelier</span>
        <span className="font-mono text-[10px] tracking-[0.35em] text-shell-ink/60 uppercase">{t('Acceso a la puerta', 'Door access')}</span>
      </div>
      <p className="max-w-[34ch] text-[14px] leading-[1.6] text-shell-ink/80">
        {t('Escribe el PIN que te enviaron junto a este enlace. Funciona el día del evento.', 'Enter the PIN you were sent with this link. It works on the day of the event.')}
      </p>
      <PorterPinForm token={token} />
    </main>
  )
}
