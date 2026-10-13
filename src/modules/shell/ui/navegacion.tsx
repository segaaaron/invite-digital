'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { NavItem, NavSection } from './nav'
import type { PanelEvento, PanelUser } from './PanelSidebar'

/**
 * **La navegación del panel, a mano de quien la pinta** (rediseño «Esmeralda y Latón», 12 de octubre). La carcasa
 * la sabe —secciones, quién entró, en qué evento—, pero en el celular el botón del menú vive dentro de la barra de
 * arriba que pone cada layout (`BarraDelAdmin`, `BarraSuperior`). El contexto evita pasarla a mano por cada una.
 */
export type Navegacion = {
  readonly sections: readonly NavSection[]
  readonly user: PanelUser
  readonly evento: PanelEvento | null
  /** El buscador ⌘K: solo el admin. */
  readonly conBuscador?: boolean
}

const Contexto = createContext<Navegacion | null>(null)

export function ProveedorDeNavegacion({ value, children }: { value: Navegacion; children: ReactNode }) {
  return <Contexto.Provider value={value}>{children}</Contexto.Provider>
}

export const useNavegacion = (): Navegacion | null => useContext(Contexto)

/**
 * **Qué hay en cada sección, en una línea** (el menú guiado del celular): nadie tiene que adivinar qué abre
 * «Escaparate» o «Día D». Por rótulo, que es lo que la persona lee; lo que no esté aquí sale sin línea.
 */
const DESCRIPCIONES: Readonly<Record<string, string>> = {
  Hoy: 'Lo que pide tu atención',
  Ventas: 'Consultas, pedidos y pagos por revisar',
  Clientes: 'Cada persona con su historia',
  Ingresos: 'Lo cobrado por mes',
  Eventos: 'Lo que se celebra pronto',
  Catálogo: 'Modelos, planes y extras',
  Ajustes: 'Cobros, equipo, la web y fallos',
  'Mesa del planner': 'Tus eventos y lo que vence',
  'Mis eventos': 'Elige cuál organizar',
  Resumen: 'Cuánto falta y lo próximo',
  'Mi invitación': 'Textos, fotos y música',
  'Editar invitación': 'Textos, fotos y música',
  'Ver invitación': 'Así la ve el invitado',
  Invitados: 'Carga, envía y mira quién confirmó',
  Mesas: 'Ubica a cada familia',
  Regalos: 'Cómo te pueden regalar',
  'Libro de firmas': 'Lo que te escriben',
  Mensajes: 'Lo que te escriben al confirmar',
  Tareas: 'El plan semana a semana',
  'Plan de tareas': 'El plan semana a semana',
  Presupuesto: 'Cuánto va y qué falta pagar',
  Proveedores: 'Quién trae qué y cuándo llega',
  Cronograma: 'Los momentos del día',
  Cortejo: 'Padrinos, damas y ensayos',
  Documentos: 'Contratos y facturas',
  Agenda: 'Los fines de semana del atelier',
  'Día D': 'Todo en vivo el día del evento',
  'Ingreso al evento': 'Escanea los pases en la puerta',
  'Equipo y recepción': 'Tu planner y quién está en la puerta',
  Equipo: 'Tu planner y la recepción',
  Extras: 'Suma lo que te falte',
  Configuración: 'Datos del evento y el mensaje',
  Plan: 'Lo que trae este evento',
  'Ficha del evento': 'Plan, diseño y accesos',
  'Códigos QR': 'Carteles que apuntan a donde quieras',
  Ayuda: 'Cómo se hace cada cosa',
}

export const descripcionDe = (item: NavItem): string | undefined => DESCRIPCIONES[item.label]
