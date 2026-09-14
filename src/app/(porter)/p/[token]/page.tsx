import { PorterPinForm } from '@/modules/checkin/ui/PorterPinForm'

export const metadata = { title: 'Entrar a la puerta' }
export const dynamic = 'force-dynamic'

/**
 * El enlace del portero. Pide su PIN y no enseña nada del evento: el enlace solo, sin PIN,
 * no dice de qué fiesta es.
 */
export default async function PorterEntryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12 text-center text-shell-ink">
      <div className="flex flex-col items-center gap-2">
        <span className="font-display text-[28px] italic">Luxury Atelier</span>
        <span className="font-mono text-[10px] tracking-[0.35em] text-shell-ink/60 uppercase">Acceso a la puerta</span>
      </div>
      <p className="max-w-[34ch] text-[14px] leading-[1.6] text-shell-ink/80">
        Escribe el PIN que te enviaron junto a este enlace. Funciona el día del evento.
      </p>
      <PorterPinForm token={token} />
    </main>
  )
}
