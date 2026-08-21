# Check-in por QR el día del evento (Ciclo 3, rebanada 3)

## 1. Propósito

Cerrar el círculo que abrió la rebanada 1. El invitado ya recibe su enlace y confirma
desde ahí; falta que ese mismo enlace sirva en la puerta el día del evento.

Hoy la recepción de una boda se hace con una lista impresa y un bolígrafo. Quien recibe
va tachando nombres, no sabe cuánta gente hay dentro, y al día siguiente nadie puede
decir quién faltó.

Éxito de esta rebanada:

- El invitado muestra en la puerta el mismo enlace que recibió por WhatsApp, como QR.
- Quien recibe escanea y el grupo queda registrado sin tocar la pantalla.
- La pantalla dice cuántos han llegado y cuántos faltan, en vivo.
- **Funciona con el salón sin wifi.** Los escaneos se guardan en el dispositivo y suben
  solos cuando vuelve la red.
- Quien llega sin el pase se busca por nombre y se registra igual.

## 2. Alcance

Dentro:

- Tabla `arrivals` como registro append-only de escaneos.
- Módulo `checkin` completo: dominio, aplicación, infraestructura, acciones y UI.
- Ruta `/panel/eventos/[slug]/puerta`, tras sesión.
- Modo puerta a pantalla completa: cámara continua, linterna, bloqueo de pantalla,
  sonido y vibración, buscador por nombre, lector de códigos por teclado.
- QR del pase en la página del invitado, `/i/{token}`.
- Funcionamiento sin conexión: precarga del evento, bandeja de salida, reenvío.
- Resolución determinista de conflictos entre varias puertas.

Fuera (rebanadas y ciclos siguientes):

- Invitados por persona con nombre propio, dieta y VIP — reabre la sección 4 del spec
  del ciclo 3 y no se toca aquí.
- Asignación de mesas y plano del salón — ciclo 4. Hasta entonces la tarjeta de puerta
  no puede decir un número de mesa.
- Mesa de regalos, libro de mensajes, planes y facturación — ciclos aparte.
- Enlace de puerta para personal sin cuenta — se deja el hueco previsto, no se construye.
- QR rotativos o firmados con caducidad — ver sección 12.

## 3. Arquitectura

Sin cambios estructurales. Monolito modular en la misma app Next.js, un despliegue, un
Postgres, las mismas fronteras que `pnpm verify:boundaries` comprueba.

Módulo nuevo `src/modules/checkin/`, con la disposición de siempre:

```
domain/          puro, sin dependencias
  parse-pass.ts        extrae el token de lo escaneado
  arrival.ts           reglas de una llegada
  door-tally.ts        conteo de grupos y personas
  conflict.ts          resolución entre escaneos del mismo grupo
  errors.ts
application/
  ports.ts
  check-in-by-scan.ts
  adjust-arrival.ts
  void-arrival.ts
  get-door-state.ts
  get-door-manifest.ts  lo que el dispositivo precarga
infrastructure/
  drizzle-arrival-repository.ts
ui/
  DoorMode.tsx          cliente, dueño de cámara y bandeja de salida
  ScanResultCard.tsx
  DoorSearchSheet.tsx
  outbox.ts             IndexedDB
actions.ts              toda acción abre con requireSession()
index.ts
```

La UI del modo puerta ya existe, diseñada y probada como maqueta estática en
`public/dashboard/`. Esta rebanada la porta; no la reinventa. Lo que se porta son las
decisiones de interacción, no el código: la maqueta usa hexadecimales sueltos y
`localStorage`, y aquí van tokens de diseño y Postgres.

## 4. Modelo de dominio

### 4.1 Lo escaneado

El QR codifica la URL de invitación completa, `https://dominio/i/{token}`. `parsePass`
acepta esa URL o el token pelado, y devuelve el token o un error. El token es de 128
bits en base64url: veintidós caracteres de `[A-Za-z0-9_-]`.

Se valida la **forma** antes de tocar la base. Un QR de un cartel de la calle no debe
llegar a consultar Postgres.

### 4.2 Una llegada

```
Arrival = {
  scanId: string        uuid generado por el dispositivo
  guestGroupId: string
  arrivedCount: number  1..seats
  scannedAt: Date       reloj del dispositivo
  voidedAt: Date | null
}
```

`createArrival` valida que `arrivedCount` sea entero y esté entre 1 y los cupos del
grupo. Ni cero —un grupo que no entró no se registra— ni más de los cupos vendidos.

### 4.3 Conteo

`doorTally` recibe los grupos esperados y las llegadas vivas, y devuelve grupos
esperados, grupos llegados, personas esperadas y personas dentro. Función pura, sin
reloj ni base: se prueba con tablas de casos.

**Esperados y llegados no son el mismo conjunto.** Quien no confirmó puede aparecer, y
su pase es válido. Los llegados se cuentan sobre todos los grupos con llegada viva, no
filtrando por confirmación. Esa confusión ya produjo dos cifras contradictorias en la
maqueta y no se repite aquí.

### 4.4 Conflicto

Un grupo puede tener varias filas de llegada: dos puertas sin red, o un reintento que
llegó dos veces por caminos distintos. `resolveArrival` toma las filas vivas de un grupo
y devuelve una sola verdad:

- **Hora de llegada: la más temprana.** Es cuando cruzaron la puerta.
- **Cantidad: la del escaneo más reciente.** Es la última corrección que hizo un humano.

Función pura. Es la regla que hace que sincronizar tarde no reescriba la historia.

## 5. Esquema Postgres

Migración `db/migrations/0003_checkin.sql`, generada con `pnpm db:generate`.

```sql
CREATE TABLE arrivals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id         uuid NOT NULL UNIQUE,
  guest_group_id  uuid NOT NULL REFERENCES guest_groups(id) ON DELETE CASCADE,
  arrived_count   integer NOT NULL CHECK (arrived_count >= 1),
  scanned_at      timestamptz NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now(),
  voided_at       timestamptz
);

CREATE INDEX arrivals_group_idx ON arrivals (guest_group_id, scanned_at DESC);
CREATE INDEX arrivals_live_idx  ON arrivals (guest_group_id) WHERE voided_at IS NULL;
```

Por qué append-only y no una fila por grupo con `UPDATE`:

- `scan_id UNIQUE` es la clave de idempotencia. Reenviar el mismo escaneo veinte veces
  desde la bandeja de salida inserta una vez. Sin esto, cada corte de red duplica.
- Dos puertas sin red producen dos filas, no una carrera de escrituras perdidas.
- Deshacer es una lápida (`voided_at`), no un borrado: queda auditoría de que alguien
  registró y se retractó.
- Llegadas en varias tandas salen gratis el día que se quieran.

`received_at` existe porque `scanned_at` es el reloj de un celular ajeno y puede estar
mal. Se muestra y se ordena por `scanned_at`, pero si cae fuera de una ventana razonable
—antes del día anterior al evento, o más de una hora en el futuro respecto a
`received_at`— se usa `received_at`. Un teléfono con la fecha de fábrica no puede
envenenar el orden de llegada de toda la boda.

El `CHECK` solo cubre el límite inferior. El superior son los cupos del grupo, que
viven en otra tabla y no caben en una restricción de columna: lo impone el dominio,
antes de llegar aquí, y lo cubre una prueba de aplicación.

Cascada desde `guest_groups`, que ya cae en cascada desde `events`. Retención y
anonimización siguen funcionando sin tocarlas: una llegada no guarda ningún dato
personal, solo un número y dos horas.

## 6. Rutas y acciones

| Ruta | Grupo | Quién |
|---|---|---|
| `/panel/eventos/[slug]/puerta` | `(panel)` | Atelier con sesión |
| `/i/{token}` | `(guest)` | Invitado, ya existe; se le añade el QR |

**Esto se aparta de lo anotado en `CLAUDE.md`**, que preveía route handlers para esta
rebanada. No hacen falta: los escaneos suben por Server Actions, que es lo que ya usa el
panel, y el reenvío lo dispara la propia página al recuperar la red — no un Service
Worker escribiendo por su cuenta.

Acciones en `checkin/actions.ts`, todas abriendo con `requireSession()`:

- `recordScans(eventId, scans[])` — recibe un lote. Un escaneo en línea es un lote de
  uno; la bandeja de salida manda lo acumulado. Devuelve el resultado por `scanId`.
- `adjustArrivalAction(scanId, count)`
- `voidArrivalAction(scanId)`
- `getDoorManifest(eventId)` — lo que el dispositivo precarga.

`recordScans` recibe lotes desde el principio, no un escaneo suelto que luego haya que
convertir. Es la forma que la rebanada necesita cuando la red falla, que es siempre.

### 6.1 Resultado de un escaneo

Tipo discriminado, no excepciones:

```
{ kind: 'welcome',  group, arrivedCount }
{ kind: 'already',  group, arrivedAt, arrivedCount }
{ kind: 'unknown' }
```

Alimenta las tres tarjetas: verde, ámbar y roja.

## 7. Sin conexión

Es la mitad de esta rebanada, no un añadido. Un salón de bodas fuera de la ciudad no
tiene wifi utilizable, y la puerta no puede depender de eso.

### 7.1 Precarga

Al abrir el modo puerta, `getDoorManifest` devuelve, para el evento:

```
{ eventId, eventTitle, groups: [{ id, label, seats, attending, tokenHash }], arrivals: [...] }
```

`attending` es la cifra de la respuesta de RSVP más reciente del grupo, o cero si no
respondió; es el valor con el que arranca el ajuste de cantidad en la puerta.
`tokenHash` es el SHA-256 en hexadecimal que ya está en la base. **El manifiesto nunca
contiene un token en claro**, así que la regla del proyecto se cumple también en el
dispositivo: si roban el celular de la puerta, no salen enlaces utilizables.

### 7.2 Validación local

El dispositivo hashea lo escaneado con `crypto.subtle.digest('SHA-256', ...)` y compara
contra los hashes del manifiesto. Web Crypto exige contexto seguro, que la cámara ya
exige de todas formas.

Así la puerta resuelve verde, ámbar o rojo **sin servidor**, con la misma lógica de
dominio que usa el servidor. El dominio es puro y no importa nada de Node, así que el
mismo módulo corre en ambos lados. Esa es la razón de que las fronteras existan.

### 7.3 Bandeja de salida

Cada escaneo se escribe primero en IndexedDB —`scanId`, grupo, cantidad, hora— y la
pantalla responde de inmediato. Un reenviador intenta subir el lote pendiente al
registrar, al recuperar la red (`online`), al volver a primer plano, y cada treinta
segundos mientras quede algo. Fallo de red deja el lote donde está y reintenta con
espera creciente; nada se pierde y nada se descarta.

La barra superior muestra cuántos escaneos faltan por subir. Cero pendientes es la
señal de que se puede cerrar la puerta y guardar el teléfono.

### 7.4 PWA

`manifest.webmanifest` y Service Worker con Serwist, alcance limitado a
`/panel/eventos/*/puerta` y sus recursos. Se precachean el documento, el JS y las
fuentes; nada del sitio de marketing. El Service Worker **solo sirve recursos**: no
escribe, no sincroniza en segundo plano. Toda escritura pasa por la página, con sesión.

Instalable en la pantalla de inicio, que es como el personal de puerta lo va a usar.

## 8. Seguridad

- Toda acción abre con `requireSession()`. Es un extremo HTTP público.
- **El grupo resuelto debe pertenecer al evento de la puerta.** Sin esa comprobación, el
  pase de otra boda de la misma plataforma abre esta puerta. Se verifica en servidor
  aunque el dispositivo ya haya decidido: el manifiesto es una caché, no una autoridad.
- Token desconocido responde `unknown`, nunca un error que confirme que el token existe
  pero no vale. La regla del proyecto es 404, nunca 403.
- Ningún token en claro toca la base ni el manifiesto. Solo SHA-256.
- El manifiesto solo se entrega a una sesión válida y solo para eventos de ese usuario.
- Los colores nuevos del modo puerta se declaran en `src/shared/design/tokens.css`
  —`--color-ok`, `--color-warn`, `--color-danger`—, que hoy no los tiene. Ningún
  hexadecimal fuera de ahí.

### 8.1 Lo que se acepta

El pase es estático: el enlace que el invitado ya tiene. Un invitado puede enviar su QR
por captura de pantalla y otra persona presentarlo. La industria responde con QR
rotativos cada quince segundos.

Aquí no. Rotar exige que el invitado abra la web en la puerta con la red del salón, que
es justo lo que la sección 7 da por perdida. Para una boda el riesgo es despreciable:
nadie revende invitaciones de boda, y la lista de grupos es corta y conocida. La
mitigación es la que la puerta ya hace: el segundo escaneo del mismo pase sale en ámbar,
con la hora del primero, y quien recibe decide.

Coste si resulta errónea: emitir un segundo token solo para la puerta, que es aditivo y
no rompe nada de lo construido.

## 9. Manejo de errores

Todo con `Result`, como el resto del proyecto. Sin excepciones para flujo esperado.

| Situación | Respuesta |
|---|---|
| QR con forma inválida | Tarjeta roja, sin consultar nada |
| Token que no es de este evento | Tarjeta roja, `unknown` |
| Grupo revocado | Tarjeta roja con motivo; quien recibe puede registrar a mano |
| Cantidad fuera de 1..cupos | Rechazada en dominio, antes de la base |
| Permiso de cámara denegado | Pantalla con salida a buscar por nombre |
| Sin contexto seguro | Aviso explícito: la cámara exige HTTPS o localhost |
| Cámara ocupada o ausente | Mensaje propio, con reintento |
| Sin red | Silencio: la bandeja de salida se encarga. Solo el contador de pendientes |
| Reenvío rechazado por el servidor | Se marca el escaneo y se muestra para resolver a mano |

## 10. Pruebas

TDD, en el orden de siempre.

- **Dominio**, por unidad y sin dobles: `parsePass` con URL, token pelado, basura y QR
  ajenos; `createArrival` en los bordes 0, 1, cupos y cupos+1; `doorTally` incluyendo el
  caso del que no confirmó y vino; `resolveArrival` con dos puertas, con reenvío
  duplicado y con lápidas.
- **Aplicación**, con repositorios falsos: idempotencia por `scanId`, grupo de otro
  evento, grupo revocado, lote mixto de válidos e inválidos.
- **Infraestructura**, contra Postgres real como el resto: que `scan_id UNIQUE` corta de
  verdad, que la cascada borra, y que el manifiesto no devuelve ningún token en claro.
- **UI**, con Testing Library: las tres tarjetas, el ajuste de cantidad, deshacer, el
  buscador.
- **Bandeja de salida**: acumula sin red, reenvía al volver, no duplica al reenviar dos
  veces, sobrevive a recargar la página.
- **e2e** en el 3100: crear evento, cargar grupo, abrir la puerta, escanear el pase,
  verificar el contador. El QR se inyecta como stream de canvas, que es la técnica con
  la que ya se validó la maqueta de punta a punta.

## 11. Despliegue

Sin servicios nuevos. Una migración, que sigue el runbook: reconstruir la imagen del
migrador antes de correrlo, o se aplica un juego viejo sin quejarse.

El Service Worker es la única pieza con memoria entre despliegues. Se versiona con el
build para que un despliegue nuevo no deje a la puerta sirviendo el JS de ayer.

## 12. Decisiones tomadas

| Tema | Decisión | Coste si es errónea |
|---|---|---|
| El pase | El enlace de invitación que el invitado ya tiene | Emitir un token de puerta aparte; aditivo |
| Operador | Solo el atelier con sesión | Añadir enlace de puerta sin cuenta, con la forma de `client_shares` |
| Qué se registra | Cuántos llegaron, ajustable en la puerta | Ninguno; el registro append-only admite cualquier política |
| Forma de la tabla | Append-only con clave de idempotencia | Ninguno; es el lado conservador |
| Conflicto | Hora más temprana, cantidad más reciente | Cambiar una función pura y recalcular |
| Confirmación al escanear | No hay: registra y ofrece deshacer | Volver al diálogo si aparece abuso real |
| Sin conexión | Obligatorio en esta rebanada, no en una posterior | Ninguno; construirlo después habría obligado a rehacer la tabla |
| QR rotativos | No | Ver 8.1 |
| Service Worker | Solo recursos, nunca escritura | Ninguno; mantiene toda escritura tras sesión |
| Número de mesa | No se muestra hasta que exista el ciclo 4 | Ninguno; la tarjeta ya tiene el hueco previsto |
