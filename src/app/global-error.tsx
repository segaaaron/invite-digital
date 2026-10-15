'use client'

import { PantallaDeError } from '@/shared/design/ui/PantallaDeError'
import { IdiomaProvider } from '@/shared/i18n/idioma-navegador'
import './globals.css'

/**
 * Lo que falle **en la base misma de una página** (su layout raíz), donde ninguna otra pantalla de error llega.
 * Lleva su propio `<html>`: sustituye a todo.
 */
export default function ErrorGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Fuera de todo layout no hay idioma de la página: el del aparato (si no es español, inglés).
  const locale = typeof navigator !== 'undefined' && !navigator.language.toLowerCase().startsWith('es') ? 'en' : 'es'
  return (
    <html lang={locale}>
      <body className="bg-bg">
        <IdiomaProvider locale={locale}>
          <PantallaDeError error={error} reset={reset} salida={{ href: '/', rotulo: locale === 'es' ? 'Ir al inicio' : 'Go home' }} />
        </IdiomaProvider>
      </body>
    </html>
  )
}
