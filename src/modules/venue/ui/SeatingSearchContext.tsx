'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type Contexto = { termino: string; setTermino: (valor: string) => void }

const SeatingSearch = createContext<Contexto>({ termino: '', setTermino: () => {} })

/**
 * El término del buscador, compartido entre el buscador y lo que resalta.
 *
 * En la maqueta el buscador está arriba y lo que ilumina —las mesas del plano y las
 * tarjetas— está al final de la página. Sin un contexto, ese estado tendría que subir a
 * la página, que es un componente de servidor, o viajar en la URL, que recargaría el
 * árbol entero en cada tecla.
 */
export function SeatingSearchProvider({ children }: { children: ReactNode }) {
  const [termino, setTermino] = useState('')
  const valor = useMemo(() => ({ termino, setTermino }), [termino])
  return <SeatingSearch.Provider value={valor}>{children}</SeatingSearch.Provider>
}

export const useSeatingSearch = (): Contexto => useContext(SeatingSearch)

/** ¿Este grupo es el que se está buscando? Vacío no resalta nada: iluminarlo todo es no
 *  iluminar nada. */
export const matchesSearch = (termino: string, etiquetas: readonly string[]): boolean => {
  const q = termino.trim().toLocaleLowerCase()
  if (q === '') return false
  return etiquetas.some((e) => e.toLocaleLowerCase().includes(q))
}
