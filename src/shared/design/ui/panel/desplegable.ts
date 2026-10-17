'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Un menú hecho con `<details>` se cierra como cualquier menú: con Escape (y el foco vuelve a su botón) y al tocar
 * fuera. El `<details>` nativo no hace ninguna de las dos: el «Crear» del admin se quedaba abierto detrás de ⌘K (16 oct).
 */
export function useDesplegable(ref: RefObject<HTMLDetailsElement | null>) {
  useEffect(() => {
    const cerrar = (devolverFoco: boolean) => {
      const menu = ref.current
      if (menu === null || !menu.open) return
      menu.open = false
      if (devolverFoco) menu.querySelector('summary')?.focus()
    }
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar(true)
    }
    const alTocar = (e: PointerEvent) => {
      if (ref.current !== null && !ref.current.contains(e.target as Node)) cerrar(false)
    }
    document.addEventListener('keydown', alTeclear)
    document.addEventListener('pointerdown', alTocar)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.removeEventListener('pointerdown', alTocar)
    }
  }, [ref])
}
