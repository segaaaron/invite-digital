import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { leaveSupportAction } from '@/app/_acciones/admin/support-actions'

/**
 * La franja del modo soporte: fija arriba en todo el panel mientras el admin actúa como el
 * cliente. Solo la pintan las carcasas cuando el actor trae `soporte`; un cliente de verdad
 * nunca la ve, y aunque llamara a la acción recibiría 404.
 */
export function SupportBanner({ clienteEmail }: { clienteEmail: string }) {
  return (
    <div className="sticky top-[env(safe-area-inset-top,0px)] z-20 -mx-4.5 -mt-4.5 mb-4.5 flex flex-wrap items-center justify-between gap-3 border-b border-gold/40 bg-shell-deep px-4.5 py-2.5 text-white min-[860px]:-mx-8 min-[860px]:-mt-7 min-[860px]:px-8">
      <p className="text-[13px]" role="status">
        <span className="font-mono text-[10px] tracking-[0.25em] text-gold uppercase">Soporte</span> · Estás como{' '}
        <strong className="font-normal">{clienteEmail}</strong>. Lo que cambies queda registrado a tu nombre.
      </p>
      <form action={leaveSupportAction}>
        <PanelButton type="submit" variant="default">
          Regresar como admin
        </PanelButton>
      </form>
    </div>
  )
}
