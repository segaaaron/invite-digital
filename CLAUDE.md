# InvitePremium — sitio de marketing

Plataforma de lujo para vender invitaciones digitales 3D en Bolivia. Precios en BOB.
Mercado: bodas, XV años, despedidas, graduaciones, bautizos, corporativo.

## LEE ESTO PRIMERO

**`docs/superpowers/2026-08-22-handoff.md`** — estado completo, decisiones tomadas y qué sigue.
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
| `docs/superpowers/specs/2026-08-21-mesas-design.md` | Entender la distribución de mesas y el plano del salón |
| `docs/superpowers/plans/2026-08-21-mesas.md` | Consultar cómo se construyó el ciclo 4 rebanada 1: 16 tareas |
| `docs/superpowers/specs/2026-08-21-checkin-qr-design.md` | Entender el check-in por QR y la puerta sin conexión (ciclo 3, rebanada 3) |
| `docs/superpowers/plans/2026-08-21-checkin-qr.md` | Consultar cómo se construyó la rebanada 3 del ciclo 3: 20 tareas |
| `docs/superpowers/specs/2026-08-21-regalos-design.md` | Entender la mesa de regalos y los fondos en efectivo (ciclo 4, rebanada 2) |
| `docs/superpowers/plans/2026-08-21-regalos.md` | Consultar cómo se construyó el ciclo 4 rebanada 2: 12 tareas |
| `docs/superpowers/specs/2026-08-21-mensajes-design.md` | Entender el libro de firmas: leído, destacado y respuesta (ciclo 4, rebanada 3) |
| `docs/superpowers/plans/2026-08-21-mensajes.md` | Consultar cómo se construyó el ciclo 4 rebanada 3: 8 tareas |
| `docs/superpowers/specs/2026-08-21-planes-design.md` | Entender los límites por plan y las solicitudes de cambio (ciclo 4, rebanada 4) |
| `docs/superpowers/plans/2026-08-21-planes.md` | Consultar cómo se construyó el ciclo 4 rebanada 4: 9 tareas |
| `docs/superpowers/plans/2026-08-21-cabos-sueltos.md` | Consultar cómo se cerraron los cabos sueltos del ciclo 4: 7 tareas |
| `.superpowers/sdd/2026-08-18-marketing-site-plan-a/progress.md` | Ver el estado tarea por tarea y las decisiones con su motivo |

## Estado

**Ciclo 1, ciclo 3 (rebanada 1 y check-in por QR) y el ciclo 4 entero —mesas y plano del
salón, mesa de regalos y fondos, libro de firmas, y los límites por plan— cerrados y
fusionados a `main`, **sin cabos sueltos**. 1101 pruebas unitarias y 42 e2e en verde.

El atelier crea eventos, carga grupos de invitados con cupos, reparte un enlace por
grupo, ve los contadores en vivo y comparte una vista de solo lectura con el cliente. El
invitado confirma desde su enlace sin cuenta. La puerta escanea pases con o sin red.

Y ya reparte el salón: crea mesas con su cupo, sienta grupos, auto-asigna lo que falta
sin deshacer lo colocado a mano, coloca mesas y zonas sobre un plano e imprime el plan
del banquete. **El número de mesa ya no es un hueco pendiente en la puerta**: la tarjeta
verde lo canta al escanear, y viaja en el manifiesto, así que funciona sin red.

Y ya tiene mesa de regalos: el atelier carga regalos con precio y tienda, abre fondos en
efectivo con su meta y registra lo que llega; el invitado ve la lista en su propia
invitación y **reserva** un regalo, que deja de estar disponible para los demás en ese
mismo instante.

Y ya desentierra los mensajes: los invitados llevaban escribiéndolos desde la rebanada 1
al confirmar, y nadie los veía. El atelier los lee en una bandeja con filtros, los marca
leídos, destaca los que la pareja querrá releer y responde; el invitado ve la respuesta al
volver a su enlace, y la pareja ve los destacados desde su vista de solo lectura.

Y los tres planes que el sitio vende desde el ciclo 1 por fin significan algo: cada evento
tiene su plan, el límite de grupos se aplica **en el servidor**, las funciones que el plan
no trae quedan cerradas, el panel avisa al 80 % antes de chocar con el tope y un cambio de
plan queda registrado como solicitud que el atelier aplica a mano. No hay cobro en línea.

El ciclo 4 se cerró del todo el 21 de agosto: editar un regalo, un fondo y una mesa sin
perder lo que ya tenían; la tira de llegadas en la página del evento; la mesa de regalos
que **se congela en vez de desaparecer** cuando el plan deja de traerla; la vista de
estadísticas; el centro de ayuda; las zonas del salón, que el plano sabía dibujar y nadie
podía crear; y las Server Actions que fallaban en silencio, que ahora cuentan el fallo en
la pantalla.

Sin ramas pendientes. No hay remoto configurado: el repositorio es local.

Falta para desplegar: los datos reales del usuario (abajo). `pnpm preflight` los exige.

Lo siguiente son las rebanadas 2 (canales de envío) y 4 (refinamientos) del ciclo 3, y el
Plan B. La
rebanada 2 tiene diseño hablado y **no** escrito: rotar el enlace al reenviar,
importación masiva con CSV y tabla de resultado, plantilla de mensaje por evento y
teléfono opcional por grupo. Ojo: pedidos, comprobantes y panel de administración —el
Plan B— siguen sin construirse.

### Notas de los invitados por persona (`src/modules/guests/`)

- **Las personas cuelgan del grupo; no lo sustituyen.** El enlace, el token, el RSVP
  agregado, la mesa y el pase de la puerta siguen siendo del grupo. Un grupo sin personas
  es válido y es el estado de todos los eventos anteriores a la tabla.
- **El cupo del grupo es el tope, y se aplica en el servidor.** Cargar cinco personas en
  un grupo de cuatro deja a alguien fuera el día del evento, delante de la puerta.
- **`guest_people` no lleva `event_id`.** Se une por su grupo: así no existe la
  posibilidad de que una persona apunte a un evento distinto del de su grupo.
- **El reporte del catering no cuenta a quien dijo que no viene**, y agrupa sin distinguir
  mayúsculas ni espacios de sobra: «Sin gluten» y «sin  gluten» son la misma cocina.
- **Cada suite e2e abre su propia conexión.** Compartir el pool entre dos specs hace que
  el primer `afterAll` que cierre deje a la otra escribiendo contra una conexión muerta;
  el síntoma es «write CONNECTION_ENDED» en un test que no toca la base.

### Notas de la analítica (`src/modules/analytics/`)

- **Se guardan categorías, no rastros.** Ni IP, ni agente de usuario, ni identificador de
  navegador: `device` y `source` se resuelven en el servidor y se escriben ya
  clasificados. Lo que no se escribe no se filtra.
- **La visita se cuenta una vez por pestaña**, con un guardo en `sessionStorage`. Sin él
  cada navegación interna sumaría una y el contador diría cinco donde hubo una.
- **`recordInvitationViewAction` es el único fallo silencioso del proyecto**, y está
  razonado en el spec: quien está al otro lado mira una invitación, no un panel.
- **Un iPad es tableta aunque su agente diga «Macintosh»**, y un Android sin «Mobile» es
  tableta. El orden de las comprobaciones en `classifyDevice` es lo único que lo decide.
- **Las visitas de un evento vencido se borran** en el mismo pase de `maintenance` que lo
  anonimiza; no se anonimizan, porque sin el evento no sirven de nada.

### Notas de los límites por plan (`src/modules/plans/`)

- **Los límites viven en la base, no en el código.** Cambiar lo que incluye un plan es una
  decisión comercial y no debería exigir un despliegue: son columnas de `plans`.
- **`max_guest_groups` nulo es *sin límite*, no cero.** Un `NOT NULL DEFAULT 0` dejaría al
  plan más caro sin admitir ni un grupo.
- **`guests`, `venue`, `registry` y `checkin` NO importan `plans`.** Reciben la capacidad
  ya resuelta como argumento; quien la resuelve es la acción, que vive en la frontera y
  habla con el contenedor. Si sientes que necesitas ese `import`, la firma está mal.
- **Un evento sin plan usa el plan más barato activo** (`atelier`), que no incluye mesa de
  regalos ni modo puerta. Es intencionado, y es la trampa al sembrar datos de prueba: un
  evento sin `plan_id` se choca con la pantalla de función no incluida. Las fixtures e2e
  de mesas, regalos y puerta siembran con `alta-costura` por eso.
- **El corte está en el servidor.** Deshabilitar un botón u ocultar una sección es
  cortesía; una Server Action es un extremo HTTP público. `tests/e2e/planes.spec.ts`
  reactiva el botón desde el navegador y comprueba que el servidor rechaza igual.
- **La puerta del invitado también se cierra.** Sin `registry` en el plan, la mesa de
  regalos se **congela**: lo ya reservado se sigue viendo, no se puede reservar ni
  liberar, y un aviso lo explica. Ocultarla haría que quien apartó la cafetera creyera que
  no la apartó y la comprase dos veces.

### Dos reglas que salieron del cierre del ciclo 4

- **Ninguna Server Action devuelve `Promise<void>` con el fallo solo en `console.error`.**
  El usuario se queda creyendo que funcionó. El patrón es `{ status, message }` por
  `useActionState`, con el detalle —que puede llevar identificadores— en el registro del
  servidor y la clase del error en el estado. Y la pantalla tiene que **enseñarlo**: una
  acción que devuelve el error y una vista que no lo pinta no arregla nada.
- **Nada se construye sin la pantalla que lo alcanza.** Un caso de uso probado que ninguna
  vista llama es código muerto con coartada. Antes de cerrar una rebanada, repasa los
  exportados de cada `actions.ts` y de cada `application/` y comprueba que algo los llama.

### Notas de la mesa de regalos (`src/modules/registry/`)

- **Todo importe es un entero en centavos.** `parseAmount` separa la parte entera de la
  decimal como cadenas y las concatena; **nunca** hay un `parseFloat` sobre el importe
  completo, porque `parseFloat('1234.50') * 100` da `123449.99999999999`. Un descuadre de
  céntimos no tiene arreglo después: los datos ya quedaron mal escritos. `formatAmount`
  pasa el importe a `Intl` como cadena decimal por el mismo motivo.
- **La reserva la decide la base, no la aplicación.** `claimIfAvailable` es un solo
  `UPDATE ... WHERE id = $1 AND status = 'available' RETURNING id` y devuelve un
  **booleano**, no el regalo. Un `SELECT` seguido de un `UPDATE` deja una ventana por la
  que caben dos reservas del mismo regalo, y eso no aparece jamás en desarrollo. Hay una
  prueba con `Promise.all` contra Postgres real —dos y diez reservas simultáneas— que es
  la única que lo demuestra; se verificó que falla con la versión ingenua.
- **`actions.ts` tiene dos bloques separados y comentados.** Arriba las del panel, que
  empiezan por `requireSession()`. Abajo las del invitado, que **no** tienen sesión: se
  autorizan por token con el mismo `resolveByToken` que el RSVP. Añadir una acción del
  atelier en el bloque de abajo la dejaría sin sesión.
- **La URL de tienda solo admite `http` y `https`**, validada con el constructor de `URL`.
  Ese enlace acaba siendo un `<a href>` que el invitado pulsa: un `javascript:` ahí sería
  un agujero abierto por el propio panel.
- **Comprado es definitivo.** No vuelve a ningún estado, ni para el atelier, y la tarjeta
  no ofrece ni un botón deshabilitado para intentarlo.
- **La página del invitado dice que un regalo está reservado, pero no por quién.** El
  panel sí muestra la etiqueta del grupo; la invitación no, porque es un dato de otro
  invitado.
- **La moneda es `DEFAULT_CURRENCY` en `domain/money.ts`, no `events.currency`.** El spec
  daba esa columna por existente y **no existe**. Cuando se añada, ese es el único sitio
  que hay que tocar.
- **La retención anonimiza `fund_contributions.display_name` y `message`, y conserva los
  importes.** La contabilidad de la pareja no es un dato personal y borrarla dejaría los
  fondos descuadrados.

### Notas del libro de firmas (`src/modules/guestbook/`)

- **El texto del mensaje NO se copia a ninguna tabla nueva.** Vive en
  `rsvp_responses.message` desde la rebanada 1 y ahí se queda. `message_notes` guarda solo
  el estado editable —leído, destacado, respuesta— referido al `rsvp_response_id`. Un
  `INSERT` que guardase el cuerpo crearía dos versiones del mismo texto que se
  desincronizan en cuanto alguien edite una. Y `read_at` no cabe dentro de
  `rsvp_responses`: ese histórico se escribe una vez y no se toca.
- **`listMessages` une con `leftJoin`, nunca `innerJoin`.** Es el fallo silencioso de esta
  rebanada, y cabe en una letra: la nota nace cuando alguien marca leído, destaca o
  responde, así que con `innerJoin` solo saldrían los mensajes que ya tienen nota —ninguno
  nuevo, jamás—. Todo compilaría, las demás pruebas pasarían y la bandeja estaría vacía
  para siempre sin un solo error. Hay prueba explícita contra Postgres real, y se comprobó
  que falla al cambiar la letra.
- **Esta rebanada no abre ninguna puerta pública de escritura.** Las tres acciones son del
  panel y empiezan por `requireSession()`; el invitado solo lee la respuesta.
- **Un invitado que cambia su respuesta produce dos firmas**, no una editada. Dijo dos
  cosas distintas en dos momentos, y las dos aparecen en el libro.
- **El orden es fijo**: por fecha de escritura descendente, y no es configurable.
- **`upsertNote` escribe con `ON CONFLICT DO UPDATE`** contra el `UNIQUE` de
  `rsvp_response_id`, y el parche solo lleva las claves definidas: marcar leído no puede
  borrar la respuesta ya escrita.
- **La retención borra `message_notes.reply` y `replied_at`**, no solo el mensaje: la
  respuesta es texto escrito sobre un dato personal y suele llevar el nombre del invitado
  dentro. `read_at` y `featured_at` se conservan: no identifican a nadie.
- **Lo «sin leer» se distingue por texto además de por color**, y el contador del filtro se
  calcula sobre todos los mensajes, no sobre los visibles.

### Notas del salón (`src/modules/venue/`)

- **El plano no guarda al arrastrar ni al soltar.** Acumula en local y manda el lote
  entero al pulsar «Guardar»; «Descartar» vuelve a lo último guardado. Salir con cambios
  abre un modal propio (Guardar / Descartar / Cancelar) y `beforeunload` cubre el cierre
  de pestaña. Guardar por fotograma serían miles de escrituras por mesa movida.
- **`guest_groups.table_id` es `ON DELETE SET NULL`.** Borrar una mesa deja a sus grupos
  sin mesa; jamás los borra. Hay una prueba contra Postgres real que lo fija, y es la que
  no se puede romper.
- **Un grupo nunca se parte entre dos mesas** y `autoAssign` es determinista: sin
  `Math.random`, sin `Date.now`, y no toca lo que un humano colocó.
- La posición es porcentaje `numeric(5,2)`, no píxeles, y el driver la entrega como
  cadena: el adaptador la convierte a número.

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

**El modo puerta se prueba contra la imagen, no contra `pnpm dev`.** Serwist va apagado
en desarrollo (`disable` en `next.config.ts`), así que el Service Worker y la instalación
como aplicación no existen ahí. Es la misma lección que dejó `robots.txt`.

`pnpm build` usa **webpack**, no Turbopack, y pide 8 GB de heap. Serwist inyecta
configuración de webpack y Next 16 aborta el build al verla junto a Turbopack; silenciar
el aviso con `turbopack: {}` deja de generar el Service Worker sin decir nada. El rastreo
de ficheros del `output: standalone` se queda sin memoria bajo webpack con el heap por
defecto, de ahí el `NODE_OPTIONS` del script.

**Si `pnpm build` muere con «Reached heap limit», borra `.next` antes de tocar nada.**
Con el caché de una sesión larga el rastreo de ficheros se come los 8 GB del script; con
`.next` limpio compila. Pasó dos veces en la sesión del 22 de agosto.

**Si las e2e fallan en masa con «This page couldn't load», mata el 3100 antes de mirar el
código**: `lsof -ti :3100 | xargs kill -9`. `reuseExistingServer` reaprovecha un
`next start` de una sesión anterior, que sirve un `.next` que ya no coincide con el disco.
Son fallos falsos, y en esta sesión costaron 23 de golpe.

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
- **La carcasa del panel la monta un `layout.tsx`, nunca una página.** Vive en dos:
  `panel/(atelier)/layout.tsx` para la bandeja, el evento nuevo y la ayuda, y
  `panel/eventos/[slug]/(gestion)/layout.tsx` para todo lo de un evento. Cada página pone
  solo `PanelHeader` y su contenido. Cuando la ponía cada página, ocho se quedaron sin
  ella y el panel cambiaba de forma al pasar de sección: barra lateral en el resumen y
  columna centrada en las demás. Fuera de los grupos quedan a propósito el modo puerta
  —pantalla completa— y el plan del banquete —papel—; ahí no hay carcasa.
- **La sección activa la deduce `PanelSidebar` con `usePathname`**, no un prop `active`.
  Un prop es otro sitio donde olvidarse.
- **La barra es la de la maqueta y es siempre la misma**: EVENTO ACTIVO · DISEÑO ·
  CUENTA, con la tarjeta de usuario abajo. `Dashboard.html` no tiene una versión
  reducida, así que aquí tampoco: la bandeja, el evento nuevo y la ayuda enseñan la barra
  entera apuntando al **evento activo** —el de fecha más próxima, que es como los ordena
  el repositorio—. Sin ningún evento, esos enlaces se pintan apagados; no desaparecen.
  Una barra que encoge al cambiar de página es lo que había que quitar.
- **Configuración es una vista propia** (`/panel/eventos/[slug]/configuracion`), como en
  la maqueta: los detalles del evento y la vista previa del enlace del cliente. Estaba
  dentro del resumen y se alcanzaba por un ancla, que fue invención mía.
- **La cámara vive solo en el modo puerta.** La sección Check-in del panel
  (`/panel/eventos/[slug]/checkin`) es la de la maqueta: tarjeta con el icono ⛩ y el
  botón que abre el modo puerta, buscador a mano, donut de progreso y últimas llegadas.
  El escáner es para el celular o la tablet de la recepción; un vídeo encendido dentro
  del panel de escritorio no sirve a nadie y falla donde no hay cámara.
- **Ningún token en claro toca la base.** Invitados, sesiones y enlaces de cliente guardan solo
  SHA-256. Un token desconocido responde **404, nunca 403**.
- **Toda Server Action del panel empieza por `requireSession()`.** Es un extremo HTTP público;
  vivir tras el formulario no la protege.
- Toda animación respeta `prefers-reduced-motion: reduce`.
- **La maqueta del panel vive en `docs/design-reference/dashboard/`, no en `public/`.**
  Se movió con `git mv` —el historial se conserva— porque en `public/` la servía Next
  **sin sesión**: cualquiera con la dirección `/dashboard/Dashboard.html` entraba, y
  parece un panel que funciona aunque solo guarde en `localStorage`. Abrir esa vista de
  check-in el día de una boda en vez de la de verdad habría dejado la recepción entera
  sin registrar, sin un solo error. Se consulta con doble clic; ya no la sirve nadie.
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
  (La rebanada 3, check-in por QR, ya está construida. **No usa route handlers**, al
  contrario de lo que decía esta lista: los escaneos suben por Server Actions, que es lo
  que ya usa el panel, y el reenvío lo dispara la propia página al recuperar la red. El
  Service Worker solo sirve recursos. La sección 6 del spec del check-in lo razona.)
- **Ciclo 3, rebanada 4**: recordatorios automáticos y menú por invitado. La asignación de
  mesas ya está construida (ciclo 4, rebanada 1); el menú necesita invitados por persona,
  que todavía no existe.
- **Plan B**: pedidos, subida de comprobante de pago, panel de administración mínimo.
  La sección 9 del spec del ciclo 1 ya lo describe. La deuda del layout raíz que lo bloqueaba ya
  está saldada: cuelga del grupo `(panel)`.
- **Ciclo 4**: cerrado. Quedan fuera el sitio concreto dentro de la mesa y el dashboard
  completo.

## Estilo de trabajo con este usuario

Escribe en español. Tiene el modo caveman activo: respuestas comprimidas, sin relleno ni preámbulos.
Avísale al cerrar cada tarea; no pidas permiso entre tareas de un plan ya aprobado.
