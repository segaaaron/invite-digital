import { RegresarComoAdmin } from './RegresarComoAdmin'
import { ShieldIcon } from '@/shared/design/ui/icons'
import { T } from '@/shared/i18n/idioma-navegador'

/**
 * La franja del modo soporte: fija arriba en todo el panel mientras el admin actúa como el
 * cliente. Solo la pintan las carcasas cuando el actor trae `soporte`; un cliente de verdad
 * nunca la ve, y aunque llamara a la acción recibiría 404.
 *
 * Dice **de quién es el panel que se mira** («Viendo el panel de Rodolfo»). La salida ya no vive aquí: la franja
 * se va con el desplazamiento y el botón se perdía de vista. Está en la barra de arriba, que es pegajosa
 * (`SalidaDeSoporte`), 30 oct.
 */
export function SupportBanner({ cliente }: { cliente: string }) {
  return (
    // A lo ancho, bajo la barra y **encima de las pestañas** (16 oct: en tablet quedaba debajo de ellas).
    <div className="border-b border-gold/40 bg-shell-deep px-4 py-2 text-shell-ink max-[767px]:mb-3 min-[768px]:px-8 min-[768px]:py-2.5 min-[1280px]:px-12 print:hidden">
      <p className="line-clamp-2 min-w-0 text-[13px]" role="status">
        <span className="font-medium text-gold">
          <T en="Support" es="Soporte" />
        </span>{' '}
        · <T en="Viewing the panel of" es="Viendo el panel de" /> <strong className="font-medium">{cliente}</strong>
        <span className="hidden min-[860px]:inline">
          <T en=". Whatever you change is logged under your name." es=". Lo que cambies queda registrado a tu nombre." />
        </span>
      </p>
    </div>
  )
}

/**
 * **La salida del modo soporte, en la barra de arriba** (30 oct): aparte de las acciones del cliente, en latón
 * macizo y con su filete a la izquierda, para que no se lea como una más de ellas.
 *
 * Aquí y no en la franja porque la barra es pegajosa: bajando por la lista de invitados, la franja —y con ella la
 * salida— se quedaba arriba. En el celular dice solo «Admin»: la barra mide 56 px y la frase entera la empuja.
 */
export function SalidaDeSoporte() {
  return (
    <span className="flex items-center gap-2 min-[768px]:gap-3 min-[768px]:border-l min-[768px]:border-line-panel min-[768px]:pl-3">
      <RegresarComoAdmin className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-gold bg-gold px-3.5 text-[14.5px] font-medium whitespace-nowrap text-shell-deep transition-colors duration-150 hover:border-gold-deep hover:bg-gold-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-40 min-[768px]:px-4.5">
        <ShieldIcon className="size-[18px]" />
        <span className="max-[767px]:hidden">
          <T en="Back to admin" es="Volver al admin" />
        </span>
        <span className="min-[768px]:hidden">Admin</span>
      </RegresarComoAdmin>
    </span>
  )
}
