import { filterMessages, type GuestMessage } from '../domain/inbox'

type Props = {
  messages: readonly GuestMessage[]
}

/**
 * Los mensajes que el atelier destacó, para la vista de solo lectura del cliente. La
 * pareja los relee y los imprime; los demás se quedan en la bandeja del panel.
 *
 * El filtrado vive **aquí dentro**, no en la página: así hay un solo sitio donde se
 * decide qué ve el cliente, y una página nueva que reutilice el bloque no puede
 * enseñarle sin querer los que no estaban destacados.
 *
 * La respuesta del atelier no se muestra: lo que la pareja quiere releer es lo que
 * escribieron sus invitados, no lo que se contestó desde el panel.
 */
export function FeaturedMessages({ messages }: Props) {
  const destacados = filterMessages(messages, 'featured')
  if (destacados.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Mensajes destacados</h2>
      {destacados.map((message) => (
        <article
          key={message.responseId}
          className="flex flex-col gap-2 rounded-card border border-line bg-bg-raised px-5 py-4"
        >
          <p className="text-[14px] leading-[1.7] text-ink">{message.body}</p>
          <p className="font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
            {`— ${message.groupLabel}`}
          </p>
        </article>
      ))}
    </section>
  )
}
