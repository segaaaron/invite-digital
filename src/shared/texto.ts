/**
 * Un texto para comparar como lo haría una persona: sin tildes, sin mayúsculas y sin espacios de más
 * («Ramón  Pérez» = «ramon perez»). Lo usan el detector de invitados repetidos y la lista de la puerta.
 */
export const comparable = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
