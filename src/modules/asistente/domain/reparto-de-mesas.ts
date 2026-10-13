/** Una invitación por sentar: cuántos lugares ocupa. */
export type PorSentar = { readonly invitacion: string; readonly lugares: number }

export type MesaSugerida = { readonly mesa: string; readonly lugares: number; readonly ocupados: number; readonly invitaciones: readonly string[] }

/**
 * Un reparto de partida para proponer mesas (13 oct): el modelo sumaba mal («Mesa 2 (5 lugares)» con 7
 * dentro), así que las cuentas las hace el código. Mesas de 8 (de 10 con más de 80 personas), las
 * invitaciones nunca se parten y van de mayor a menor en la primera mesa donde caben; una invitación más
 * grande que una mesa ocupa la suya. Luxury lo ajusta con su criterio sin pasarse de los lugares.
 */
export function repartoDeMesas(porSentar: readonly PorSentar[]): MesaSugerida[] {
  const total = porSentar.reduce((s, i) => s + i.lugares, 0)
  const tamano = total > 80 ? 10 : 8
  const mesas: { lugares: number; ocupados: number; invitaciones: string[] }[] = []
  for (const i of [...porSentar].filter((x) => x.lugares > 0).sort((a, b) => b.lugares - a.lugares)) {
    const mesa = mesas.find((m) => m.lugares - m.ocupados >= i.lugares)
    if (mesa) {
      mesa.ocupados += i.lugares
      mesa.invitaciones.push(`${i.invitacion} (${i.lugares})`)
    } else mesas.push({ lugares: Math.max(tamano, i.lugares), ocupados: i.lugares, invitaciones: [`${i.invitacion} (${i.lugares})`] })
  }
  return mesas.map((m, n) => ({ mesa: `Mesa ${n + 1}`, ...m }))
}
