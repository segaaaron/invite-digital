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

/**
 * Acción → por qué no lleva la guardia de dueño.
 *
 * Cubre dos casos: las que no tocan un evento concreto, y las **públicas**, que no tienen
 * sesión de la que sacar un actor. Estar aquí es una decisión escrita, no un olvido.
 */
const EXENTAS: Record<string, string> = {
  createEventAction: 'crea el evento; su dueño es el actor de la sesión',
  signInAction: 'abre la sesión; todavía no hay actor',
  signOutAction: 'la cierra',
  changePasswordAction: 'cambia la contraseña del propio actor de la sesión; no toca ningún evento',
  requestPasswordResetAction: 'pública: quien la llama ha perdido la contraseña y no tiene sesión. Límite de tasa por IP',
  confirmPasswordResetAction: 'pública: se autoriza con el código de un solo uso que llegó al correo, no con sesión',
  submitConsultationAction: 'formulario público de la web, sin sesión',
  recordInvitationViewAction: 'la cuenta una visita del invitado, sin sesión',
  placeOrderAction: 'alta de pedido desde la web pública, sin sesión',
  uploadProofAction: 'subida del comprobante por el cliente, sin sesión',
  unlockEventAction: 'del invitado: se autoriza por token, no por sesión',
  eventUnlocked: 'solo lee la cookie de desbloqueo del invitado',
  createUserAction: 'del admin: crea un usuario, no toca un evento',
  deleteUserAction: 'del admin: borra un usuario',
  setUserRoleAction: 'del admin: cambia un rol',
  reassignEventAction: 'del admin: por definición opera sobre el evento de otro',
  deleteEventAsAdminAction: 'del admin: por definición opera sobre el evento de otro',
  setEventPlanAction: 'del admin: por definición opera sobre el evento de otro',
  addDoorStaffAction: 'comprueba algo distinto: ser admin, con canManageStaff. Dar de alta crea una cuenta',
  addEventClientAction: 'igual que el alta de puerta: exige ser admin, con canManageStaff',
  removeDoorStaffAction: 'igual que el alta: exige ser admin, no tener acceso a ese evento',
  // Públicas del invitado: se autorizan por el token de su enlace, no por sesión.
  respondAction: 'del invitado: se autoriza por el token de su enlace',
  porterAccessOkAction: 'del portero: solo responde si su propio enlace sigue abierto',
  enterAsPorterAction: 'del portero: pública, comprueba su enlace y su PIN con límite de intentos',
  recordScansAsPorterAction: 'del portero: se autoriza con su enlace en cada petición y el evento sale del portero',
  checkInByGroupAsPorterAction: 'del portero: se autoriza con su enlace en cada petición y el evento sale del portero',
  adjustArrivalAsPorterAction: 'del portero: se autoriza con su enlace en cada petición y el evento sale del portero',
  voidArrivalAsPorterAction: 'del portero: se autoriza con su enlace en cada petición y el evento sale del portero',
  claimGiftAction: 'del invitado: reserva un regalo desde su propia invitación',
  releaseGiftAction: 'del invitado: libera lo que él mismo había reservado',
  uploadGuestPhotoAction:
    'del invitado: sube una fotografía desde su propia invitación, autorizada por el token de su enlace, con el candado de la contraseña del evento y límite de tasa por IP',
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
    // Todos los ficheros de acciones del módulo, no solo `actions.ts`: uno nuevo con
    // otro nombre se quedaría sin revisar, que es justo el agujero que esto evita.
    const ficheros = readdirSync(join(RAIZ, modulo)).filter((f) => f.endsWith('actions.ts'))

    for (const fichero of ficheros) {
      const ruta = join(RAIZ, modulo, fichero)
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
        // Una acción que **no** pide sesión en su propio cuerpo tiene que estar apuntada:
        // o es pública a propósito, o delega la comprobación en un ayudante, y entonces
        // este verificador no puede ver qué comprueba. Las dos cosas se declaran.
        if (!cuerpo.includes('requireSession()')) {
          if (nombre in EXENTAS) continue
          problemas.push(
            `${ruta}: ${nombre} no llama a requireSession() ni a requireAdmin() en su propio cuerpo. ` +
              'Si es pública o delega la comprobación, apúntala como exenta con su motivo.',
          )
          continue
        }

        revisadas += 1
        if (cuerpo.includes('requireEventAccess')) continue
        if (nombre in EXENTAS) continue

        problemas.push(
          `${ruta}: ${nombre} pide sesión pero no comprueba de quién es el evento. ` +
            'Añade `await requireEventAccess(actor, { eventId })` o apúntala como exenta con su motivo.',
        )
      }
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
