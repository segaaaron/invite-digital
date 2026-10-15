'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { NavItem, NavSection } from './nav'
import type { T } from '@/shared/i18n/t'
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
/** Rótulo de la barra (en los dos idiomas) → qué hay detrás, en los dos idiomas. */
const DESCRIPCIONES: readonly (readonly [string, string, string, string])[] = [
  ['Hoy', 'Today', 'Lo que pide tu atención', 'What needs your attention'],
  ['Ventas', 'Sales', 'Consultas, pedidos y pagos por revisar', 'Inquiries, orders and payments to review'],
  ['Clientes', 'Clients', 'Cada persona con su historia', 'Each person with their history'],
  ['Ingresos', 'Revenue', 'Lo cobrado por mes', 'What was collected each month'],
  ['Eventos', 'Events', 'Lo que se celebra pronto', 'What is coming up'],
  ['Catálogo', 'Catalog', 'Modelos, planes y extras', 'Designs, plans and extras'],
  ['Ajustes', 'Settings', 'Cobros, equipo, la web y fallos', 'Payments, team, website and errors'],
  ['Mesa del planner', 'Planner desk', 'Tus eventos y lo que vence', 'Your events and what is due'],
  ['Mis eventos', 'My events', 'Elige cuál organizar', 'Choose which one to organize'],
  ['Resumen', 'Overview', 'Cuánto falta y lo próximo', 'How long to go and what is next'],
  ['Mi invitación', 'My invitation', 'Textos, fotos y música', 'Text, photos and music'],
  ['Editar invitación', 'Edit invitation', 'Textos, fotos y música', 'Text, photos and music'],
  ['Ver invitación', 'View invitation', 'Así la ve el invitado', 'How guests see it'],
  ['Invitados', 'Guests', 'Carga, envía y mira quién confirmó', 'Add, send and see who confirmed'],
  ['Mesas', 'Tables', 'Ubica a cada familia', 'Seat each family'],
  ['Regalos', 'Gifts', 'Cómo te pueden regalar', 'How people can give you gifts'],
  ['Libro de firmas', 'Guestbook', 'Lo que te escriben', 'What people write to you'],
  ['Mensajes', 'Messages', 'Lo que te escriben al confirmar', 'What people write when they RSVP'],
  ['Tareas', 'Tasks', 'El plan semana a semana', 'The plan week by week'],
  ['Plan de tareas', 'Task plan', 'El plan semana a semana', 'The plan week by week'],
  ['Presupuesto', 'Budget', 'Cuánto va y qué falta pagar', 'What has been spent and what is left to pay'],
  ['Proveedores', 'Vendors', 'Quién trae qué y cuándo llega', 'Who brings what and when they arrive'],
  ['Cronograma', 'Schedule', 'Los momentos del día', 'The moments of the day'],
  ['Cortejo', 'Wedding party', 'Padrinos, damas y ensayos', 'Sponsors, bridesmaids and rehearsals'],
  ['Documentos', 'Documents', 'Contratos y facturas', 'Contracts and invoices'],
  ['Agenda', 'Calendar', 'Los fines de semana del atelier', 'The atelier’s weekends'],
  ['Día D', 'D-Day', 'Todo en vivo el día del evento', 'Everything live on the day'],
  ['Ingreso al evento', 'Event check-in', 'Escanea los pases en la puerta', 'Scan passes at the door'],
  ['Equipo y recepción', 'Team and reception', 'Tu planner y quién está en la puerta', 'Your planner and who is at the door'],
  ['Equipo', 'Team', 'Tu planner y la recepción', 'Your planner and reception'],
  ['Extras', 'Extras', 'Suma lo que te falte', 'Add whatever you are missing'],
  ['Configuración', 'Settings', 'Datos del evento y el mensaje', 'Event details and the message'],
  ['Plan', 'Plan', 'Lo que trae este evento', 'What this event includes'],
  ['Ficha del evento', 'Event record', 'Plan, diseño y accesos', 'Plan, design and access'],
  ['Códigos QR', 'QR codes', 'Carteles que apuntan a donde quieras', 'Signs that point wherever you want'],
  ['Ayuda', 'Help', 'Cómo se hace cada cosa', 'How to do each thing'],
]

export const descripcionDe = (item: NavItem, t: T): string | undefined => {
  // «Ajustes» y «Configuración» dicen «Settings» los dos: en inglés se toma el primero que case por idioma.
  const fila = DESCRIPCIONES.find(([es, en]) => item.label === es || item.label === en)
  return fila === undefined ? undefined : t(fila[2], fila[3])
}
