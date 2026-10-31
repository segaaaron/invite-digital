/**
 * **Reparte tarjetas en dos columnas que terminan a la misma altura.**
 *
 * Las pantallas del panel con un muro de tarjetas las traían repartidas a mano, y el alto de cada
 * tarjeta depende del plan del evento y de lo que haya cargado el cliente: en «Datos y estilo» una
 * columna bajaba el doble que la otra y quedaba media pantalla de papel en blanco al lado (30 oct).
 *
 * `columns: 2` del navegador tampoco sirve: llena la primera hasta pasarse y deja el resto en la
 * segunda, así que con tarjetas grandes el desnivel es el mismo. Y repartir «la siguiente al montón
 * más bajo» se equivoca en casos de cinco tarjetas que se ven a simple vista.
 *
 * Son cinco o seis tarjetas, así que **se prueban todos los repartos y se queda el más parejo**.
 * Por encima de `A_FUERZA_BRUTA` eso serían demasiadas combinaciones y se cae al reparto voraz, que
 * con esa cantidad de tarjetas ya no desnivela de forma visible.
 *
 * **Dentro de cada columna se respeta el orden en que vienen**: el reparto decide de qué lado cae
 * cada tarjeta, nunca en qué orden se lee.
 *
 * El `peso` es el alto **aproximado** de la tarjeta, en las unidades que se quiera: lo que importa
 * es la proporción entre ellas, no el número.
 */
export function enDosColumnas<T extends { readonly peso: number }>(tarjetas: readonly T[]): readonly [T[], T[]] {
  const enOrden = (indices: readonly number[]): T[] => [...indices].sort((a, b) => a - b).map((i) => tarjetas[i]!)
  const lados = tarjetas.length <= A_FUERZA_BRUTA ? elMasParejo(tarjetas) : porElMontonMasBajo(tarjetas)
  return [enOrden(lados[0]), enOrden(lados[1])]
}

/** 2^12 = 4096 repartos: instantáneo. Nunca habrá tantas tarjetas en una pantalla, pero el tope evita la sorpresa. */
const A_FUERZA_BRUTA = 12

/** Todos los repartos posibles; gana el de menor diferencia de alto. */
function elMasParejo(tarjetas: readonly { readonly peso: number }[]): readonly [number[], number[]] {
  let mejor: readonly [number[], number[]] = [[], []]
  let menorDiferencia = Infinity
  for (let reparto = 0; reparto < 2 ** tarjetas.length; reparto++) {
    const izquierda: number[] = []
    const derecha: number[] = []
    let alto = 0
    tarjetas.forEach((tarjeta, i) => {
      // El bit `i` dice de qué lado cae la tarjeta `i`.
      if ((reparto >> i) % 2 === 0) {
        izquierda.push(i)
        alto += tarjeta.peso
      } else {
        derecha.push(i)
        alto -= tarjeta.peso
      }
    })
    if (Math.abs(alto) < menorDiferencia) {
      menorDiferencia = Math.abs(alto)
      mejor = [izquierda, derecha]
    }
  }
  return mejor
}

/** De mayor a menor, cada tarjeta al montón que va más bajo. */
function porElMontonMasBajo(tarjetas: readonly { readonly peso: number }[]): readonly [number[], number[]] {
  const izquierda: number[] = []
  const derecha: number[] = []
  let altoIzquierda = 0
  let altoDerecha = 0
  for (const { tarjeta, orden } of tarjetas.map((tarjeta, orden) => ({ tarjeta, orden })).sort((a, b) => b.tarjeta.peso - a.tarjeta.peso)) {
    if (altoIzquierda <= altoDerecha) {
      izquierda.push(orden)
      altoIzquierda += tarjeta.peso
    } else {
      derecha.push(orden)
      altoDerecha += tarjeta.peso
    }
  }
  return [izquierda, derecha]
}
