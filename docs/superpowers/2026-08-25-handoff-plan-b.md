# Handoff — sesión del 25 de agosto de 2026

Cierra **todo lo que quedaba sin construir**: los canales de envío, los recordatorios de
RSVP y el Plan B entero. Nueve commits, de `e27817d` a `bd2eeca`, todos en `main`. Árbol
limpio.

**Sigue sin haber remoto: nada de esto está respaldado fuera de esta máquina.**

## Estado verificado (ejecutado al cerrar, no de memoria)

```
1497 unitarias · 60 e2e · typecheck · lint · verify:boundaries · build   → todo en verde
pnpm preflight                                                          → corta, y debe
```

`preflight` corta por cinco puntos: WhatsApp, correo, dominio, contraseña de Postgres y
—nuevo— los **datos de transferencia del Plan B**. Es su trabajo.

## Lo primero que hay que saber

**La documentación mentía.** `CLAUDE.md` y la auditoría de diseño daban por pendiente la
rebanada 2 del ciclo 3 —canales de envío—, que estaba en `main` desde el 22 de agosto
(`b9b18a7`). Lo mismo con el menú por invitado. Una sesión entera podía haberse ido en
reconstruir lo que ya existía. Está corregido; la auditoría lleva la corrección al pie, no
reescrita, porque va fechada.

## Qué se hizo

### 1. Cabos sueltos

- **Los últimos nueve botones del panel escritos a mano pasan a `PanelKit`.** Siete
  pintaban con `border-line`, que es el dorado de la web pública donde la maqueta pone
  tinta; los otros tenían las dos variantes de `PanelButton` transcritas carácter a
  carácter. `PanelButton` aprende `external` para el botón de WhatsApp.
- **`pnpm db:seed:demo`**, aparte de `db:seed` porque aquel corre en producción. Ocho
  grupos, veintisiete personas con sus VIP y sus dietas, mesas, zonas, regalos, un fondo y
  mensajes. Tokens deterministas, y el script se niega a correr con `NODE_ENV=production`.

### 2. QR de reparto — cierra la rebanada 2

Una tarjeta por enlace, con su QR y su dirección, lista para imprimir y entregar en mano.
Sale donde nace un enlace: al generar o reenviar uno, y en el resultado de la importación.

**No puede vivir en una ruta propia** como el plan del banquete: de cada enlace la base
guarda solo su SHA-256, así que no hay página del servidor capaz de dibujar el código. El
token en claro dura lo que dure la pantalla.

De paso arregla **«Imprimir pase»**, que llamaba a `window.print()` a pelo y mandaba al
papel el panel entero con el diálogo encima.

### 3. Recordatorios de RSVP — cierra la rebanada 4

El servidor calcula a quién toca recordar; el atelier despacha por WhatsApp. Dos reglas
—sin responder con el cierre a siete días, y sin abrir tras tres repartido—, una espera de
cinco días entre recordatorios del mismo motivo, y nada el mismo día en que se reparte.

**El mensaje no lleva el enlace dentro**, por lo mismo de arriba: apunta al mensaje
anterior del mismo chat. Hay prueba, unitaria y e2e, de que ningún texto lleva una URL.

### 4. Plan B entero

Pedidos por transferencia con referencia pública, comprobante subido por el cliente y
bandeja del atelier donde se aprueba o se rechaza con nota.

El comprobante se trata como entrada hostil: magic bytes, no extensión ni `Content-Type`;
UUID como nombre en disco; tope comprobado antes de leer el fichero a memoria; y el
almacén **fuera de `public/`**, servido por un route handler tras la sesión con
`attachment` y `sandbox`.

## Los fallos que estaban escondidos

1. **La decisión del pedido viajaba en un campo oculto que un `onClick` actualizaba.**
   `setState` no ha corrido cuando el formulario se envía: «Rechazar» habría aprobado el
   pedido. Ahora viaja en el botón, que entra en el `FormData` como emisor.
2. **La cola de recordatorios llevaba un estado de «ya lo marqué» que no existe.** La
   acción revalida y remonta el componente. Lo cazó la e2e.
3. **`pnpm build` ya no cabe en 8 GB de heap** ni con `.next` recién borrado, que era el
   remedio documentado. El script pide 12288.

## Qué queda

**Nada de código.** Lo que falta es del usuario:

- WhatsApp, correo y dominio reales.
- Contraseña de Postgres de producción.
- **Datos de transferencia y QR de pago** (`BRAND.payment`) — los pide el Plan B.
- Fotos de las plantillas `zafiro` y `onix`.

Y dos cosas que necesitan una decisión antes que un teclado:

- **El canal correo** de los envíos y los recordatorios: proveedor, dominio verificado y
  remitente.
- **El conmutador mensual/anual** de «Tu plan»: hoy se cobra una vez por evento, y un
  conmutador de suscripción sin precios detrás promete una factura que no existe.
