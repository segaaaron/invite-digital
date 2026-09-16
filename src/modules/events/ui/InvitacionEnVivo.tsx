import type { Event } from '../domain/event'
import type { InvitationContent } from '../domain/invitation-content'
import { MarcoQueSigue } from './MarcoQueSigue'
import { themeFor } from './themes/registry'
import { INVITADO_DE_MUESTRA, ranurasDeVistaPrevia } from './themes/kit/preview-slots'
import { EyeIcon } from '@/shared/design/ui/icons'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { themeFonts } from '@/shared/design/fonts'
import { getDictionary } from '@/shared/i18n/dictionaries'

/**
 * La invitación de esta boda, al lado del editor, dentro de un teléfono.
 *
 * Se pinta en el servidor con lo guardado: cada bloque que se guarda revalida la página y
 * esto se vuelve a pintar solo, sin recargar nada. Antes había que salir a otra pantalla
 * para ver cómo quedaba cada cambio, y la columna de al lado la ocupaba la subida de
 * archivos, que ya se hace desde el propio campo que los pide.
 *
 * **Sin sonido**, a propósito: el reproductor arranca con el primer gesto en la página, y
 * aquí el primer gesto es escribir en un campo del editor. La canción suena en «Pantalla
 * completa».
 */
export function InvitacionEnVivo({ event, content }: { event: Event; content: InvitationContent }) {
  const definicion = themeFor(event.themeKey)
  const { Component: Tema } = definicion
  const diccionario = getDictionary(event.locale)
  const variables = definicion.fonts.map((clave) => themeFonts[clave].variable).join(' ')
  const sinSonido: InvitationContent = (() => {
    if (content.music === undefined) return content
    const music = { ...content.music }
    delete music.audioMediaId
    return { ...content, music }
  })()

  return (
    <section aria-label="Vista previa de la invitación" className={`${variables} flex flex-col gap-3`}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] text-ink">
          <EyeIcon className="size-4 text-ink-mute" />
          Así la verán tus invitados
        </p>
        <PanelButton href={`/panel/eventos/${event.slug}/vista-previa`}>Pantalla completa</PanelButton>
      </div>
      <div className="mx-auto h-[min(780px,calc(100dvh-150px))] w-full max-w-[400px]">
        <MarcoQueSigue>
          <Tema
            content={sinSonido}
            dictionary={diccionario.invitation}
            event={event}
            guestInfo={INVITADO_DE_MUESTRA}
            slots={ranurasDeVistaPrevia(diccionario, definicion.rsvp)}
            themes={diccionario.themes}
          />
        </MarcoQueSigue>
      </div>
      <p className="text-center text-[11.5px] text-ink-mute">Al abrir una sección, la invitación va a ella. Se actualiza al guardar. La canción suena en pantalla completa.</p>
    </section>
  )
}
