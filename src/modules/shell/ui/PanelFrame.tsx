import type { ReactNode } from 'react'
import { PanelSidebar, type PanelUser } from './PanelSidebar'
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
  children,
}: {
  sections: readonly NavSection[]
  brandSub: string
  user: PanelUser
  children: ReactNode
}) {
  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[240px_1fr]">
      {/* La columna lleva el fondo oscuro, no solo la barra: la barra mide la altura de
          la ventana y en una página larga dejaba una franja blanca por debajo. */}
      <div className="bg-shell-deep">
        <PanelSidebar brandSub={brandSub} sections={sections} user={user} />
      </div>
      {/* Los tres focos de la maqueta, fijos al viewport: el tercero es el que sostiene
          el pie de una página larga, que sin él se quedaba en marfil plano. */}
      <main className="relative z-1 min-w-0 bg-bg bg-[radial-gradient(ellipse_900px_600px_at_8%_-10%,rgb(var(--color-gold-rgb)/0.16),transparent_60%),radial-gradient(ellipse_800px_700px_at_105%_10%,rgb(90_112_92/0.14),transparent_55%),radial-gradient(ellipse_900px_800px_at_50%_120%,rgb(90_112_92/0.08),transparent_60%)] bg-fixed px-4.5 py-4.5 md:px-8 md:py-7">
        {children}
      </main>
    </div>
  )
}
