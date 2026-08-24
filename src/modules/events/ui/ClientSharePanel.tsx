'use client'

import { useActionState } from 'react'
import { CopyLinkButton } from '@/modules/guests/ui/CopyLinkButton'
import {
  createClientShareAction,
  revokeClientShareAction,
  type ClientShareState,
  type RevokeShareState,
} from '../actions'

const INITIAL: ClientShareState = { status: 'idle' }
const INITIAL_REVOKE: RevokeShareState = { status: 'idle' }

type Props = {
  eventId: string
  eventSlug: string
  live: { id: string; expiresAt: string } | null
}

export function ClientSharePanel({ eventId, eventSlug, live }: Props) {
  const [state, formAction, isPending] = useActionState(createClientShareAction, INITIAL)
  const [revokeState, revokeAction, isRevoking] = useActionState(revokeClientShareAction, INITIAL_REVOKE)

  return (
    <div className="flex flex-col gap-4 rounded-[18px] border border-[var(--color-line)] p-6">
      <p className="text-[13px] leading-[1.7] text-ink-soft">
        El cliente ve los contadores y los nombres, sin poder tocar nada ni ver los enlaces de los invitados.
      </p>

      {live === null ? (
        <form action={formAction}>
          <input name="eventId" type="hidden" value={eventId} readOnly />
          <input name="eventSlug" type="hidden" value={eventSlug} readOnly />
          <button
            className="cursor-pointer rounded-[var(--radius-pill)] border border-shell-deep bg-linear-to-b from-shell to-shell-deep px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-white uppercase transition-all duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isPending}
            type="submit"
          >
            {isPending ? 'Creando…' : 'Crear enlace para el cliente'}
          </button>
        </form>
      ) : (
        <>
          <form action={revokeAction} className="flex items-center justify-between gap-4">
            <input name="shareId" type="hidden" value={live.id} readOnly />
            <input name="eventSlug" type="hidden" value={eventSlug} readOnly />
            <p className="text-[13px] text-ink">{`Hay un enlace activo hasta el ${live.expiresAt}.`}</p>
            <button
              className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute hover:text-gold-deep disabled:opacity-40"
              disabled={isRevoking}
              type="submit"
            >
              {isRevoking ? 'Revocando…' : 'Revocar enlace'}
            </button>
          </form>

          {/*
            Que el enlace sigue vivo es lo importante del aviso: sin él, el atelier da
            por hecho que lo cortó y el cliente conserva el acceso.
          */}
          {revokeState.status === 'error' ? (
            <p className="text-[13px] text-danger" role="alert">
              No pudimos revocar el enlace. Sigue activo; inténtalo en un momento.
            </p>
          ) : null}
        </>
      )}

      {state.status === 'success' ? (
        <div aria-live="polite" className="flex flex-col gap-3 border-t border-[var(--color-line)] pt-4" role="status">
          <p className="text-[13px] text-ink">{`Enlace válido hasta el ${state.expiresAt}. Cópialo ahora: no podremos volver a mostrarlo.`}</p>
          <CopyLinkButton label="Enlace para el cliente" url={state.url} />
        </div>
      ) : null}

      {state.status === 'error' ? (
        <p className="text-[13px] text-gold-deep" role="alert">
          No pudimos crear el enlace. Inténtalo en un momento.
        </p>
      ) : null}
    </div>
  )
}
