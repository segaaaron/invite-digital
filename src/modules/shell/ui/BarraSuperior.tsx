import type { ReactNode } from 'react'

/**
 * La barra superior del panel para quien no es admin (anfitrión, planner, atelier): a la derecha la
 * campana de avisos —y lo que venga, como el asistente—. **La misma piel que la del admin**
 * (`BarraDelAdmin`): pegajosa, con vidrio marfil.
 *
 * **En el celular no es una barra**: eran dos apiladas —la oscura del menú y esta, con otra marca y la
 * campana— y se comían el alto de la pantalla. Ahí la campana flota dentro de la barra oscura, a la
 * derecha de «Menú» (que le deja el sitio: `PanelFrame conAcciones`). Un solo montaje: una escucha en vivo.
 */
export function BarraSuperior({ children }: { children: ReactNode }) {
  return (
    <div className="fixed top-1.5 right-3 z-60 flex items-center gap-2 min-[860px]:sticky min-[860px]:top-0 min-[860px]:right-auto min-[860px]:z-30 min-[860px]:-mx-8 min-[860px]:-mt-7 min-[860px]:mb-6 min-[860px]:border-b min-[860px]:border-line-panel min-[860px]:bg-bg/80 min-[860px]:px-8 min-[860px]:py-3 min-[860px]:backdrop-blur-md min-[860px]:backdrop-saturate-150">
      <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}
