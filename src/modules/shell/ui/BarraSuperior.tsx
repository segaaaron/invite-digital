import type { ReactNode } from 'react'

/**
 * La barra superior del panel para quien no es admin (anfitrión, planner, atelier): a la derecha la
 * campana de avisos —y lo que venga, como el asistente—. **La misma piel que la del admin**
 * (`BarraDelAdmin`): pegajosa, con vidrio marfil, y en el celular con la marca a la izquierda.
 */
export function BarraSuperior({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-30 -mx-4.5 -mt-4.5 mb-5 flex items-center gap-3 border-b border-line-panel bg-bg/80 px-4.5 py-2.5 backdrop-blur-md backdrop-saturate-150 min-[860px]:-mx-8 min-[860px]:-mt-7 min-[860px]:mb-6 min-[860px]:px-8 min-[860px]:py-3">
      <span aria-hidden className="shrink-0 font-display text-[19px] leading-none italic min-[860px]:hidden">
        L<b className="font-medium not-italic">A</b>
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}
