import type { GuestbookDictionary } from '@/shared/i18n/dictionary'

type Props = {
  dictionary: GuestbookDictionary
  reply: string | null
}

/**
 * La respuesta de los anfitriones al mensaje que este invitado dejó al confirmar.
 *
 * Sin respuesta **no pinta nada**: un bloque vacío con su título contaría que existe una
 * respuesta pendiente, y la mayoría de los mensajes nunca tendrán una.
 *
 * Los textos vienen del diccionario del evento, no del navegador: esta página habla el
 * idioma en el que se hizo la invitación.
 */
export function GuestReply({ dictionary, reply }: Props) {
  if (reply === null) return null

  return (
    <section className="flex flex-col gap-2 rounded-card border border-line bg-bg-raised px-5 py-4">
      <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{dictionary.replyTitle}</h2>
      <p className="text-[14px] leading-[1.7] text-ink-soft">{reply}</p>
    </section>
  )
}
