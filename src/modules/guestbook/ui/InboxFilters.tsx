'use client'

import { useState } from 'react'
import { FilterChip } from '@/shared/design/ui/panel/PanelKit'
import { filterMessages, unreadCount, type GuestMessage, type InboxFilter } from '../domain/inbox'
import { MessageCard } from './MessageCard'

type Props = {
  eventId: string
  eventSlug: string
  messages: readonly GuestMessage[]
}

const ETIQUETA: Record<InboxFilter, string> = {
  all: 'Todos',
  unread: 'Sin leer',
  featured: 'Destacados',
}

/**
 * La bandeja con sus tres filtros. El filtrado y el orden vienen del dominio, no de aquí:
 * la vista elige qué pedir, no cómo se ordena el libro.
 *
 * El contador de sin leer se calcula sobre **todos** los mensajes, no sobre los visibles:
 * si contase los visibles, mirar los destacados dejaría el contador en cero y parecería
 * que no queda nada por atender.
 */
export function InboxFilters({ eventId, eventSlug, messages }: Props) {
  const [filtro, setFiltro] = useState<InboxFilter>('all')

  const visibles = filterMessages(messages, filtro)
  const sinLeer = unreadCount(messages)
  const destacados = messages.filter((m) => m.featuredAt !== null).length

  const cuenta: Record<InboxFilter, number> = { all: messages.length, unread: sinLeer, featured: destacados }

  return (
    <div className="flex flex-col gap-6">
      <div aria-label="Filtros de la bandeja" className="flex flex-wrap items-center gap-2" role="group">
        {(['all', 'unread', 'featured'] as const).map((clave) => (
          <FilterChip key={clave} active={filtro === clave} onClick={() => setFiltro(clave)}>
            {`${ETIQUETA[clave]} ${cuenta[clave]}`}
          </FilterChip>
        ))}
      </div>

      {messages.length === 0 ? (
        <p className="text-[13px] text-ink-mute">
          Todavía no hay mensajes. Los invitados los escriben al confirmar su asistencia.
        </p>
      ) : visibles.length === 0 ? (
        <p className="text-[13px] text-ink-mute">Ningún mensaje cumple este filtro.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {visibles.map((message) => (
            <MessageCard key={message.responseId} eventId={eventId} eventSlug={eventSlug} message={message} />
          ))}
        </div>
      )}
    </div>
  )
}
