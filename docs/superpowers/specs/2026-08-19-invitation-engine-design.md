# Motor de invitaciones y RSVP — Núcleo (Ciclo 3, rebanada 1)

## 1. Propósito

Convertir una invitación entregada a mano en una invitación con vida propia: cada
invitado recibe su enlace, confirma desde ahí, y el atelier ve las confirmaciones en
un panel sin perseguir a nadie por WhatsApp.

Es el producto que el sitio de marketing ya vende. Hasta hoy no existe.

Éxito de esta rebanada:

- El atelier crea un evento, carga la lista de invitados y obtiene un enlace por grupo.
- Un invitado abre su enlace, ve su invitación y confirma cuántos asisten en menos de
  treinta segundos, sin instalar nada y sin cuenta.
- El atelier ve en vivo cuántos cupos van confirmados y quién falta por responder.
- El cliente (la pareja) consulta ese mismo estado por un enlace de solo lectura.

## 2. Alcance

Dentro:

- Autenticación del atelier: correo y contraseña, sesión, cierre de sesión.
- Evento: alta, edición, fecha límite de confirmación, idioma, estado.
- Invitados como **grupos con cupos**, con token por grupo.
- Página pública de invitación en `/i/{token}` con el bloque de RSVP.
- Respuesta de RSVP con histórico de cambios.
- Panel del atelier: bandeja de eventos, lista de invitados, contadores en vivo.
- Enlace de solo lectura para el cliente, revocable y con caducidad.
- Anonimización de datos de invitados pasado el plazo de retención.

Fuera (rebanadas siguientes):

- Envío por WhatsApp asistido, email, CSV y QR de reparto — rebanada 2.
- Check-in por QR el día del evento — rebanada 3.
- Recordatorios automáticos, asignación de mesas, menú por invitado — rebanada 4.
- Editor visual de plantillas de invitación — fuera del ciclo, sin fecha.
- Pedidos y comprobantes de pago — Plan B, spec propio.

## 3. Arquitectura

Continúa la sección 3 del spec del ciclo 1 sin cambiarla: monolito modular en la misma
app Next.js, un despliegue, un Postgres. Módulos nuevos, mismas reglas de frontera
verificadas por `eslint-plugin-boundaries`.

```
src/
  modules/
    identity/
      domain/          Credential, PasswordHash, Session — puro
      application/     SignIn, SignOut, AuthenticateRequest
      infrastructure/  DrizzleUserRepository, DrizzleSessionRepository, Argon2Hasher
      index.ts
    events/
      domain/          Event, EventDate, RsvpDeadline, EventStatus
      application/     CreateEvent, UpdateEvent, ListEvents, GetEventBySlug
      infrastructure/  DrizzleEventRepository
      ui/              EventForm, EventList
      index.ts
    guests/
      domain/          GuestGroup, Seats, InvitationToken
      application/     AddGuestGroup, ListGuestGroups, RevokeInvitation, ResolveByToken
      infrastructure/  DrizzleGuestGroupRepository
      ui/              GuestGroupTable, GuestGroupForm
      index.ts
    rsvp/
      domain/          RsvpResponse, AttendingCount, RsvpTally
      application/     RespondToInvitation, GetTally
      infrastructure/  DrizzleRsvpRepository
      ui/              RsvpForm, TallyStrip
      index.ts
  shared/
    security/          csp, generación y hash de tokens
  app/
    (panel)/           panel del atelier, fuera de [locale], solo español
    i/[token]/         página pública de invitación
    compartir/[token]/ vista de solo lectura para el cliente
```

**Deuda a saldar antes de empezar**: en la Task 8 del ciclo 1 el layout raíz se fusionó
con `[locale]`. El panel vive fuera de `[locale]`, así que la primera tarea del plan es
reintroducir un layout raíz no dinámico. Está anotado en el ledger desde entonces.

La inyección sigue siendo por argumento, sin contenedor DI. La raíz de composición
`src/app/composition/container.ts` gana las agrupaciones `identity`, `events`, `guests`
y `rsvp`.

## 4. Modelo de dominio

**La unidad invitada es el grupo, no la persona.** En bodas bolivianas se invita a
"Familia Rojas Peña, 4 cupos", no a cuatro individuos. Una persona sola es un grupo de
un cupo: un solo camino de código.

```ts
type GuestGroup = {
  readonly id: GuestGroupId
  readonly eventId: EventId
  readonly label: string        // "Familia Rojas Peña"
  readonly seats: number        // cupos asignados, >= 1
  readonly revokedAt: Date | null
}

type RsvpResponse = {
  readonly id: RsvpResponseId
  readonly guestGroupId: GuestGroupId
  readonly attending: number    // 0 = no asiste; nunca mayor que seats
  readonly message: string | null
  readonly respondedAt: Date
}

type RsvpTally = {
  readonly seatsInvited: number
  readonly seatsConfirmed: number
  readonly groupsResponded: number
  readonly groupsPending: number
}
```

Invariantes, todas comprobadas en el dominio:

- `seats >= 1`. Un grupo sin cupos no es una invitación.
- `0 <= attending <= seats`. No se confirman más asistentes que cupos asignados.
- Una respuesta después de la fecha límite se rechaza con `rsvp_closed`.
- Una respuesta a una invitación revocada se rechaza con `invitation_revoked`.
- El histórico es de solo anexado: responder otra vez crea una fila nueva; la vigente
  es la más reciente. Nunca se actualiza ni se borra una respuesta.

`opened_at` no forma parte del dominio: es telemetría que escribe la capa de
infraestructura la primera vez que se resuelve un token. Ninguna regla de negocio
depende de ella, y por eso no viaja en `GuestGroup`.

## 5. Esquema Postgres

```sql
-- requiere `create extension if not exists citext` en la migración
users(id uuid pk, email citext unique, password_hash text, created_at timestamptz)
sessions(id uuid pk, user_id uuid fk, expires_at timestamptz, created_at timestamptz)

events(
  id uuid pk, slug varchar(64) unique, title varchar(160),
  event_date date, rsvp_deadline date, locale varchar(5),
  theme_key varchar(64),          -- pieza compuesta a mano que se renderiza
  status varchar(16),             -- draft: sin enlaces activos
                                  -- live: los invitados pueden responder
                                  -- closed: enlaces válidos, respuestas cerradas
  retention_days integer default 90,
  anonymized_at timestamptz,
  created_at timestamptz
)

guest_groups(
  id uuid pk, event_id uuid fk, label varchar(160), seats integer,
  token_hash bytea unique,        -- SHA-256 del token; el token NO se guarda
  revoked_at timestamptz, opened_at timestamptz, created_at timestamptz
)

rsvp_responses(
  id uuid pk, guest_group_id uuid fk, attending integer,
  message text, responded_at timestamptz
)

client_shares(
  id uuid pk, event_id uuid fk, token_hash bytea unique,
  expires_at timestamptz, revoked_at timestamptz
)
```

Índices: `guest_groups(event_id)`, `guest_groups(token_hash)` único,
`rsvp_responses(guest_group_id, responded_at desc)`, `sessions(expires_at)`.

## 6. Rutas

| Ruta | Quién entra | Qué hace |
|---|---|---|
| `/i/{token}` | Invitado, sin cuenta | Invitación y formulario de RSVP |
| `/panel/entrar` | Atelier | Inicio de sesión |
| `/panel` | Atelier autenticado | Bandeja de eventos |
| `/panel/eventos/{slug}` | Atelier autenticado | Invitados, contadores, alta de grupos |
| `/compartir/{token}` | Cliente | Solo lectura: contadores y nombres |

`/i/` y `/compartir/` van con `noindex` y bloqueados en `robots.txt`. El panel también.

La página del invitado se sirve en el idioma del evento (`events.locale`), no en el
negociado por el navegador: la invitación de una boda en Cochabamba se lee en español
aunque el invitado tenga el teléfono en inglés. El panel es solo español.

La respuesta del RSVP se envía por Server Action, como el formulario de consulta del
ciclo 1: mismo patrón ya probado, protección CSRF incluida por Next. Los route handlers
en `app/api` se reservan para lo que necesita HTTP de verdad — el check-in de la
rebanada 3 y cualquier integración externa futura.

## 7. Seguridad

El enlace del invitado **es la credencial**. Se trata como tal:

- 128 bits de aleatoriedad criptográfica, codificados en base64url (22 caracteres).
- En la base se guarda **solo el SHA-256**. Un volcado robado no produce enlaces
  utilizables. El token en claro existe una sola vez: cuando se genera y se entrega.
- La página del invitado muestra únicamente su grupo. Nunca la lista del evento.
- Límite de peticiones por IP en `/i/{token}`, para que la fuerza bruta no compense.
- Revocación por invitación: `revoked_at` corta el acceso sin borrar el histórico.

Sesiones del atelier: cookie `httpOnly`, `secure`, `sameSite=lax`; contraseña con
Argon2id; sin registro público (el primer usuario se crea con un comando de consola);
límite de intentos por IP y por cuenta en el inicio de sesión.

**Datos personales de terceros.** Los invitados no son clientes tuyos y no aceptaron
ningún término. Por eso: se guarda lo mínimo (etiqueta del grupo, cupos, respuesta,
mensaje opcional), y pasado `retention_days` desde el evento un proceso anonimiza
etiquetas y mensajes dejando solo los agregados. La fecha queda registrada en
`anonymized_at`.

## 8. Manejo de errores

`Result<T, E>` como en el ciclo 1, errores como valores. Nada de excepciones para flujo
de negocio.

`RsvpError`: `invitation_not_found` · `invitation_revoked` · `rsvp_closed` ·
`too_many_seats` · `invalid_payload` · `storage_failure` · `rate_limited`.

Un token desconocido responde **404, nunca 403**: distinguirlos confirma al atacante
que un token existe.

Caída de Postgres: la página del invitado responde 503 con un mensaje que remite al
WhatsApp del atelier. Aquí no cabe degradar como en la landing — una invitación sin
datos no es una invitación.

## 9. Pruebas

- **Dominio**: cupos, límites, fecha de cierre, revocación, histórico. Sin base.
- **Aplicación**: casos de uso contra repositorios falsos, incluido el conteo.
- **Infraestructura**: repositorios contra Postgres real, incluido el índice único del
  hash del token y el orden del histórico.
- **Extremo a extremo** (Playwright): un invitado abre su enlace, confirma 3 de 4
  cupos, cambia a 2, y el panel refleja ambos cambios. Un token inválido da 404. Una
  invitación revocada no acepta respuesta.
- **Seguridad**: prueba que afirma que el token en claro no aparece en la base.

## 10. Despliegue

Sin cambios de infraestructura: mismo contenedor, mismo Postgres, mismo Caddy. Se
añaden migraciones y un comando de consola para crear el primer usuario del atelier.

La anonimización corre como tarea programada dentro del contenedor `backup`, que ya
existe y ya tiene acceso a la base.

## 11. Decisiones tomadas

| Tema | Decisión | Coste si es errónea |
|---|---|---|
| Alojamiento | Multi-inquilino: un despliegue, N eventos | Migrar a despliegue por cliente si alguien exige aislamiento total |
| Unidad invitada | Grupo con cupos; persona sola = grupo de 1 | Partir la tabla en dos si aparece necesidad real de invitados individuales |
| Token | 128 bits, guardado solo como hash | Ninguno; es el lado conservador |
| Enlace reenviado | Se acepta: es un enlace al portador | Añadir verificación por apellido si aparece abuso real |
| Cambio de respuesta | Permitido hasta la fecha límite, con histórico | Ninguno; el histórico permite reconstruir cualquier política |
| Invitación | Compuesta a mano, el motor inyecta el RSVP | Construir el editor visual cuando el volumen lo justifique |
| Panel | Un solo rol (atelier); cliente por enlace de solo lectura | Añadir roles y cuentas de cliente en una rebanada posterior |
| Envío | Fuera de esta rebanada; el token se copia a mano | Ninguno; la rebanada 2 solo añade adaptadores |
