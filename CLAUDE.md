# InvitePremium — sitio de marketing

Plataforma de lujo para vender invitaciones digitales 3D en Bolivia. Precios en BOB.
Mercado: bodas, XV años, despedidas, graduaciones, bautizos, corporativo.

## LEE ESTO PRIMERO

**`docs/superpowers/2026-08-25-handoff-plan-b.md`** — estado completo, decisiones tomadas
y qué sigue. No empieces a trabajar sin leerlo. Cuenta el cierre de **todo lo que quedaba
sin construir**: el QR de reparto, los recordatorios de RSVP y el Plan B entero. Lo
primero que dice importa: la documentación daba por pendiente una rebanada que llevaba
tres días en `main`.

El anterior, **`docs/superpowers/2026-08-25-handoff.md`**, cuenta de dónde parte. Cuenta el cierre de la fidelidad del panel con
`Dashboard.html`: la piel, los modales, los anchos y las acciones de la fila de invitados.
El anterior, `2026-08-23-handoff.md`, cuenta de dónde venía esa sesión;
`2026-08-22-handoff.md`, el cierre del ciclo 4; `2026-08-19-handoff-ciclo3.md` sigue
sirviendo para el detalle de cómo se construyó la rebanada 1.

**`docs/superpowers/2026-08-22-auditoria-diseno.md`** — la comparación medida contra las
dos maquetas, lo que se corrigió y lo único que queda. Léela antes de tocar la piel.

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
| `docs/superpowers/specs/2026-08-25-recordatorios-design.md` | Entender los recordatorios de RSVP (ciclo 3, rebanada 4) |
| `docs/superpowers/specs/2026-08-25-pedidos-design.md` | Entender el Plan B: pedidos, comprobantes y administración |
| `.superpowers/sdd/2026-08-18-marketing-site-plan-a/progress.md` | Ver el estado tarea por tarea y las decisiones con su motivo |

## Estado

El panel es **fiel a `Dashboard.html`** —piel, modales, anchos y las tres acciones de la
fila de invitados— y responde a los cortes de la maqueta (860 · 900 · 560), con una e2e
que lo vigila. 1396 unitarias y 54 e2e en verde.

**Ciclo 1, ciclo 3 (rebanada 1 y check-in por QR) y el ciclo 4 entero —mesas y plano del
salón, mesa de regalos y fondos, libro de firmas, y los límites por plan— cerrados y
fusionados a `main`, **sin cabos sueltos**.

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

**La rebanada 2 del ciclo 3 —canales de envío— está construida** desde el 22 de agosto
(`b9b18a7`): rotar el enlace al reenviar, teléfono por grupo, WhatsApp asistido, plantilla
de mensaje por evento, importación de CSV con su tabla fila por fila y exportación. Esta
lista dijo lo contrario durante tres días; si vuelves a leerlo en algún documento viejo,
es el documento el que está atrasado. Le faltan el **QR de reparto** y el **canal correo**.

Del **menú por invitado** de la rebanada 4 vale lo mismo: `dietaryNote` y el reporte del
catering existen desde los invitados por persona. Lo que falta de esa rebanada son los
**recordatorios automáticos**.

**El Plan B está construido**: pedidos por transferencia con referencia pública,
comprobante subido por el cliente, y la bandeja del atelier donde se aprueba o se rechaza
con nota. Le faltan **los datos reales de transferencia**, que corta `pnpm preflight`.

**Los recordatorios de RSVP también**: el servidor calcula a quién toca recordar y el
atelier despacha por WhatsApp. Con eso, la rebanada 4 del ciclo 3 solo deja fuera el canal
correo, que necesita proveedor.

### Lo que salió de la revisión de código (22 de agosto)

- **`unlockEventAction` lleva límite de intentos, por IP y por evento.** Es un extremo
  público, sin sesión, contra una contraseña de seis caracteres, y **cada intento cuesta
  un argon2 de 19 MiB**: sin límite es fuerza bruta y además un vector de CPU. Cuando está
  limitado no se comprueba nada, que es justo el punto.
- **La cookie de desbloqueo caduca en el servidor.** Antes el valor era constante y la
  caducidad la ponía el `maxAge` del navegador: copiándola se entraba para siempre. Ahora
  la marca de tiempo va firmada dentro, y la comparación es en tiempo constante.
- **El candado de la contraseña cierra las escrituras, no solo el render.** `respondAction`
  y las acciones de invitado de la mesa de regalos comprueban `eventUnlocked`: con el
  enlace en la mano se podía confirmar y reservar por POST en un evento «privado».
- **La retención anonimiza `guest_people`**: nombre y restricción alimentaria —que en la
  práctica es dato de salud—. Se conserva el agregado.
- **La importación masiva aborta si no puede leer el plan o los grupos actuales.** Tratar
  el fallo como «sin límite» convertía un error transitorio en un salto del tope, con
  cincuenta grupos de golpe.
- **La fuente de la visita la lee el navegador, no el servidor.** El `Referer` de una
  Server Action es la propia página de la invitación: leerlo allí hacía que **todas** las
  visitas salieran como «otras», y la e2e lo tapaba porque forzaba la cabecera. Ojo con el
  valor de prueba: con `utm_source=whatsapp` la palabra viaja en la URL y el fallo vuelve
  a colarse; la prueba usa `qr`.

### Notas del plan y la portada

- **Un componente cliente no recibe funciones desde el servidor.** `BillingToggle` pintaba
  sus hijos con un *render prop* y la página del plan reventaba entera en tiempo de
  ejecución —«Functions are not valid as a child of Client Components»— **sin que el
  typecheck dijera nada**. Recibe datos y pinta él.
- **El conmutador por evento / anual solo aparece si algún plan tiene precio anual.** Hoy
  se cobra una vez por evento; un conmutador de suscripción sin precios detrás haría
  esperar una factura mensual que no existe. El ahorro se calcula de los dos precios, no
  es el 17 % fijo del cartel de la maqueta.
- **La banda de confianza del hero sale de `BRAND.trustBrands`, y vacía no se pinta.**
  Publicar el nombre de una marca ajena afirmando que confía en el atelier es afirmar una
  relación que puede no existir; `pnpm preflight` corta si quedan los marcadores.
- **Un solo `<main>` por página.** La carcasa del panel emite el suyo; el layout raíz usa
  `div`. Dos anidados dejan la página con dos regiones principales.

### Notas de las migraciones

- **Toda migración va dada de alta en `db/migrations/meta/_journal.json`.** El registro se
  quedó una vez en `0007` mientras se escribían nueve migraciones a mano: `pnpm db:migrate`
  **ni las miraba**. En desarrollo no se notaba —se habían corrido a mano—, pero una base
  nueva arrancaba sin `guest_people`, sin `invitation_views` y sin once columnas, y la
  aplicación reventaba en la primera consulta. Lo comprueba
  `src/shared/db/migrations-journal.test.ts`; se verificó que falla al quitar una entrada.
- **Una migración escrita a mano tiene que poder aplicarse dos veces.** Al reconciliar el
  registro, una base que ya las tenía las vuelve a ver. Todo `create`/`alter` lleva
  `if (not) exists`, y como `add constraint` **no** admite esa forma, va siempre precedido
  de su `drop constraint if exists`.
- **Antes de tocar el registro, pruébalo por los dos caminos**: base vacía —el esquema
  tiene que quedar idéntico al de desarrollo, columna por columna, restricción por
  restricción— y copia de la base real —tiene que aplicar sin un solo error y sin mover un
  dato—.

### Notas de la piel del panel (`src/shared/design/ui/panel/PanelKit.tsx`)

- **Ningún botón del panel se escribe a mano.** Botón, píldora de estado, chip de filtro,
  buscador, botón de icono y fila de barra viven en `PanelKit`. Pintarlos con clases
  sueltas en cada vista fue lo que metió el dorado de la web pública donde
  `Dashboard.html` pone tinta oscura: catorce botones, catorce sitios donde desviarse.
- **La acción principal es negra; el resto, blanca con borde.** El dorado se queda en la
  web pública y en la página del invitado. La excepción es lo que va **sobre la tarjeta
  oscura** —modo puerta, fondos en efectivo—, donde la tinta no contrasta y la llamada es
  dorada.
- **El estado se dice con la palabra, y el color acompaña.** `Pill` lleva siempre el texto
  («Asistirá», «Sin leer»); quien no distingue el verde del rojo lo lee igual.
- **Las cifras grandes van en Cormorant con `lining-nums`.** Sin esa clase la fuente usa
  números de estilo antiguo —el 1 se lee como I y el 0 como paréntesis—, que es lo que en
  su día las pasó a monoespaciada y alejó el panel de la maqueta.
- **El borde de las tarjetas del panel es `--color-line-panel`, neutro.** `--color-line`
  es dorado al 22 % y es de la web pública: en el panel dibujaba un marco de más.

### Notas del estado que vive en la URL

- **Lo que la maqueta abre con un botón de cabecera se abre con un parámetro**, no con
  `useState`: `?panel=alta`, `?panel=envio` y `?panel=importar` en Invitados,
  `?panel=regalo` y `?panel=fondo` en Regalos, `?vista=grupos` en el conmutador de
  Invitados, `?vista=regalos` en el de la mesa, `?plan=<slug>` en «Tu plan». Cada Server Action revalida el árbol y **remonta** el componente: con
  estado en el cliente, el conmutador saltaba solo a los fondos justo después de añadir un
  regalo y el atelier veía desaparecer lo que acababa de crear. Además así es enlazable y
  sobrevive a recargar.
- **Las e2e navegan con ese parámetro** (`/invitados?panel=alta`), no pulsan el botón: no
  dependen de un clic previo para llegar al formulario.

### Notas de la vista de Invitados

- **Personas y grupos son la misma lista mirada de dos maneras**, no dos secciones. La
  persona es a quien se sienta y se le sirve de comer; el grupo es quien tiene el enlace,
  los cupos y la mesa. Estuvieron como dos tarjetas abiertas a la vez, cada una con su
  buscador y su fila de chips, y no había forma de saber cuál de los dos buscadores era el
  bueno. Ahora es una tarjeta con `SegmentedTabs` y `?vista=grupos`.
- **`SegmentedTabs` no es `FilterChip`, y la diferencia es el punto.** Los chips filtran
  *lo que se enseña de lo que se mira*; el segmentado cambia *qué se mira*. Con la misma
  piel, dos filas de píldoras idénticas una encima de otra no dicen cuál hace qué.
- **La tarjeta de Recordatorios solo existe cuando hay algo que hacer.** Una tarjeta
  permanente que casi siempre dice «nadie por recordar hoy» es un hueco fijo entre la
  cabecera y la lista, y se deja de mirar justo el día que sí trae a alguien.
- **Importar CSV vive detrás de un botón de la cabecera**, no como tarjeta permanente: es
  una operación de vez en cuando, y ocupaba tanto sitio como la lista entera.

### Notas del reparto de invitaciones (`src/modules/guests/`)

- **Reenviar rota el token.** No se puede «volver a enseñar» un enlace que no existe —en
  la base solo está su hash—, y tampoco convendría: si hizo falta reenviarlo es porque se
  perdió, y un enlace perdido pudo acabar en cualquier parte. La pantalla lo avisa **antes**
  de que nadie pulse, porque el invitado que ya lo tenía se queda fuera.
- **Un grupo revocado no se reenvía.** Revocar se deshace a propósito, no de refilón.
- **`invitationUrl(token, siteUrl)`, en ese orden.** Invertirlo compila —son dos cadenas—
  y produce enlaces como `TOKEN/i/http://localhost`. Lo cazó la e2e, no el typecheck.
- **La importación no es transaccional a propósito.** Al llegar al tope del plan, lo ya
  creado se queda y el resto se rechaza **con su motivo, fila por fila**: un «37 de 50»
  obliga a comparar dos listas a mano, y esos enlaces no se pueden volver a mostrar.
- **La plantilla del mensaje nunca guarda un enlace dentro.** `{grupo}` y `{enlace}` se
  sustituyen al abrir WhatsApp; un enlace dentro de la plantilla sería un token en claro
  guardado en la base.
- **El teléfono del grupo se anonimiza con la etiqueta**: identifican a la misma persona.

### Notas de la privacidad del evento (`src/modules/events/`)

- **`verify(password, hash)`, en ese orden.** Es el contrato que ya usa la identidad del
  atelier. Invertirlo compila —son dos cadenas—, los dobles de prueba lo repiten sin
  quejarse y **ninguna contraseña valida jamás**, sin un solo error en el registro. Pasó,
  y por eso hay una prueba que usa el hasher de argon2 de verdad.
- **La cookie de desbloqueo se firma con el hash de la propia contraseña.** Cambiarla
  invalida por sí sola todos los desbloqueos repartidos, sin inventar otro secreto que
  administrar.
- **Desbloquear redirige, no revalida.** La cookie se escribe en esa misma respuesta, y
  revalidar dentro de la acción vuelve a pintar el árbol **antes** de que el navegador la
  tenga: la puerta seguía cerrada tras acertar la contraseña.
- **La puerta no enseña nada del evento**, ni el título: quien no tiene la contraseña no
  debe averiguar de qué boda se trata por tener el enlace. Y el error es siempre el mismo,
  sin distinguir enlace inválido de contraseña incorrecta.

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

### Notas de los recordatorios (`src/modules/reminders/`)

- **El servidor decide a quién toca; envía una persona.** No hay proveedor de correo ni
  disparador periódico, y el canal de WhatsApp es asistido. La pantalla se llama
  «Recordatorios» y es una lista de tareas del día, no una bandeja de salida: llamarla
  «envío automático» sería mentir sobre lo que hace.
- **Un recordatorio no lleva el enlace dentro, y no es un olvido.** De ese token la base
  guarda solo su SHA-256: reproducirlo es imposible y regenerarlo invalidaría el que el
  invitado ya tiene. El texto apunta al mensaje anterior del mismo chat. Hay prueba
  —unitaria y e2e— de que ningún mensaje lleva una URL dentro.
- **`dueReminders` recibe el día como argumento** y no llama al reloj, igual que
  `autoAssign` no llama a `Math.random`. La cola de la víspera del cierre se prueba sin
  tocar el reloj del sistema.
- **`sin_abrir` gana a `sin_respuesta`.** Quien no abrió el enlace tampoco pudo contestar,
  y sacarlo dos veces obligaría a escribirle dos mensajes al mismo número la misma tarde.
- **Nada se recuerda el mismo día en que se reparte el enlace**, ni con el cierre encima:
  escribir dos horas después de mandar la invitación no es recordar, es meter prisa.
- **La vista no lleva estado de «ya lo marqué».** La acción revalida el árbol y **remonta**
  el componente, así que ese `useState` se pierde en ese mismo instante. Lo que se ve es
  la cola recalculada, donde la fila ya no está. Lo cazó la e2e.

### Notas del Plan B (`src/modules/orders/`)

- **El tipo de un comprobante lo deciden sus primeros bytes**, nunca la extensión ni el
  `Content-Type`: las dos las escribe quien sube el fichero. Y `RIFF` no basta para
  WEBP —lo comparten WAV y AVI—, hay que mirar el byte 8.
- **El fichero se guarda con un UUID.** El nombre original se conserva **solo para
  enseñarlo**: usarlo para componer una ruta sería dejar que quien sube elija dónde se
  escribe. Hay prueba con `../../etc/passwd` de nombre.
- **Los comprobantes viven fuera de `public/`.** Ahí dentro estarían publicados en
  internet, y llevan nombre, banco y número de cuenta de una persona. Los sirve un route
  handler tras `requireSession()`, con `Content-Disposition: attachment` y
  `Content-Security-Policy: sandbox`: un PDF servido en línea desde el origen del panel
  puede ejecutar guion.
- **La referencia pública no lleva `0`, `O`, `1`, `I` ni `L`**: se dicta por teléfono. Y es
  aleatoria, no correlativa —un `PED-000042` dice cuántos pedidos lleva el atelier y deja
  adivinar el del vecino—. Una referencia desconocida responde **404, nunca 403**.
- **La página pública de seguimiento no enseña datos de contacto.** La referencia es un
  secreto de baja intensidad; el panel sí los enseña, porque vive tras la sesión.
- **`rejected` no es terminal.** Se rechaza con nota y el cliente sube otro comprobante;
  un rechazo terminal obligaría a abrir un pedido nuevo y a perder el hilo. `approved` sí
  lo es. Y rechazar **exige nota**, comprobado en el servidor.
- **La decisión viaja en el botón que se pulsa**, no en un campo oculto que un `onClick`
  actualiza: `setState` no ha corrido cuando el formulario se envía, así que «Rechazar»
  habría aprobado el pedido. El emisor entra en el `FormData` con su `name` y su `value`.
- **El tope de 8 MB se comprueba antes de leer el fichero a memoria.** Un `arrayBuffer()`
  de un archivo de dos gigas se los trae enteros al servidor antes de que nadie lo
  rechace.
- **`actions.ts` tiene dos bloques comentados**, como el de la mesa de regalos: arriba las
  públicas —con límite de tasa por IP—, abajo las del atelier tras `requireSession()`.
- **Los dos planes baratos compran; el más caro agenda una llamada.** Ese botón lo dibujó
  así la maqueta, y se cotiza en vez de comprarse de un clic.

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

### Notas de las acciones de la fila de invitados

- **`<dialog open>` en el marcado no es un modal.** `showModal()` es lo único que sube el
  diálogo a la capa superior y hace inerte el fondo; con el atributo `open` puesto, la
  condición `if (!nodo.open) showModal()` no dispara nunca y el diálogo se pinta dentro
  del flujo: parece abierto y los elementos de detrás siguen recibiendo los clics. Lo cazó
  la e2e —una píldora de la tabla interceptando «Guardar»—, no el typecheck ni jsdom. Los
  dobles de jsdom marcan `open` como haría el navegador; fingir `showModal` con un
  `vi.fn()` vacío deja el diálogo cerrado y sin contenido que consultar.
- **`updatePerson` copia campo a campo, y por eso es tedioso.** `createPerson` recibe un
  objeto literal: el campo que se olvide no es un error de tipos, es un `undefined` que se
  guarda como nulo. Pasó con `attending` y volvió a pasar con `email` —marcar VIP borraba
  el correo—. Hay prueba de que lo que no se toca se conserva.
- **Mover de grupo se valida en el servidor**, con el cupo del destino, igual que el alta:
  el grupo es el dueño del enlace, del cupo y de la mesa.
- **El «▣» no puede redibujar un pase ya repartido.** Lo que la puerta lee es el token del
  enlace del invitado y de él la base solo guarda su SHA-256. El diálogo avisa y emite uno
  nuevo bajo petición —lo que invalida el anterior—, en vez de fingir un pase. Un grupo
  revocado no emite ninguno.
- **Los rótulos de los iconos llevan el nombre dentro** («Ver el pase de Ana Lucía Vega»),
  así que un `getByRole('cell', { name })` casa también con la celda de acciones: en las
  e2e esos selectores van con `exact: true`.

### Notas de los anchos del panel

- **Los cortes son los de la maqueta, no los de Tailwind**: 860 para la carcasa y la
  barra, 900 para las rejillas de dos y cuatro columnas, 560 para el teléfono. Se
  escriben `min-[860px]:`. Cuando la barra rompía en `md` (768) y el layout en 860, entre
  esos dos anchos la barra se pintaba en columna ocupando la pantalla entera.
- **Las rejillas de tarjetas son `auto-fill minmax`, no breakpoints**: mesas 260 px,
  regalos 220, fondos 320, como la maqueta. Con `md:grid-cols-2` las tarjetas de mesa
  caían en dos columnas de 190 px y «Mesa 01» se partía en dos líneas.
- **Un absoluto dentro de un `overflow-x-auto` no se recorta** si su bloque contenedor
  está más arriba —el `div` del scroll es `static`, así que acaba siendo el `main`, que sí
  es `relative`—. Un `span.sr-only` de 1 px en una cabecera de tabla estiraba el documento
  de 390 a 709 px en el teléfono. Por eso esos contenedores llevan `relative`.
- **`tests/e2e/responsive.spec.ts` mide dos cosas distintas.** Los elementos que se salen
  sin ancestro que los desplace —`body` lleva `overflow-x: hidden`, así que el desborde no
  da barra, da contenido cortado— **y** el `scrollWidth` del documento, que es lo único
  que caza el caso del absoluto. Cinco anchos, los dos lados de cada corte.
- **Esa suite abre su propia conexión a Postgres.** Compartir la de `fixtures/db` con
  `panel.spec.ts` deja a la segunda escribiendo contra una conexión cerrada.

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
pnpm db:seed                                       # idempotente: catálogo, también en producción
pnpm db:seed:demo                                  # una boda de relleno; jamás en producción
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
Con el caché de una sesión larga el rastreo de ficheros se come el heap del script; con
`.next` limpio compila. Pasó dos veces en la sesión del 22 de agosto. El 25 de agosto ya
**no bastó**: con `.next` recién borrado seguía muriendo con 8 GB, y el script pasó a
12288. Si vuelve a morir, súbelo antes de buscar la causa en el código.

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

`ORDERS_DIR` tiene valor por defecto (`.data/comprobantes`, ignorado por git) y no hace
falta ponerlo en desarrollo. En producción es un **volumen**, no una carpeta de la imagen:
dentro de la imagen, cada despliegue borraría los comprobantes de todos los pedidos en
curso. Y no entra en `pg_dump`: el runbook explica cómo copiarlo.

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
- [ ] **Datos de transferencia y QR de pago** — `BRAND.payment`. El Plan B ya los enseña,
      y `pnpm preflight` corta mientras sigan siendo marcadores: un pedido con un número
      de cuenta inventado no cobra a nadie, y el cliente se entera cuando ya transfirió
- [ ] **Fotos de las plantillas `zafiro` y `onix`** — hoy usan marcadores generados
- [x] **Testimonios** — hecho: quedó solo el real (Daniela Ortiz). Si algún día se añaden
      más, que sean auténticos; no se publican redactados de relleno.

## Ciclos siguientes (aún sin planificar)

- **Ciclo 3, rebanada 2**: construida salvo el **QR de reparto** y el **canal correo**.
  El correo necesita antes un proveedor de envío y un remitente verificado, que son datos
  del usuario. (La rebanada 3, check-in por QR, también está construida. **No usa route
  handlers**, al contrario de lo que decía esta lista: los escaneos suben por Server
  Actions, que es lo que ya usa el panel, y el reenvío lo dispara la propia página al
  recuperar la red. El Service Worker solo sirve recursos. La sección 6 del spec del
  check-in lo razona.)
- **Ciclo 3, rebanada 4**: quedan los **recordatorios automáticos**. La asignación de
  mesas es del ciclo 4 rebanada 1, y el menú por invitado ya vive en `guest_people`.
- **Plan B**: construido el 25 de agosto. Falta lo que no es código: los datos reales de
  transferencia y el QR de pago.
- **Ciclo 4**: cerrado. Quedan fuera el sitio concreto dentro de la mesa y el dashboard
  completo.

## Estilo de trabajo con este usuario

Escribe en español. Tiene el modo caveman activo: respuestas comprimidas, sin relleno ni preámbulos.
Avísale al cerrar cada tarea; no pidas permiso entre tareas de un plan ya aprobado.

**Nada de subagentes.** Ni para revisar, ni para buscar, ni para repartir trabajo: el
trabajo lo haces tú, en esta sesión. Eso incluye `superpowers:requesting-code-review`, que
despacha uno: la revisión de código la haces tú leyendo el diff. Dicho por el usuario el
25 de agosto de 2026.

**Solo los skills que hagan falta.** No los invoques por rutina ni para adornar la
respuesta. Los que sí valen la pena aquí, y cuándo:

| Skill | Cuándo |
|---|---|
| `superpowers:test-driven-development` | Cambio con lógica: dominio, casos de uso, acciones |
| `superpowers:systematic-debugging` | Una prueba falla o algo no se comporta como debe |
| `superpowers:verification-before-completion` | Antes de decir que algo está hecho |
| `superpowers:brainstorming` | Decisión de modelo de datos o frente nuevo, antes de escribir código |

La piel —clases, colores, orden de bloques— no necesita ceremonia: se cambia y se
verifica.
