const DIA = 86_400_000
const sumarDias = (iso: string, dias: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + dias * DIA).toISOString().slice(0, 10)

/**
 * Las fechas de un modelo del escaparate, **siempre por delante de hoy**.
 *
 * El contenido de muestra traía fechas fijas («12 de septiembre de 2026»): en cuanto pasaron, la
 * cuenta regresiva de quince modelos quedó en «00 DÍAS 00 HRS» y los XV pedían confirmar «antes
 * del 30 de octubre» una fiesta de septiembre. Quien mira un modelo para comprarlo veía un
 * diseño roto. Se conserva la hora del modelo, que es parte del ejemplo.
 */
export function fechasDeMuestra(hoy: string, startsAtDelModelo: string | undefined): { eventDate: string; rsvpDeadline: string; startsAt: string } {
  const eventDate = sumarDias(hoy, 60)
  const hora = /T(\d{2}:\d{2}(:\d{2})?)/.exec(startsAtDelModelo ?? '')?.[1] ?? '19:00:00'
  return { eventDate, rsvpDeadline: sumarDias(eventDate, -21), startsAt: `${eventDate}T${hora.length === 5 ? `${hora}:00` : hora}` }
}
