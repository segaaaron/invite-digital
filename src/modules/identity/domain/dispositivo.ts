/**
 * El nombre con el que la persona reconoce dónde está abierta su sesión: «iPhone · Safari».
 * Se guarda esto y no el agente entero, que no le dice nada a nadie y es un rastro de más.
 */
export function describirDispositivo(agente: string): string {
  if (agente.trim() === '') return 'Dispositivo desconocido'
  const aparato = /iPhone/.test(agente)
    ? 'iPhone'
    : /iPad/.test(agente)
      ? 'iPad'
      : /Android/.test(agente)
        ? 'Android'
        : /Windows/.test(agente)
          ? 'Windows'
          : /Macintosh|Mac OS X/.test(agente)
            ? 'Mac'
            : /Linux/.test(agente)
              ? 'Linux'
              : 'Otro'
  // El orden importa: Edge y Opera también dicen «Chrome», y Chrome también dice «Safari».
  const navegador = /Edg\//.test(agente)
    ? 'Edge'
    : /OPR\//.test(agente)
      ? 'Opera'
      : /Firefox\/|FxiOS/.test(agente)
        ? 'Firefox'
        : /Chrome\/|CriOS/.test(agente)
          ? 'Chrome'
          : /Safari\//.test(agente)
            ? 'Safari'
            : 'Navegador'
  return `${aparato} · ${navegador}`
}
