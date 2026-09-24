'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * ⌘K en Mac, Ctrl+K en lo demás: lleva al buscador del admin desde cualquier pantalla. Es el
 * atajo que ya usan Linear, Stripe o GitHub para lo mismo. No pinta nada; la entrada visible
 * es «Buscar» en la barra.
 */
export function AtajoDeBusqueda() {
  const router = useRouter()
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        router.push('/panel/admin/buscar')
      }
    }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [router])
  return null
}
