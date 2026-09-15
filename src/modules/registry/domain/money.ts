// El dinero vive en `@/shared/money`: es de todo el sistema, no de la mesa de regalos. Este
// fichero lo reexporta para que el dominio de `registry` siga importándolo desde su sitio.
export { DEFAULT_CURRENCY, formatAmount, MAX_AMOUNT_CENTS, parseAmount, type MoneyError } from '@/shared/money'
