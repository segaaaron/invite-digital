import { notFound } from 'next/navigation'
import { PassQr } from '@/modules/checkin/ui/PassQr'
import { acceptsResponses } from '@/modules/events'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { invitationUrl } from '@/modules/guests'
import { RsvpForm } from '@/modules/rsvp/ui/RsvpForm'
import { env } from '@/shared/config/env'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { isErr } from '@/shared/result'
import { resolveInvitation } from './invitation'

// El estado del RSVP cambia con cada respuesta: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await resolveInvitation(token)

  if (isErr(invitation)) {
    if (invitation.error.kind === 'storage_failure') throw new Error(invitation.error.detail)
    notFound()
  }

  const { group, event, latest } = invitation.value
  const dictionary = getDictionary(event.locale).invitation
  const { Component: Theme } = themeFor(event.themeKey)
  const abierto = acceptsResponses(event, new Date().toISOString().slice(0, 10))

  return (
    <Theme event={event}>
      <p className="text-[13px] text-ink-soft">{`${group.label} · ${dictionary.seatsLabel}: ${group.seats}`}</p>

      {abierto ? (
        <>
          <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{dictionary.title}</h2>
          <RsvpForm dictionary={dictionary} previous={latest} seats={group.seats} token={token} />
        </>
      ) : (
        <p className="text-[14px] leading-[1.7] text-ink-soft">{dictionary.closed}</p>
      )}

      <PassQr
        url={invitationUrl(token, env.SITE_URL)}
        label={group.label}
        labels={{ title: dictionary.passTitle, hint: dictionary.passHint, alt: dictionary.passAlt }}
      />
    </Theme>
  )
}
