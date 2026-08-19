# InvitePremium — sitio de marketing

Plataforma de lujo para vender invitaciones digitales 3D en Bolivia. Precios en BOB.
Mercado: bodas, XV años, despedidas, graduaciones, bautizos, corporativo.

## LEE ESTO PRIMERO

**`docs/superpowers/2026-08-19-handoff-ciclo3.md`** — estado completo, decisiones tomadas y qué sigue.
No empieces a trabajar sin leerlo.

Después, según lo que vayas a hacer:

| Documento | Cuándo |
|---|---|
| `docs/superpowers/specs/2026-08-17-marketing-site-design.md` | Entender arquitectura, dominio, esquema, SEO, seguridad, despliegue |
| `docs/superpowers/plans/2026-08-18-marketing-site-plan-a.md` | Consultar cómo se construyó el ciclo 1: 14 tareas con pasos TDD |
| `docs/superpowers/specs/2026-08-19-invitation-engine-design.md` | Construir el motor de invitaciones y RSVP (ciclo 3) |
| `docs/superpowers/plans/2026-08-19-invitation-engine-slice-1.md` | Consultar cómo se construyó la rebanada 1 del ciclo 3: 16 tareas |
| `.superpowers/sdd/2026-08-18-marketing-site-plan-a/progress.md` | Ver el estado tarea por tarea y las decisiones con su motivo |

## Estado

**Ciclo 1 cerrado y fusionado a `main`.** **Ciclo 3, rebanada 1 (núcleo) cerrada**: las
16 tareas del plan. 311 pruebas unitarias y 28 e2e en verde; pila Docker probada de
punta a punta, incluido el binario nativo de Argon2 dentro de la imagen.

El atelier ya crea eventos, carga grupos de invitados con cupos, reparte un enlace por
grupo, ve los contadores en vivo y comparte una vista de solo lectura con el cliente. El
invitado confirma desde su enlace sin cuenta.

Rama de trabajo: `feat/motor-invitaciones`, **sin fusionar**.

Lo siguiente son las rebanadas 2 (canales de envío), 3 (puerta con QR) y 4
(refinamientos). Ojo: pedidos, comprobantes y panel de administración —el Plan B— siguen
sin construirse.

## Comandos

```bash
docker compose -f docker/compose.dev.yml up -d    # Postgres en el puerto 5434
pnpm db:seed                                       # idempotente
pnpm dev · pnpm test · pnpm typecheck · pnpm lint · pnpm build
pnpm test:e2e                                      # arranca su propio servidor en el 3100
pnpm user:create <correo>                          # única alta de usuario del atelier
pnpm maintenance                                   # anonimiza vencidos y barre sesiones
```

Las e2e usan el **puerto 3100**, no el 3000: en esta máquina hay servidores de otros
proyectos que toman el 3000 y `reuseExistingServer` acabaría probando la aplicación
equivocada. Ha pasado.

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
  No relajes la política para acomodar código mal ubicado.
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

Los tres primeros están centralizados en `src/shared/config/brand.ts`:

- [ ] **WhatsApp real** — ahora `+59170012345`, es un marcador falso
- [ ] **Dominio real** — ahora `invitepremium.bo`; define canonical, sitemap y el TLS de Caddy
- [ ] **Email real** — ahora `atelier@invitepremium.bo`
- [ ] **Datos de transferencia y QR de pago** — los necesita el Plan B
- [ ] **Testimonios**: el diseño solo trae UNO real (Daniela Ortiz). Hay dos redactados de relleno.
      **No publicarlos como reales**: o el usuario aporta auténticos, o la sección se queda con el real.
- [ ] **Fotos de las plantillas `zafiro` y `onix`** — hoy usan marcadores generados

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
