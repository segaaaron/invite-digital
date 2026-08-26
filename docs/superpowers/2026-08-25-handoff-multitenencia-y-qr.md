# Handoff — sesión del 25 de agosto de 2026 (segunda)

28 commits, de `e27817d` a `d859bf2`, todos en `main`. Árbol limpio.

La sesión empezó cerrando cabos sueltos y acabó construyendo **la separación entre
usuarios que el proyecto nunca tuvo**. Si solo lees un párrafo, que sea el siguiente.

## Lo que descubrimos a mitad de camino

`events` **no tenía dueño** y `users` **no tenía rol**. `requireSession()` comprobaba que
hubiera sesión, no de quién, y `events.list()` devolvía todos los eventos de la base.

Con dos usuarios dados de alta, **cada uno veía y editaba las bodas del otro**: invitados,
mesas, regalos, mensajes y pedidos. No era una funcionalidad que faltara; era una
separación que nunca existió, porque hasta ese día solo había un usuario.

Todo lo que vino después —admin, personal de puerta, motor de QR— se apoya en eso.

## Estado verificado al cerrar (ejecutado, no de memoria)

```
1571 unitarias (220 ficheros) · 71 e2e          → verde
typecheck · lint                                → verde
verify:boundaries · verify:tenancy              → verde
25 migraciones · 25 entradas en el registro     → cuadra
código muerto                                   → ninguno
pnpm preflight                                  → corta por 5 datos del usuario
```

## Qué se construyó

### 1. Cabos sueltos y documentación mentirosa

`CLAUDE.md` y la auditoría daban por pendiente la **rebanada 2 del ciclo 3** —canales de
envío—, que llevaba tres días en `main`. Un documento que dice que algo falta cuesta más
que uno que no dice nada: la sesión siguiente empieza a construir lo que ya existe.

También: los últimos botones a mano del panel pasaron a `PanelKit`, nació
`pnpm db:seed:demo`, y la barra dejó de mezclar glifos monocromos con emoji a todo color
—catorce SVG de línea, con `currentColor`—.

### 2. QR de reparto y recordatorios de RSVP

Cierran las rebanadas 2 y 4 del ciclo 3. Del reparto sale la hoja de tarjetas imprimible;
de los recordatorios, una cola que el servidor calcula y el atelier despacha por WhatsApp.
**Ninguno de los dos lleva el enlace dentro del mensaje**: de ese token la base guarda solo
su SHA-256.

### 3. Plan B: pedidos, comprobantes y bandeja

Referencia pública sin `0/O/1/I/L` —se dicta por teléfono—, comprobante validado por
**magic bytes** y guardado fuera de `public/`, y la bandeja donde se aprueba o se rechaza
con nota.

### 4. Multitenencia

- `events.user_id` con **`ON DELETE RESTRICT`** y `users.role`.
- **En las páginas, la firma es la guardia**: no existe `getBySlug(slug)`, hay
  `getFor(actor, slug)`. El compilador señaló las catorce páginas que no pasaban actor.
- **En las acciones**, `requireEventAccess` tras `requireSession`, en las treinta y nueve
  que tocan un evento.
- **`pnpm verify:tenancy`** para que no se olvide ninguna. Exige que cada acción llame a
  `requireSession()` **en su propio cuerpo**: delegarlo en un ayudante lo escondía del
  verificador, y una acción propia se le coló hasta que se cerró ese hueco.
- El evento ajeno responde **404, nunca 403**.

### 5. Administración

`/panel/admin` con panorama, usuarios, todos los eventos, auditoría y datos de cobro. El
admin entra en cualquier evento y trabaja dentro —es lo que hace falta para dar soporte—,
y por eso existe la auditoría, que copia el correo del actor como texto.

### 6. Personal de puerta

El rol solo no bastaba: hacía falta la **pertenencia** (`event_staff`). Una persona de
puerta trabaja una boda, una noche. El corte va en la firma con la sección, y **`full` es
lo que se hereda cuando nadie dice nada**: el olvido cae del lado seguro.

Lo da de alta el **dueño del evento**, no el admin.

### 7. Lo que una boda le pide de verdad a la puerta

Cuatro huecos, y el peor era silencioso: **«ya había ingresado» estaba tratado como
aviso**. Las familias llegan partidas y ese segundo escaneo salía sin encolar nada, así que
los que llegaban tarde no se registraban nunca.

También: entrar de más con tope, el nombre en vez de la etiqueta, y confirmación **solo en
el código manual** —la cámara sigue sin confirmar, porque un toque más por invitado es una
fila en la puerta—.

### 8. Motor de QR y datos de cobro

Los datos de cobro salieron del código a `app_settings`, editables por el admin.
**El QR de cobro no se genera y no puede**: en Bolivia lo emite el sistema financiero.

El motor: códigos que apuntan a `/r/<id>` y redirigen. Es lo único que permite cambiar el
destino de algo **ya impreso** y contar escaneos. Redirección **302, nunca 301**; apagar,
no borrar; y el contador suma en la base.

Y el pase a solas (`/i/<token>/pase`), para no buscar el WhatsApp en la puerta.

## Los fallos silenciosos de la sesión

Ninguno daba error y ninguno lo vio el typecheck.

1. **Drizzle emite las columnas sin cualificar** dentro de un `sql` interpolado:
   `where "user_id" = "id"`, y ahí `"id"` es el de la tabla de dentro. Contaba **cero
   eventos para todo el mundo**.
2. **El segundo escaneo de un grupo no se encolaba** (arriba).
3. **`.kind === 'err'`** para comprobar un `Result` cuyo discriminante es `ok`: un destino
   de QR inválido se guardaba igual.
4. **`qr_codes.user_id` era `RESTRICT`**: borrar a quien creó un código reventaba con un
   error de clave foránea. Lo encontró el QA contra la base.
5. **La gráfica del admin miraba los doce meses pasados**, y en este negocio las bodas
   están por delante: doce ceros con dos bodas en la base.

## Reglas nuevas que conviene no volver a aprender

- **Todo evento sembrado a mano necesita `user_id`.** Sin él solo lo ve el admin, y la
  suite entera se cae en 404 sin decir por qué. Pasó con los doce fixtures.
- **Las e2e traen su propio administrador**, sembrado y borrado por la suite. Antes daban
  por hecho que `atelier@` lo era, y eso ataba las pruebas a un dato que se cambia desde
  una pantalla.
- **El heap del build sube solo**: 8 → 12 → 16 GB en un día, siempre por el rastreo de
  ficheros del `output: standalone`.

## Qué queda

**Nada de código pendiente.** Lo que falta es del usuario:

- WhatsApp, correo y dominio reales · `SITE_URL` con HTTPS
- Contraseña de Postgres de producción
- Datos de transferencia, que ya se cargan desde `/panel/admin/pagos`
- Fotos de las plantillas `zafiro` y `onix`

Y una fase del roadmap de QR bloqueada por datos suyos:

- **QR de pago dinámico** (fase 3): NIT, empresa y proveedor —CUCU, Xmart, BCP o BISA—.
  Ojo: **deja obsoleta la mitad del Plan B**, porque si el pago se concilia por webhook
  nadie sube comprobante.

Sin decidir todavía: el **canal correo** para envíos y recordatorios, y el **conmutador
mensual/anual** de «Tu plan», que contradice el cobro por evento.

## Antes de abrir el dominio

1. **Reconstruye la imagen del migrador** (`docker compose --profile tools build migrator`).
   Van cinco migraciones nuevas, `0021`–`0025`.
2. **El volumen `proofs` no entra en `pg_dump`**: guarda comprobantes y el QR de cobro.
3. **`atelier@invitepremium.bo` es dueño de los eventos de la demo** y su contraseña está
   en el repositorio (fixtures de las e2e). Reasigna sus eventos y bórralo, o recréalo.
4. **Borra la demo** si no la quieres en producción: `demo-boda` y `boda-demo`.

Roles al cerrar: `mikisaraviaios@gmail.com` es el **único administrador**.
