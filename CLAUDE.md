# InvitePremium — sitio de marketing

Plataforma de lujo para vender invitaciones digitales 3D en Bolivia. Precios en BOB.
Mercado: bodas, XV años, despedidas, graduaciones, bautizos, corporativo.

## LEE ESTO PRIMERO

**`docs/superpowers/2026-08-21-handoff.md`** — estado completo, decisiones tomadas y qué sigue.
No empieces a trabajar sin leerlo. El anterior, `2026-08-19-handoff-ciclo3.md`, sigue
sirviendo para el detalle de cómo se construyó la rebanada 1.

Después, según lo que vayas a hacer:

| Documento | Cuándo |
|---|---|
| `docs/superpowers/specs/2026-08-17-marketing-site-design.md` | Entender arquitectura, dominio, esquema, SEO, seguridad, despliegue |
| `docs/superpowers/plans/2026-08-18-marketing-site-plan-a.md` | Consultar cómo se construyó el ciclo 1: 14 tareas con pasos TDD |
| `docs/superpowers/specs/2026-08-19-invitation-engine-design.md` | Construir el motor de invitaciones y RSVP (ciclo 3) |
| `docs/superpowers/2026-08-20-runbook-despliegue.md` | Desplegar a producción, respaldar, restaurar y volver atrás |
| `docs/superpowers/plans/2026-08-19-invitation-engine-slice-1.md` | Consultar cómo se construyó la rebanada 1 del ciclo 3: 16 tareas |
| `.superpowers/sdd/2026-08-18-marketing-site-plan-a/progress.md` | Ver el estado tarea por tarea y las decisiones con su motivo |

## Estado

**Ciclo 1 y ciclo 3 rebanada 1 (núcleo) cerrados y fusionados a `main`.** 341 pruebas
unitarias y 29 e2e en verde. Las e2e se ejecutaron además **contra la imagen de
producción**, no solo contra el servidor de desarrollo: migrador, seed, Argon2 nativo en
la capa de runtime, mantenimiento, y el ciclo de respaldo y restauración comparado tabla
por tabla.

El atelier ya crea eventos, carga grupos de invitados con cupos, reparte un enlace por
grupo, ve los contadores en vivo y comparte una vista de solo lectura con el cliente. El
invitado confirma desde su enlace sin cuenta.

Sin ramas pendientes. No hay remoto configurado: el repositorio es local.

Falta para desplegar: los datos reales del usuario (abajo). `pnpm preflight` los exige.

Lo siguiente son las rebanadas 2 (canales de envío), 3 (puerta con QR) y 4
(refinamientos). La rebanada 2 tiene diseño hablado y **no** escrito: rotar el enlace al
reenviar, importación masiva con CSV y tabla de resultado, plantilla de mensaje por
evento y teléfono opcional por grupo. Ojo: pedidos, comprobantes y panel de
administración —el Plan B— siguen sin construirse.

## Comandos

```bash
docker compose -f docker/compose.dev.yml up -d    # Postgres en el puerto 5434
pnpm db:seed                                       # idempotente
pnpm dev · pnpm test · pnpm typecheck · pnpm lint · pnpm build
pnpm test:e2e                                      # arranca su propio servidor en el 3100
pnpm user:create <correo>                          # única alta de usuario del atelier
pnpm maintenance                                   # anonimiza vencidos y barre sesiones
pnpm preflight                                     # puerta previa al despliegue
pnpm verify:boundaries                             # prueba que las fronteras cortan de verdad
```

Las e2e usan el **puerto 3100**, no el 3000: en esta máquina hay servidores de otros
proyectos que toman el 3000 y `reuseExistingServer` acabaría probando la aplicación
equivocada. Ha pasado.

Todo lo que dependa de `SITE_URL` debe resolverse **por petición**, no al compilar. El
Dockerfile pasa un `SITE_URL` de relleno como `ARG` para que `env.ts` valide durante la
compilación; cualquier ruta prerrenderizada se queda con ese valor horneado en la imagen
para siempre. Le pasó a `robots.txt`, que anunciaba un sitemap en `localhost`. Por eso
`robots.ts` y `sitemap.ts` llevan `export const dynamic = 'force-dynamic'`.

Al desplegar, **reconstruye la imagen del migrador** antes de correrlo
(`docker compose --profile tools build migrator`): `run --rm migrator` reutiliza la
imagen cacheada y aplicaría un juego de migraciones viejo sin quejarse.

Cualquier comando que toque la base o compile necesita:
`DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000`

Puerto 5434, no 5432: los puertos 5432 y 5433 los ocupan contenedores de otros proyectos de la máquina.
Docker Desktop puede estar parado; arráncalo con `open -a Docker`.

## Reglas del proyecto

- **pnpm exclusivamente.** Nunca npm ni yarn.
- TypeScript strict con `noUncheckedIndexedAccess`. Prohibido `any` y `@ts-ignore`.
- **Ningún color hexadecimal fuera de `src/shared/design/tokens.css`.** Única excepción: el color de
  acento que viene de los datos de una plantilla, y los materiales dentro de la escena 3D.
- **Fronteras de módulo impuestas por ESLint y verificadas como efectivas.** `domain` es puro;
  `application` nunca importa `infrastructure`; cada módulo se importa solo por su `index.ts`.
  No relajes la política para acomodar código mal ubicado. `pnpm verify:boundaries` escribe
  importaciones prohibidas a propósito y exige que ESLint las señale: una configuración puede
  quedarse sin efecto —una regla renombrada, un patrón que ya no casa— con el lint en verde.
- **Toda clave de diccionario nueva** se declara en `src/shared/i18n/dictionary.ts` Y en `es.ts`
  Y en `en.ts`, en el mismo commit. El typecheck falla si falta alguna.
- **Nunca un selector de idioma visible.** El idioma se negocia solo y se redirige a `/es` o `/en`.
  La página del invitado es la excepción: usa el idioma del evento (`events.locale`), no el del
  navegador. El panel y la vista del cliente son solo español.
- **Tres raíces de layout**, una por grupo de rutas: `(site)/[locale]`, `(panel)` y
  `(guest)/i/[token]` · `(guest)/compartir/[token]`. No existe `src/app/layout.tsx`, y el grupo
  `(guest)` no lleva layout propio a propósito: uno que emitiera `<html>` quedaría por fuera y el
  idioma del evento no llegaría al atributo `lang`.
- **Ningún token en claro toca la base.** Invitados, sesiones y enlaces de cliente guardan solo
  SHA-256. Un token desconocido responde **404, nunca 403**.
- **Toda Server Action del panel empieza por `requireSession()`.** Es un extremo HTTP público;
  vivir tras el formulario no la protege.
- Toda animación respeta `prefers-reduced-motion: reduce`.
- Fuente visual de la verdad:
  `/Users/miguelangelsaraviabelmonte/Documents/vallhalla web images/Sitio Web Invitaciones Digitales/InvitePremium Ivory.dc.html`
  (ruta con espacios, entrecomíllala). Ivory es la variante canónica.

## Pendiente del usuario — reemplazar antes de desplegar

Los tres primeros están centralizados en `src/shared/config/brand.ts`. **`pnpm preflight`
los comprueba y sale con código 1 si alguno sigue puesto**: un marcador no rompe nada
visible, y esa es justo la razón de que exista la puerta.

- [ ] **WhatsApp real** — ahora `+59170012345`, es un marcador falso
- [ ] **Dominio real** — ahora `invitepremium.bo`; define canonical, sitemap y el TLS de Caddy
- [ ] **Email real** — ahora `atelier@invitepremium.bo`
- [ ] **Contraseña de Postgres de producción** — `.env.production`, generada con `openssl rand -base64 24`
- [ ] **Datos de transferencia y QR de pago** — los necesita el Plan B
- [ ] **Fotos de las plantillas `zafiro` y `onix`** — hoy usan marcadores generados
- [x] **Testimonios** — hecho: quedó solo el real (Daniela Ortiz). Si algún día se añaden
      más, que sean auténticos; no se publican redactados de relleno.

## Ciclos siguientes (aún sin planificar)

- **Ciclo 3, rebanada 2**: canales de envío — WhatsApp asistido, email, copiar/CSV y QR de reparto.
- **Ciclo 3, rebanada 3**: check-in por QR el día del evento. Aquí sí hacen falta route handlers.
- **Ciclo 3, rebanada 4**: recordatorios automáticos, asignación de mesas, menú por invitado.
- **Plan B**: pedidos, subida de comprobante de pago, panel de administración mínimo.
  La sección 9 del spec del ciclo 1 ya lo describe. La deuda del layout raíz que lo bloqueaba ya
  está saldada: cuelga del grupo `(panel)`.
- **Ciclo 4**: dashboard completo.

## Estilo de trabajo con este usuario

Escribe en español. Tiene el modo caveman activo: respuestas comprimidas, sin relleno ni preámbulos.
Avísale al cerrar cada tarea; no pidas permiso entre tareas de un plan ya aprobado.
