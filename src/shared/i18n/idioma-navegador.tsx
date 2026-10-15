'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Locale } from './locales'
import { traductor, type T as Traductor } from './t'

// Sin proveedor (las pruebas unitarias) el panel es el de siempre, en español; cada página lo pone según el aparato.
const Contexto = createContext<Locale>('es')

/** Lo pone cada layout raíz con el idioma de la página; los componentes del navegador lo leen con `useT`. */
export function IdiomaProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Contexto.Provider value={locale}>{children}</Contexto.Provider>
}

export const useIdioma = (): Locale => useContext(Contexto)

/** Estable mientras no cambie el idioma: se puede poner en las dependencias de un efecto. */
export const useT = (): Traductor => {
  const locale = useIdioma()
  return useMemo(() => traductor(locale), [locale])
}

/** Un texto en los dos idiomas dentro de un componente que puede pintarse en el servidor o en el navegador. */
export function T({ es, en }: { es: string; en: string }) {
  return useT()(es, en)
}
