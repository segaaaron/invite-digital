import { botonClases } from '@/shared/design/ui/panel/PanelKit'
import { RegresarComoAdmin } from './RegresarComoAdmin'

/**
 * La franja del modo soporte: fija arriba en todo el panel mientras el admin actúa como el
 * cliente. Solo la pintan las carcasas cuando el actor trae `soporte`; un cliente de verdad
 * nunca la ve, y aunque llamara a la acción recibiría 404.
 */
export function SupportBanner({ clienteEmail }: { clienteEmail: string }) {
  return (
    // En el celular, una sola línea que se va al bajar (la cabecera del evento sí se queda arriba) y la
    // salida a mano; la explicación entera, desde 860 px. Ocupaba 160 px de cada pantalla (6 de octubre).
    <div className="-mx-4.5 -mt-4.5 mb-4.5 flex items-center justify-between gap-3 border-b border-gold/40 bg-shell-deep px-4.5 py-2 text-white min-[860px]:sticky min-[860px]:top-[env(safe-area-inset-top,0px)] min-[860px]:z-20 min-[860px]:-mx-8 min-[860px]:-mt-7 min-[860px]:flex-wrap min-[860px]:px-8 min-[860px]:py-2.5">
      <p className="min-w-0 truncate text-[12.5px] min-[860px]:text-[13px] min-[860px]:whitespace-normal" role="status">
        <span className="font-mono text-[10.5px] tracking-[0.25em] text-gold uppercase">Soporte</span> · <span className="hidden min-[860px]:inline">Estás </span>como{' '}
        <strong className="font-normal">{clienteEmail}</strong>
        <span className="hidden min-[860px]:inline">. Lo que cambies queda registrado a tu nombre.</span>
      </p>
      <RegresarComoAdmin etiqueta="Regresar como admin" className={`${botonClases('default')} shrink-0 max-[859px]:min-h-9 max-[859px]:px-3.5 max-[859px]:text-[11px]`}>
        <span className="min-[860px]:hidden">Salir</span>
        <span className="max-[859px]:hidden">Regresar como admin</span>
      </RegresarComoAdmin>
    </div>
  )
}
