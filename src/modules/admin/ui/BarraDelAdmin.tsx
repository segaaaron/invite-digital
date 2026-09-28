import { AvisosDelAdmin } from './AvisosDelAdmin'
import { BuscadorRapido } from './BuscadorRapido'
import { MenuCrear } from './MenuCrear'
import { PestanasDeAdmin } from './PestanasDeAdmin'

/**
 * **La única barra superior del admin**: a la izquierda las pestañas de la sección; a la derecha
 * buscar (⌘K), lo que llega en vivo y «+ Crear», el único punto de alta del admin. Eran dos filas
 * —herramientas arriba, pestañas debajo— y en el celular se comían un sexto de la pantalla.
 *
 * Pegajosa con vidrio marfil: al bajar por una lista larga, buscar y crear siguen a mano.
 */
export function BarraDelAdmin() {
  return (
    <div className="sticky top-0 z-30 -mx-4.5 -mt-4.5 mb-6 flex items-center gap-3 border-b border-line-panel bg-bg/80 px-4.5 py-3 backdrop-blur-md backdrop-saturate-150 min-[860px]:-mx-8 min-[860px]:-mt-7 min-[860px]:mb-7 min-[860px]:px-8 min-[860px]:py-3.5">
      {/* En el celular no hay barra lateral: la marca va aquí, discreta. */}
      <span aria-hidden className="shrink-0 font-display text-[19px] leading-none italic min-[860px]:hidden">
        L<b className="font-medium not-italic">A</b>
      </span>
      <PestanasDeAdmin />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <AvisosDelAdmin />
        <BuscadorRapido />
        <MenuCrear />
      </div>
    </div>
  )
}
