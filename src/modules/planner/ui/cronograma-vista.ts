import { avisosDelCronograma, minutos, type Momento } from '../domain/cronograma'

/** Los momentos en orden de hora, con su aviso ya en palabras. */
export function momentosParaVer(momentos: readonly Momento[]) {
  const avisos = avisosDelCronograma(momentos)
  return [...momentos]
    .sort((a, b) => minutos(a.startsAt) - minutos(b.startsAt))
    .map((m) => {
      const aviso = avisos.find((a) => a.id === m.id)
      return { ...m, aviso: aviso === undefined ? null : aviso.tipo === 'se_pisa' ? `Se pisa con ${aviso.con}` : `Menos de 10 min tras ${aviso.con}` }
    })
}
