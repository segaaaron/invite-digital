import type { Event } from '../domain/event'
import type { InvitationContent } from '../domain/invitation-content'
import { MarcoQueSigue } from './MarcoQueSigue'
import { EstiloDeLaInvitacion } from './EstiloDeLaInvitacion'
import type { EstiloDelEvento } from '../domain/estilo'
import { themeFor } from './themes/registry'
import { INVITADO_DE_MUESTRA, ranurasDeVistaPrevia } from './themes/kit/preview-slots'
import { EyeIcon, MusicIcon } from '@/shared/design/ui/icons'
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
export function InvitacionEnVivo({ event, content, estilo }: { event: Event; content: InvitationContent; estilo: EstiloDelEvento }) {
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
    // La invitación dentro de un teléfono (E08): marco oscuro, y debajo verla entera o con su canción.
    <section aria-label="Vista previa de la invitación" className={`${variables} flex flex-col items-center gap-4`}>
      <div className="w-full max-w-[300px] rounded-[38px] bg-shell-deep p-2.5 shadow-[0_24px_60px_-30px_rgb(12_36_32/0.6)] max-[1023px]:max-w-[400px]">
      <div className="con-mono h-[min(620px,calc(100dvh-170px))] w-full overflow-hidden rounded-[30px] max-[1023px]:h-[min(780px,calc(100dvh-150px))]">
        <MarcoQueSigue>
          <EstiloDeLaInvitacion estilo={estilo} tema={definicion}>
          <Tema
            content={sinSonido}
            dictionary={diccionario.invitation}
            event={event}
            guestInfo={INVITADO_DE_MUESTRA}
            slots={ranurasDeVistaPrevia(diccionario, definicion.rsvp, definicion.categorySlug === 'xv-anos')}
            themes={diccionario.themes}
          />
          </EstiloDeLaInvitacion>
        </MarcoQueSigue>
      </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        <PanelButton href={`/panel/eventos/${event.slug}/vista-previa`} size="sm">
          <EyeIcon className="size-4" /> Pantalla completa
        </PanelButton>
        <PanelButton href={`/panel/eventos/${event.slug}/vista-previa`} size="sm">
          <MusicIcon className="size-4" /> Con sonido
        </PanelButton>
      </div>
    </section>
  )
}
