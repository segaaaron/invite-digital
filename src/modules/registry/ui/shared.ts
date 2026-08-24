import { isErr } from '@/shared/result'
import { parseAmount } from '../domain/money'

export const FIELD_CLASS =
  'w-full rounded-[14px] border border-[var(--color-line)] bg-bg-top/80 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-gold'

/**
 * Los mismos campos, sobre la tarjeta oscura del fondo en efectivo. Con las clases
 * claras el marcador quedaba gris sobre gris y no se leía lo que había escrito.
 */
export const FIELD_CLASS_DARK =
  'w-full rounded-[14px] border border-white/20 bg-white/10 px-4 py-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/45 focus-visible:border-white/60'

export const LABEL_CLASS_DARK =
  'flex flex-col gap-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-white/60'

export const LABEL_CLASS = 'flex flex-col gap-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute'

export const PILL_CLASS =
  'rounded-[var(--radius-pill)] border border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink disabled:opacity-40'

export const SUBMIT_CLASS =
  'w-fit cursor-pointer rounded-[var(--radius-pill)] border border-shell-deep bg-linear-to-b from-shell to-shell-deep px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-white uppercase transition-all duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40'

/** Sobre la tarjeta oscura la tinta no contrasta: ahí la llamada es dorada. */
export const SUBMIT_CLASS_DARK =
  'w-fit cursor-pointer rounded-[var(--radius-pill)] bg-linear-to-b from-[var(--color-gold-light)] to-gold px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-shell-deep uppercase transition-colors hover:to-gold-deep disabled:cursor-not-allowed disabled:opacity-40'

/** Un campo de texto vacío es «no hay dato», no una cadena vacía que la base guardaría. */
export const nullIfBlank = (value: string): string | null => (value.trim().length === 0 ? null : value.trim())

/**
 * El importe se convierte a centavos **en el formulario**, con la misma función del
 * dominio que usa el servidor. Así el atelier ve el error mientras escribe, y por el
 * cable solo viaja un entero: ningún punto del camino tiene ocasión de reinterpretar
 * «1.234,50».
 */
export const centsOrMessage = (text: string): { cents: number } | { error: string } => {
  const parsed = parseAmount(text)
  return isErr(parsed) ? { error: parsed.error.detail } : { cents: parsed.value }
}

/**
 * El importe de la base, de vuelta al campo de texto para poder corregirlo. Se escribe
 * con punto y dos decimales —`450.00`— porque es una de las formas que `parseAmount`
 * acepta: así el valor que llega al formulario vuelve a salir idéntico si nadie lo toca.
 * Nada de dividir en coma flotante: entero y resto, como en `formatAmount`.
 */
export const centsToInput = (cents: number): string => {
  const absoluto = Math.abs(Math.trunc(cents))
  return `${Math.trunc(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`
}
