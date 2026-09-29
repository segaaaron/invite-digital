'use client'

import { PantallaDeError } from '@/shared/design/ui/PantallaDeError'
import './globals.css'

/**
 * Lo que falle **en la base misma de una página** (su layout raíz), donde ninguna otra pantalla de error llega.
 * Lleva su propio `<html>`: sustituye a todo.
 */
export default function ErrorGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body className="bg-bg">
        <PantallaDeError error={error} reset={reset} salida={{ href: '/', rotulo: 'Ir al inicio' }} />
      </body>
    </html>
  )
}
