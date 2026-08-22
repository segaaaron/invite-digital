# Mesa de regalos y fondos en efectivo (Ciclo 4, rebanada 2)

## 1. Propósito

Que la pareja publique qué necesita y que el invitado lo vea desde su propia invitación,
sin cadenas de WhatsApp preguntando «¿qué les regalo?» ni tres licuadoras repetidas.

Éxito:

- El atelier carga la lista de regalos con su precio y dónde comprarlos.
- El invitado abre su enlace, ve la lista y **reserva** uno. Deja de estar disponible para
  los demás en ese mismo instante.
- La pareja abre fondos en efectivo con una meta, y el atelier registra lo que llega.
- Ambos ven cuánto se ha recaudado y quién regaló qué.

## 2. Alcance

Dentro:

- Tablas `gifts`, `gift_funds` y `fund_contributions`.
- Alta, edición y baja de regalos y fondos desde el panel.
- Reserva de un regalo por el invitado desde `/i/{token}`, y cancelación de su reserva.
- Marcar un regalo como comprado, desde el panel.
- Registro de contribuciones a un fondo, desde el panel.
- Progreso del fondo frente a su meta.
- Bloque de mesa de regalos en la página del invitado.
- Los nombres de quien regala entran en la anonimización por retención.

Fuera:

- **Cobro en línea.** No hay pasarela de pago y no se construye aquí. El fondo recauda
  por transferencia o sobre en el evento, y el atelier registra lo que llegó. Los datos
  de transferencia y el QR de pago siguen pendientes del usuario.
- Reserva parcial de un regalo entre varios invitados.
- Recordatorios automáticos de agradecimiento.

## 3. El dinero

**Todo importe se guarda en centavos, como entero.** Nunca en coma flotante: `0.1 + 0.2`
no es `0.3`, y una mesa de regalos que descuadra por céntimos es una discusión con la
pareja que no tiene solución técnica después.

La moneda sale de `events.currency`, que ya existe y por defecto es `BOB`. El dominio no
la convierte: no hay tipos de cambio ni conversión, solo formato al mostrar.

`src/modules/registry/domain/money.ts`:

- `parseAmount(text: string): Result<number, RegistryError>` — acepta `1.234,50` y
  `1234.50`, devuelve centavos. Rechaza negativos, cero y más de dos decimales.
- `formatAmount(cents: number, currency: string): string`.

## 4. Modelo de dominio

Módulo `src/modules/registry/`, misma disposición que `checkin` y `venue`.

### 4.1 Regalo

```
Gift = {
  id, eventId, name, priceCents, store, url,
  status: 'available' | 'reserved' | 'purchased',
  claimedByGroupId: string | null,
  claimedAt: Date | null,
}
```

Transiciones permitidas, en `gift-status.ts` y puras:

| De | A | Quién |
|---|---|---|
| `available` | `reserved` | Invitado, desde su enlace |
| `reserved` | `available` | El mismo invitado que reservó, o el atelier |
| `reserved` | `purchased` | Atelier |
| `available` | `purchased` | Atelier (llegó sin reservar) |
| `purchased` | cualquiera | **Nadie.** Comprado es definitivo |

Un invitado **solo puede liberar lo que él reservó**. Sin esa regla, cualquiera con un
enlace válido libera el regalo de otro.

### 4.2 Fondo

```
Fund = { id, eventId, name, description, goalCents }
Contribution = { id, fundId, guestGroupId | null, displayName, amountCents, method, message, createdAt }
```

`method` es `'transfer' | 'card' | 'envelope' | 'other'`. `guestGroupId` es anulable: la
abuela que entrega un sobre no tiene grupo con enlace.

`fund-progress.ts`, puro: `progressOf(fund, contributions)` devuelve recaudado, meta,
porcentaje **recortado al 100** y si se superó la meta. Recortado porque una barra al 140 %
se sale del contenedor; el exceso se dice con palabras, no deformando la barra.

## 5. La carrera por el mismo regalo

Dos invitados abren la lista a la vez y reservan la cafetera. Es el fallo clásico de una
mesa de regalos y hay que resolverlo en la base, no en la aplicación.

La reserva es un `UPDATE` condicional:

```sql
UPDATE gifts SET status='reserved', claimed_by_group_id=$2, claimed_at=now()
WHERE id=$1 AND status='available'
RETURNING id
```

Si devuelve cero filas, alguien llegó antes: el invitado ve «este regalo ya lo reservó
otro invitado» y la lista se refresca. Comprobar antes con un `SELECT` y luego escribir
deja una ventana entre las dos consultas por la que se cuelan las dos reservas.

Lo mismo para liberar: `WHERE id=$1 AND status='reserved' AND claimed_by_group_id=$2`.

## 6. Rutas

| Ruta | Grupo | Quién |
|---|---|---|
| `/panel/eventos/[slug]/regalos` | `(panel)` | Atelier con sesión |
| `/i/{token}` | `(guest)` | Invitado; se le añade el bloque de regalos |

Las acciones del panel abren con `requireSession()`. Las del invitado **no tienen
sesión**: se autorizan por su token, con el mismo camino que ya usa el RSVP
(`resolveByToken`), y responden 404 ante un token desconocido, nunca 403.

Un invitado con enlace revocado no reserva: el mismo guardián que impide responder al
RSVP impide reservar.

## 7. Datos personales y retención

`fund_contributions.display_name` y `message` son datos personales de terceros —gente que
ni siquiera es invitada, como la abuela del sobre—. Entran en la anonimización por
retención junto al resto: cuando el evento vence, el nombre pasa a «Anónimo» y el mensaje
se borra. **Los importes se conservan**: la contabilidad de la pareja no es un dato
personal y borrarla dejaría fondos descuadrados.

Se amplía `anonymizeExpiredEvents` para cubrir esta tabla, con su prueba.

## 8. Errores

| Situación | Respuesta |
|---|---|
| Importe cero, negativo o con más de dos decimales | Rechazado en dominio |
| Reservar un regalo ya reservado | `already_claimed`, con la lista refrescada |
| Liberar un regalo que reservó otro | `not_yours` |
| Cambiar el estado de un regalo comprado | `already_purchased` |
| Regalo o fondo de otro evento | `wrong_event` |
| Token desconocido o revocado | 404, nunca 403 |
| Borrar un fondo con contribuciones | Se pide confirmación; borra fondo y contribuciones en cascada |
| URL de tienda inválida | Rechazada; solo `http` y `https` |

La URL se valida porque acaba siendo un enlace que el invitado pulsa: un `javascript:` en
ese campo sería un agujero abierto por el propio panel.

## 9. Pruebas

- **Dominio:** `parseAmount` con `1.234,50`, `1234.50`, `0`, negativos, tres decimales y
  texto basura; la tabla de transiciones entera, incluida la de que comprado no vuelve
  atrás; `progressOf` con cero, a medias, justo en la meta y por encima.
- **Aplicación:** liberar lo que reservó otro; reservar con enlace revocado; regalo de
  otro evento.
- **Infraestructura contra Postgres real:** **la carrera** — dos reservas simultáneas del
  mismo regalo y solo una gana; que liberar exige ser el dueño; que borrar el fondo
  arrastra sus contribuciones.
- **Anonimización:** un evento vencido deja los importes y anonimiza nombres y mensajes.
- **UI:** lista del panel con sus tres estados; el bloque del invitado con el botón de
  reservar y el aviso de «ya reservado»; la barra del fondo recortada al 100 %.
- **e2e:** el invitado abre su enlace, reserva un regalo, y el panel lo ve reservado.

## 10. Decisiones tomadas

| Tema | Decisión | Coste si es errónea |
|---|---|---|
| Importes | Centavos enteros | Ninguno; es el lado correcto |
| Moneda | La del evento, sin conversión | Añadir conversión es aditivo |
| Cobro en línea | Fuera: no hay pasarela | Plan B, spec propio |
| Quién reserva | El invitado, desde su enlace | Ninguno |
| Carrera | `UPDATE` condicional, no `SELECT` + `UPDATE` | Ninguno; el lado correcto |
| Liberar | Solo quien reservó, o el atelier | Ninguno |
| Comprado | Definitivo, no vuelve atrás | Permitirlo después es aditivo |
| Contribuciones | Las registra el atelier | Se automatiza cuando exista pasarela |
| Retención | Nombres y mensajes se anonimizan; importes se conservan | Ninguno |
