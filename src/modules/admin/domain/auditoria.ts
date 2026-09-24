/**
 * La frase de cada acción que se anota en la auditoría. Una sin frase salía como su clave
 * interna —«extra.aplicado»—, que no le dice nada a quien lee el registro.
 *
 * Una acción nueva que se anote necesita aquí su frase: `auditoria.test.ts` recorre el código
 * y falla si alguna falta. Las que ya no se anotan se quedan, porque sus filas siguen en la tabla.
 */
export const FRASE_DE_AUDITORIA: Readonly<Record<string, string>> = {
  'usuario.alta': 'Creó un usuario',
  'usuario.rol': 'Cambió un rol',
  'usuario.plan': 'Cambió el plan de un usuario',
  'usuario.borrado': 'Borró un usuario',
  'web.editada': 'Editó La web',
  'web.restaurada': 'Restauró una versión de La web',
  'evento.reasignado': 'Reasignó un evento',
  'evento.plan': 'Cambió el plan de un evento',
  'evento.borrado': 'Borró un evento',
  'boda.alta': 'Creó un evento para un cliente',
  'acceso.restablecido': 'Restableció el acceso de un cliente',
  'equipo.alta': 'Sumó a alguien al equipo de un evento',
  'equipo.baja': 'Quitó a alguien del equipo de un evento',
  'pagos.datos': 'Cambió los datos de cobro',
  'pagos.qr': 'Subió el QR de cobro',
  'plan.editado': 'Editó un plan',
  'extra.editado': 'Editó un extra',
  'extra.aplicado': 'Aplicó un extra a un evento',
  'modelo.publicado': 'Publicó un modelo',
  'modelo.retirado': 'Retiró un modelo',
  'escaparate.musica': 'Subió la música de un modelo',
  'escaparate.musica.quitar': 'Quitó la música de un modelo',
  'escaparate.musica.nombre': 'Cambió el nombre de la canción de un modelo',
  'consulta.estado': 'Movió una consulta',
  'soporte.entrada': 'Entró como el cliente',
  'soporte.accion': 'Hizo un cambio como el cliente',
  'soporte.salida': 'Regresó como admin',
}

export const fraseDeAuditoria = (accion: string): string => FRASE_DE_AUDITORIA[accion] ?? accion

/**
 * Los tipos por los que se filtra el registro: cada acción es de un grupo por su prefijo
 * (`usuario.alta` → «Cuentas y accesos»). Una prueba exige que cada frase caiga en uno solo.
 */
export const GRUPOS_DE_AUDITORIA = [
  { clave: 'cuentas', titulo: 'Cuentas y accesos', prefijos: ['usuario.', 'acceso.', 'equipo.'] },
  { clave: 'eventos', titulo: 'Eventos', prefijos: ['evento.', 'boda.'] },
  { clave: 'ventas', titulo: 'Ventas y cobros', prefijos: ['pagos.', 'plan.', 'extra.', 'consulta.'] },
  { clave: 'web', titulo: 'La web y los modelos', prefijos: ['web.', 'modelo.', 'escaparate.'] },
  { clave: 'soporte', titulo: 'Modo soporte', prefijos: ['soporte.'] },
] as const

export type GrupoDeAuditoria = (typeof GRUPOS_DE_AUDITORIA)[number]['clave']

/** Los prefijos de un grupo, o `null` si la clave no es de ninguno (sin filtro). */
export const prefijosDeGrupo = (clave: string | undefined): readonly string[] | null =>
  GRUPOS_DE_AUDITORIA.find((g) => g.clave === clave)?.prefijos ?? null
