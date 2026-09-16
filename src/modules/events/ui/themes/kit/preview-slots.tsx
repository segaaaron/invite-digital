import { GuestbookForm, RsvpForm } from '@/modules/rsvp'
import type { Dictionary } from '@/shared/i18n/dictionary'
import { PreviewSlot } from './PreviewSlot'
import type { ThemeSlots } from '../contract'

/**
 * El invitado de muestra del escaparate.
 *
 * La maqueta enseña el saludo con un nombre y sus pases, y una portada sin ese bloque no
 * enseña el modelo entero.
 */
export const INVITADO_DE_MUESTRA = { label: 'Pedro Zárate', seats: 2 } as const

/**
 * Las cuatro ranuras del escaparate y de la vista previa del panel: **las piezas de
 * verdad, inertes**.
 *
 * Antes había un aviso de texto en su lugar y con él faltaban el formulario de
 * confirmación, la mesa de regalos y el libro de firmas —un tercio de la invitación— justo
 * en la pantalla donde el cliente elige el modelo. La maqueta los enseña enteros.
 *
 * El pase se queda fuera: es un QR de un grupo concreto, y aquí no hay ninguno.
 */
export function ranurasDeVistaPrevia(diccionario: Dictionary, rsvp?: 'campos' | 'botones'): ThemeSlots {
  const envuelta = (contenido: React.ReactNode) => <PreviewSlot>{contenido}</PreviewSlot>

  return {
    guest: (
      <p className="text-[13px]">
        {`${INVITADO_DE_MUESTRA.label} · ${diccionario.invitation.seatsLabel}: ${INVITADO_DE_MUESTRA.seats}`}
      </p>
    ),
    rsvp: envuelta(
      <RsvpForm
        dictionary={diccionario.invitation}
        guestName={INVITADO_DE_MUESTRA.label}
        previous={null}
        seats={INVITADO_DE_MUESTRA.seats}
        token=""
        variant={rsvp}
      />,
    ),
    // La mesa de regalos **no lleva muestra**: el diseño pone ahí un código y nada más, y
    // dos regalos de mentira añadían mil cien píxeles que la maqueta no tiene. En una
    // invitación de verdad se pinta la mesa que el atelier haya cargado.
    registry: null,
    // Sin respuesta de los anfitriones: en una invitación real solo aparece si la pareja
    // contestó, y el diseño no la pinta.
    guestbook:
      rsvp === 'botones'
        ? envuelta(
            <GuestbookForm
              dictionary={diccionario.invitation}
              guestName={INVITADO_DE_MUESTRA.label}
              previous={null}
              seats={INVITADO_DE_MUESTRA.seats}
              token=""
            />,
          )
        : null,
    pass: null,
    // El botón de «Comparte tus fotos»: el escaparate tiene que enseñarlo, que es parte
    // del diseño. Va inerte, como el resto.
    photos: (
      <PreviewSlot>
        <span className="inline-block rounded-[var(--radius-pill)] bg-[var(--color-cta)] px-5 py-3 font-mono text-[9px] font-bold tracking-[0.15em] text-[var(--color-on-cta)] uppercase">
          {diccionario.invitation.photosPick}
        </span>
      </PreviewSlot>
    ),
  }
}
