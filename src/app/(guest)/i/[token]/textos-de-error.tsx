'use client'

import { createContext, type ReactNode, use } from 'react'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'

type Textos = InvitationDictionary['error']

const Contexto = createContext<Textos | null>(null)

/**
 * Los textos del límite de error, en el idioma del evento. Un `error.tsx` no recibe
 * props, y cargar el diccionario entero en el cliente por tres frases es mandarle
 * decenas de kilobytes a un teléfono con datos: el layout, que ya sabe el idioma, se los
 * deja aquí.
 */
export function TextosDeError({ textos, children }: { readonly textos: Textos; readonly children: ReactNode }) {
  return <Contexto value={textos}>{children}</Contexto>
}

export const useTextosDeError = (): Textos | null => use(Contexto)
