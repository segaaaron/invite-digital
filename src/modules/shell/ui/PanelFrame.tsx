import type { ReactNode } from 'react'
import { BarraInferior } from './BarraInferior'
import { PanelSidebar, type PanelEvento, type PanelUser } from './PanelSidebar'
import type { NavSection } from './nav'

/**
 * La carcasa del panel: barra lateral oscura fija sobre cuerpo marfil.
 *
 * La monta un `layout.tsx`, no una página. Cuando la montaba cada página, bastaba con
 * olvidarla en una para que al cambiar de sección desapareciera la barra y el marco
 * cambiase de golpe: es exactamente lo que pasaba con las ocho páginas que no la tenían.
 * Desde un layout no hay dónde olvidarla.
 */
export function PanelFrame({
  sections,
  brandSub,
  user,
  evento,
  barraInferior = false,
  conAcciones = false,
  children,
}: {
  sections: readonly NavSection[]
  brandSub: string
  user: PanelUser
  evento: PanelEvento | null
  /** En el celular, la navegación va abajo (la del admin fuera de un evento). */
  barraInferior?: boolean
  /** Si la barra superior pone algo (la campana): en el celular flota en la barra oscura y el menú le deja sitio. */
  conAcciones?: boolean
  children: ReactNode
}) {
  return (
    // `grid-rows-[auto_1fr]` en el teléfono: con `min-h-dvh` y una página corta, la rejilla
    // repartía el alto sobrante también a la fila del menú y la barra salía el doble de alta.
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[auto_1fr] min-[860px]:grid-cols-[240px_1fr] min-[860px]:grid-rows-1 print:block">
      {/* La columna lleva el fondo oscuro, no solo la barra: la barra mide la altura de
          la ventana y en una página larga dejaba una franja blanca por debajo. */}
      <div className={`bg-shell-deep print:hidden ${barraInferior ? 'max-[859px]:hidden' : ''}`}>
        <PanelSidebar brandSub={brandSub} conAcciones={conAcciones} evento={evento} sections={sections} user={user} />
      </div>
      {/* Los tres focos de la maqueta, fijos al viewport: el tercero es el que sostiene
          el pie de una página larga, que sin él se quedaba en marfil plano. */}
      {/* Sin `z-1` en el celular: haría del contenido una capa propia y la campana, que ahí flota dentro de
          la barra oscura (`BarraSuperior`), quedaría debajo de ella. */}
      <main className={`relative min-w-0 min-[860px]:z-1 bg-bg bg-[radial-gradient(ellipse_900px_600px_at_8%_-10%,rgb(var(--color-gold-rgb)/0.16),transparent_60%),radial-gradient(ellipse_800px_700px_at_105%_10%,rgb(var(--color-sage-rgb)/0.14),transparent_55%),radial-gradient(ellipse_900px_800px_at_50%_120%,rgb(var(--color-sage-rgb)/0.08),transparent_60%)] bg-fixed px-4.5 py-4.5 min-[860px]:px-8 min-[860px]:py-7 print:bg-white print:p-0 ${barraInferior ? 'max-[859px]:pb-28' : ''}`}>
        {children}
      </main>
      {barraInferior ? <BarraInferior sections={sections} user={user} /> : null}
    </div>
  )
}
