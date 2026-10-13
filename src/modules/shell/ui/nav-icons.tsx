import type { ReactNode } from 'react'
import { CardIcon, EyeIcon, GlobeIcon, HelpIcon, MailIcon, QrIcon, SendIcon, ShieldIcon } from '@/shared/design/ui/icons'

/**
 * El icono de cada entrada de la barra.
 *
 * `nav.ts` guarda una **clave**, no el dibujo: es un `.ts` sin JSX —lo consume tanto el
 * servidor como el cliente— y meter componentes ahí lo ataría a React sin necesidad. Aquí
 * se traduce la clave al SVG, y el `Record` obliga a que cada clave nueva traiga el suyo:
 * olvidarse deja el typecheck en rojo, no un hueco en la barra.
 */
/** Un icono de línea de la maqueta: 24 de caja, trazo 1,4, redondeado y del color del texto. */
function Trazo({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden className="size-[19px] shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" viewBox="0 0 24 24">
      {children}
    </svg>
  )
}

// Los trazos son los de la maqueta «Esmeralda y Latón» (12 de octubre), entrada por entrada.
const personas = (
  <Trazo>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.6 3 5.2" />
  </Trazo>
)
const calendario = (
  <Trazo>
    <rect height="15" rx="2" width="17" x="3.5" y="5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Trazo>
)
const ajustes = (
  <Trazo>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Trazo>
)

export const NAV_ICONS = {
  resumen: (
    <Trazo>
      <path d="M4 11.5 12 5l8 6.5V20h-5v-5h-6v5H4z" />
    </Trazo>
  ),
  invitados: personas,
  mesas: (
    <Trazo>
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="3.8" r="1.4" />
      <circle cx="12" cy="20.2" r="1.4" />
      <circle cx="3.8" cy="12" r="1.4" />
      <circle cx="20.2" cy="12" r="1.4" />
    </Trazo>
  ),
  regalos: (
    <Trazo>
      <rect height="11" rx="1" width="16" x="4" y="9" />
      <path d="M3 9h18M12 9v11M12 9c-1-3-5-4.5-5-2s3 2 5 2c2 0 5 .5 5-2s-4-1-5 2" />
    </Trazo>
  ),
  mensajes: (
    <Trazo>
      <path d="M5 4h11a3 3 0 0 1 3 3v13l-4-3H5z" />
      <path d="M8.5 9h7M8.5 12.5h5" />
    </Trazo>
  ),
  checkin: (
    <Trazo>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" />
    </Trazo>
  ),
  editar: (
    <Trazo>
      <rect height="12" rx="1.5" width="16" x="4" y="6" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </Trazo>
  ),
  vistaPrevia: <EyeIcon />,
  configuracion: ajustes,
  plan: <CardIcon />,
  extras: (
    <Trazo>
      <path d="M12 4v16M4 12h16" />
      <circle cx="12" cy="12" r="8.5" />
    </Trazo>
  ),
  eventos: calendario,
  pedidos: (
    <Trazo>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </Trazo>
  ),
  ingresos: (
    <Trazo>
      <path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6" />
    </Trazo>
  ),
  catalogo: (
    <Trazo>
      <rect height="7" rx="1.5" width="7" x="3.5" y="3.5" />
      <rect height="7" rx="1.5" width="7" x="13.5" y="3.5" />
      <rect height="7" rx="1.5" width="7" x="3.5" y="13.5" />
      <rect height="7" rx="1.5" width="7" x="13.5" y="13.5" />
    </Trazo>
  ),
  ayuda: <HelpIcon />,
  hoy: (
    <Trazo>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </Trazo>
  ),
  cronograma: (
    <Trazo>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5h4" />
    </Trazo>
  ),
  buscar: (
    <Trazo>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </Trazo>
  ),
  web: <GlobeIcon />,
  consultas: <MailIcon />,
  usuarios: personas,
  equipo: (
    <Trazo>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.9-3.6 3.6-5.6 7-5.6s6.1 2 7 5.6" />
    </Trazo>
  ),
  todosLosEventos: calendario,
  auditoria: <ShieldIcon />,
  qr: <QrIcon />,
  tareas: (
    <Trazo>
      <path d="m5 12 3 3 6-6" />
      <rect height="17" rx="3" width="17" x="3.5" y="3.5" />
    </Trazo>
  ),
  presupuesto: (
    <Trazo>
      <rect height="13" rx="2" width="18" x="3" y="6" />
      <path d="M3 10h18M16 15h2" />
    </Trazo>
  ),
  proveedores: (
    <Trazo>
      <path d="M4 10h16l-1-5H5zM5 10v9h14v-9M9.5 19v-5h5v5" />
    </Trazo>
  ),
  cortejo: (
    <Trazo>
      <circle cx="8" cy="7" r="2.5" />
      <circle cx="16" cy="7" r="2.5" />
      <path d="M3.5 19c.6-3.4 2.4-5.5 4.5-5.5s3.9 2.1 4.5 5.5M11.5 19c.6-3.4 2.4-5.5 4.5-5.5s3.9 2.1 4.5 5.5" />
    </Trazo>
  ),
  diaD: (
    <Trazo>
      <path d="M12 3.5 14.2 9l5.8.3-4.5 3.7 1.5 5.7L12 15.5 7 18.7l1.5-5.7L4 9.3 9.8 9z" />
    </Trazo>
  ),
  agenda: calendario,
  documentos: (
    <Trazo>
      <path d="M7 3.5h7l4 4V20.5H7z" />
      <path d="M14 3.5V8h4M9.5 12.5h6M9.5 16h6" />
    </Trazo>
  ),
  enviar: <SendIcon />,
} as const satisfies Record<string, ReactNode>

export type NavIcon = keyof typeof NAV_ICONS
