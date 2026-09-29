'use client'

import { PantallaDeError } from '@/shared/design/ui/PantallaDeError'

/** Si algo del panel falla: la pantalla propia, dentro de la carcasa (la barra sigue ahí para moverse). */
export default function ErrorDelPanel({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PantallaDeError error={error} reset={reset} salida={{ href: '/panel', rotulo: 'Ir al panel' }} />
}
