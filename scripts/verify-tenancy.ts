/**
 * Comprueba que **ninguna Server Action del panel se quede sin la guardia de
 * multitenencia**.
 *
 * La regla es: si una acción exportada llama a `requireSession()`, tiene que llamar
 * también a `requireEventAccess(...)`, o estar en la lista de exentas de aquí abajo **con
 * su motivo escrito**.
 *
 * Existe por lo mismo que `verify:boundaries`: una regla que solo vive en la cabeza de
 * quien la escribió se pierde en la siguiente sesión, y aquí lo que se pierde es que un
 * atelier pueda escribir en la boda de otro.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** Acción → por qué no toca un evento concreto. */
const EXENTAS: Record<string, string> = {
  createEventAction: 'crea el evento; su dueño es el actor de la sesión',
  signInAction: 'abre la sesión; todavía no hay actor',
  signOutAction: 'la cierra',
  submitConsultationAction: 'formulario público de la web, sin sesión',
  recordInvitationViewAction: 'la cuenta una visita del invitado, sin sesión',
  placeOrderAction: 'alta de pedido desde la web pública, sin sesión',
  uploadProofAction: 'subida del comprobante por el cliente, sin sesión',
  decideOrderAction: 'del admin, y opera sobre un pedido, no sobre un evento',
  unlockEventAction: 'del invitado: se autoriza por token, no por sesión',
  eventUnlocked: 'solo lee la cookie de desbloqueo del invitado',
  createUserAction: 'del admin: crea un usuario, no toca un evento',
  deleteUserAction: 'del admin: borra un usuario',
  setUserRoleAction: 'del admin: cambia un rol',
  reassignEventAction: 'del admin: por definición opera sobre el evento de otro',
  deleteEventAsAdminAction: 'del admin: por definición opera sobre el evento de otro',
  setEventPlanAction: 'del admin: por definición opera sobre el evento de otro',
}

const RAIZ = 'src/modules'

function accionesDe(fuente: string): { nombre: string; cuerpo: string }[] {
  const encontradas: { nombre: string; cuerpo: string }[] = []
  const patron = /^export async function (\w+)/gm
  const marcas: { nombre: string; inicio: number }[] = []

  let m: RegExpExecArray | null
  while ((m = patron.exec(fuente)) !== null) marcas.push({ nombre: m[1]!, inicio: m.index })

  for (const [i, marca] of marcas.entries()) {
    const fin = marcas[i + 1]?.inicio ?? fuente.length
    encontradas.push({ nombre: marca.nombre, cuerpo: fuente.slice(marca.inicio, fin) })
  }

  return encontradas
}

function main(): number {
  const problemas: string[] = []
  let revisadas = 0
  let deAdmin = 0

  for (const modulo of readdirSync(RAIZ)) {
    const ruta = join(RAIZ, modulo, 'actions.ts')
    let fuente: string
    try {
      fuente = readFileSync(ruta, 'utf8')
    } catch {
      continue
    }

    for (const { nombre, cuerpo } of accionesDe(fuente)) {
      // Las del admin no llevan guardia por definición: opera sobre eventos que no son
      // suyos. Se cuentan aparte para que el informe no las esconda.
      if (cuerpo.includes('requireAdmin()')) {
        deAdmin += 1
        continue
      }
      if (!cuerpo.includes('requireSession()')) continue
      revisadas += 1
      if (cuerpo.includes('requireEventAccess')) continue
      if (nombre in EXENTAS) continue

      problemas.push(
        `${ruta}: ${nombre} pide sesión pero no comprueba de quién es el evento. ` +
          'Añade `await requireEventAccess(actor, { eventId })` o apúntala como exenta con su motivo.',
      )
    }
  }

  if (problemas.length > 0) {
    console.error('Multitenencia sin cerrar:')
    for (const problema of problemas) console.error(`  · ${problema}`)
    return 1
  }

  console.log(
    `Multitenencia: ${revisadas} acciones con sesión revisadas, todas cerradas. ` +
      `${deAdmin} del admin, sin guardia a propósito.`,
  )
  return 0
}

process.exit(main())
