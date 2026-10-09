'use client'

import { createContext, type ReactNode, useContext } from 'react'

/**
 * **El evento ya se celebró y quien mira no es admin** (8 de octubre): todo se ve, nada se guarda. Los
 * `SubmitButton` del panel se apagan solos; el corte de verdad es la guardia de las acciones.
 */
const SoloLectura = createContext(false)

export const ConSoloLectura = ({ activa, children }: { activa: boolean; children: ReactNode }) => <SoloLectura value={activa}>{children}</SoloLectura>

export const useSoloLectura = () => useContext(SoloLectura)
