import { requireSession } from '@/modules/identity/session-cookie'
import { BRAND } from '@/shared/config/brand'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { HelpCenter } from '@/shared/help/HelpCenter'

export const metadata = { title: 'Ayuda' }

export default async function HelpPage() {
  await requireSession()

  return (
    <>
      <PanelHeader kicker="Soporte" title="Centro de ayuda" />

      <div className="grid gap-4.5 lg:grid-cols-[1.4fr_1fr]">
        <PanelCard>
          <HelpCenter />
        </PanelCard>

        <PanelCard title="Contactar soporte">
          <div className="flex flex-col gap-4 text-[13px] leading-[1.7] text-ink-soft">
            <p>¿La respuesta no está arriba? Escríbenos y lo vemos contigo.</p>
            <a
              className="w-fit cursor-pointer rounded-[var(--radius-pill)] border border-shell-deep bg-linear-to-b from-shell to-shell-deep px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-white uppercase transition-all duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
              href={`https://wa.me/${BRAND.whatsapp.replace('+', '')}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              Escribir por WhatsApp
            </a>
            <a className="w-fit text-[13px] text-gold-deep underline-offset-4 hover:underline" href={`mailto:${BRAND.email}`}>
              {BRAND.email}
            </a>
          </div>
        </PanelCard>
      </div>
    </>
  )
}
