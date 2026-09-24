import type { ReactNode } from 'react'
import {
  BuildingIcon,
  CalendarIcon,
  CardIcon,
  CheckIcon,
  ChartIcon,
  ClockIcon,
  GlobeIcon,
  EyeIcon,
  GearIcon,
  GiftIcon,
  HelpIcon,
  LayoutIcon,
  MailIcon,
  MessageIcon,
  PenIcon,
  QrIcon,
  ReceiptIcon,
  ScanIcon,
  SearchIcon,
  ShieldIcon,
  TableIcon,
  UsersIcon,
} from '@/shared/design/ui/icons'

/**
 * El icono de cada entrada de la barra.
 *
 * `nav.ts` guarda una **clave**, no el dibujo: es un `.ts` sin JSX —lo consume tanto el
 * servidor como el cliente— y meter componentes ahí lo ataría a React sin necesidad. Aquí
 * se traduce la clave al SVG, y el `Record` obliga a que cada clave nueva traiga el suyo:
 * olvidarse deja el typecheck en rojo, no un hueco en la barra.
 */
export const NAV_ICONS = {
  resumen: <LayoutIcon />,
  invitados: <UsersIcon />,
  mesas: <TableIcon />,
  regalos: <GiftIcon />,
  mensajes: <MessageIcon />,
  checkin: <ScanIcon />,
  editar: <PenIcon />,
  vistaPrevia: <EyeIcon />,
  estadisticas: <ChartIcon />,
  configuracion: <GearIcon />,
  plan: <CardIcon />,
  eventos: <CalendarIcon />,
  pedidos: <ReceiptIcon />,
  ayuda: <HelpIcon />,
  hoy: <ClockIcon />,
  buscar: <SearchIcon />,
  web: <GlobeIcon />,
  consultas: <MailIcon />,
  usuarios: <UsersIcon />,
  todosLosEventos: <BuildingIcon />,
  auditoria: <ShieldIcon />,
  qr: <QrIcon />,
  tareas: <CheckIcon />,
  presupuesto: <ReceiptIcon />,
  proveedores: <BuildingIcon />,
  cortejo: <UsersIcon />,
  diaD: <CalendarIcon />,
  documentos: <PenIcon />,
} as const satisfies Record<string, ReactNode>

export type NavIcon = keyof typeof NAV_ICONS
