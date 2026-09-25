import { err, ok, type Result } from '@/shared/result'
import { registryError, type RegistryError } from './errors'

/**
 * Las formas de regalar de un evento además de la lista y los fondos: la **lluvia de sobres** —el
 * efectivo que se entrega en la fiesta— y la **transferencia** con el QR del banco. Es lo que más se
 * usa en Bolivia (QR Simple, interoperable y sin comisión), y va en todos los planes.
 *
 * El dinero va directo del invitado a la cuenta del cliente: aquí no se cobra ni se procesa nada.
 */
export type FormasDeRegalar = {
  readonly sobres: boolean
  /** La frase de la tarjeta de sobres; sin ella, la del diseño o la genérica. */
  readonly sobresTexto: string | null
  readonly transferencia: boolean
  readonly banco: string | null
  readonly titular: string | null
  readonly cuenta: string | null
  /** Lo que conviene poner en la glosa, o cualquier indicación («Glosa: Boda Ana y Luis»). */
  readonly nota: string | null
  /** Si hay imagen del QR guardada. La imagen se sirve aparte. */
  readonly tieneQr: boolean
}

export const SIN_FORMAS: FormasDeRegalar = {
  sobres: false,
  sobresTexto: null,
  transferencia: false,
  banco: null,
  titular: null,
  cuenta: null,
  nota: null,
  tieneQr: false,
}

export const TOPES = { sobresTexto: 280, banco: 80, titular: 120, cuenta: 40, nota: 200 } as const

const limpio = (valor: string | null | undefined): string | null => {
  const texto = (valor ?? '').replace(/\s+/g, ' ').trim()
  return texto === '' ? null : texto
}

/**
 * Lo que manda el formulario, validado. `tieneQr` dice si, después de guardar, habrá QR: una
 * transferencia sin cuenta completa **y** sin QR no le da al invitado forma de pagar, y encendida
 * así sería una tarjeta que promete algo que no se puede hacer.
 */
export function leerFormas(
  entrada: {
    readonly sobres: boolean
    readonly sobresTexto?: string | null
    readonly transferencia: boolean
    readonly banco?: string | null
    readonly titular?: string | null
    readonly cuenta?: string | null
    readonly nota?: string | null
  },
  tieneQr: boolean,
): Result<FormasDeRegalar, RegistryError> {
  const formas: FormasDeRegalar = {
    sobres: entrada.sobres,
    sobresTexto: limpio(entrada.sobresTexto),
    transferencia: entrada.transferencia,
    banco: limpio(entrada.banco),
    titular: limpio(entrada.titular),
    cuenta: limpio(entrada.cuenta),
    nota: limpio(entrada.nota),
    tieneQr,
  }

  for (const campo of ['sobresTexto', 'banco', 'titular', 'cuenta', 'nota'] as const) {
    const valor = formas[campo]
    if (valor !== null && valor.length > TOPES[campo]) {
      return err(registryError('invalid_gift_ways', `Ese texto es demasiado largo (máximo ${TOPES[campo]} caracteres).`))
    }
  }
  if (formas.cuenta !== null && !/^[0-9A-Za-z .\-/]+$/.test(formas.cuenta)) {
    return err(registryError('invalid_gift_ways', 'El número de cuenta solo lleva números, letras, espacios o guiones.'))
  }

  const datos = [formas.banco, formas.titular, formas.cuenta].filter((v) => v !== null).length
  if (datos > 0 && datos < 3) {
    return err(registryError('invalid_gift_ways', 'Completa el banco, el titular y la cuenta, o deja los tres vacíos si solo usas el QR.'))
  }
  if (formas.transferencia && datos === 0 && !tieneQr) {
    return err(registryError('invalid_gift_ways', 'Para la transferencia, carga los datos de tu cuenta o sube el QR de tu banco.'))
  }
  return ok(formas)
}

/** Si la invitación tiene alguna forma de regalar que enseñar. */
export const hayFormas = (formas: FormasDeRegalar): boolean => formas.sobres || formas.transferencia
