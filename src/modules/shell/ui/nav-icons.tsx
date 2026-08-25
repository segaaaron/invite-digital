import type { ReactNode } from 'react'
import {
  BuildingIcon,
  CalendarIcon,
  CardIcon,
  ChartIcon,
  EyeIcon,
  GearIcon,
  GiftIcon,
  HelpIcon,
  LayoutIcon,
  MessageIcon,
  PenIcon,
  ReceiptIcon,
  ScanIcon,
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
  panorama: <ChartIcon />,
  usuarios: <UsersIcon />,
  todosLosEventos: <BuildingIcon />,
  auditoria: <ShieldIcon />,
} as const satisfies Record<string, ReactNode>

export type NavIcon = keyof typeof NAV_ICONS
