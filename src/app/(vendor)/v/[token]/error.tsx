'use client'

import { PantallaDeError } from '@/shared/design/ui/PantallaDeError'

/** El enlace del proveedor. */
export default function ErrorDelProveedor({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PantallaDeError error={error} reset={reset} texto="No se pudo cargar esta página. Vuelve a intentarlo en un momento." />
}
