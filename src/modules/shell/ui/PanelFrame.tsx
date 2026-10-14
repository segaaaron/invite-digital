import type { ReactNode } from 'react'
import type { NavSection } from './nav'
import { ProveedorDeNavegacion } from './navegacion'
import { PanelSidebar, type PanelEvento, type PanelUser } from './PanelSidebar'
import { RielTablet, SubpestanasDeTablet } from './RielTablet'

/**
 * La carcasa del panel: la navegación de cada aparato, la barra de arriba y el cuerpo de papel.
 *
 * La monta un `layout.tsx`, no una página. Cuando la montaba cada página, bastaba con
 * olvidarla en una para que al cambiar de sección desapareciera la barra y el marco
 * cambiase de golpe: es exactamente lo que pasaba con las ocho páginas que no la tenían.
 * Desde un layout no hay dónde olvidarla.
 *
 * **Tres formas, un mismo panel** (maqueta «Esmeralda y Latón», 12 de octubre):
 * - escritorio (≥1280 px): barra lateral esmeralda de 268 px, la barra de arriba a lo ancho y el contenido
 *   centrado a 1120 px;
 * - tablet (768–1279 px): carril de 92 px (`RielTablet`) y, en las secciones que el carril junta («Planear»), sus
 *   pestañas bajo la barra de arriba;
 * - celular (v2.1, 14 oct): arriba una barra con «Menú» (`MenuMovil`), el evento y la campana, y **nada fijo abajo**:
 *   el panel es web y la barra del navegador ya está ahí (la barra de pestañas del 13 oct, `BarraInferiorMovil`, se
 *   apilaba con la de Safari). Solo flota Luxury, y el pie deja su hueco para que no tape lo último.
 */
export function PanelFrame({
  sections,
  brandSub,
  user,
  evento,
  conBuscador = false,
  barra,
  children,
}: {
  sections: readonly NavSection[]
  brandSub: string
  user: PanelUser
  evento: PanelEvento | null
  /** El buscador ⌘K en la barra lateral y el carril: solo el admin. */
  conBuscador?: boolean
  /** La barra de arriba (`BarraSuperior` o `BarraDelAdmin`), a lo ancho fuera del contenido centrado. */
  barra?: ReactNode
  /** Ya no se usan. Se aceptan para no romper a quien los pase. */
  conAcciones?: boolean
  barraInferior?: unknown
  children: ReactNode
}) {
  return (
    <ProveedorDeNavegacion value={{ sections, user, evento, conBuscador }}>
      <div className="grid min-h-dvh grid-cols-1 min-[1280px]:grid-cols-[268px_1fr] print:block">
        {/* La columna lleva el fondo oscuro, no solo la barra: la barra mide la altura de
            la ventana y en una página larga dejaba una franja blanca por debajo. */}
        <div className="hidden bg-shell-deep min-[1280px]:block print:hidden">
          <PanelSidebar brandSub={brandSub} conBuscador={conBuscador} evento={evento} sections={sections} user={user} />
        </div>
        <RielTablet />
        <div className="flex min-w-0 flex-col bg-bg min-[768px]:ml-[92px] min-[1280px]:ml-0 print:ml-0 print:bg-white">
          {barra}
          <SubpestanasDeTablet />
          <main className="panel-movil relative mx-auto w-full max-w-[1120px] min-w-0 px-4 pb-[calc(96px+env(safe-area-inset-bottom))] min-[768px]:px-8 min-[768px]:pt-8 min-[768px]:pb-32 min-[1280px]:px-12 min-[1280px]:pt-9 min-[1280px]:pb-[140px] print:max-w-none print:p-0">
            {children}
          </main>
        </div>
      </div>
    </ProveedorDeNavegacion>
  )
}
