import { botonClases } from '@/shared/design/ui/panel/PanelKit'
import { RegresarComoAdmin } from './RegresarComoAdmin'
import { T } from '@/shared/i18n/idioma-navegador'

/**
 * La franja del modo soporte: fija arriba en todo el panel mientras el admin actúa como el
 * cliente. Solo la pintan las carcasas cuando el actor trae `soporte`; un cliente de verdad
 * nunca la ve, y aunque llamara a la acción recibiría 404.
 *
 * Dice **de quién es el panel que se mira** («Viendo el panel de Rodolfo») y la salida se llama igual en todos los
 * anchos: «Estás como <correo>» se leía al revés y «Salir» parecía cerrar la sesión (16 oct).
 */
export function SupportBanner({ cliente }: { cliente: string }) {
  return (
    // A lo ancho, bajo la barra y **encima de las pestañas** (16 oct: en tablet quedaba debajo de ellas). En el
    // celular, una sola línea con la salida a mano; la explicación entera, desde 860 px.
    <div className="flex items-center justify-between gap-3 border-b border-gold/40 bg-shell-deep px-4 py-2 text-shell-ink max-[767px]:mb-3 min-[768px]:flex-wrap min-[768px]:px-8 min-[768px]:py-2.5 min-[1280px]:px-12 print:hidden">
      <p className="line-clamp-2 min-w-0 text-[13px]" role="status">
        <span className="font-medium text-gold">
          <T en="Support" es="Soporte" />
        </span>{' '}
        · <T en="Viewing the panel of" es="Viendo el panel de" /> <strong className="font-medium">{cliente}</strong>
        <span className="hidden min-[860px]:inline">
          <T en=". Whatever you change is logged under your name." es=". Lo que cambies queda registrado a tu nombre." />
        </span>
      </p>
      <RegresarComoAdmin className={`${botonClases('default')} shrink-0 max-[859px]:min-h-11 max-[859px]:px-3.5 max-[859px]:text-[13px]`}>
        <T en="Back to admin" es="Volver al admin" />
      </RegresarComoAdmin>
    </div>
  )
}
