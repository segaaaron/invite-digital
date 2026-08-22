# Libro de firmas (Ciclo 4, rebanada 3)

## 1. Propósito

Los invitados **ya escriben mensajes** al confirmar: el formulario de RSVP tiene su campo
y lo guarda en `rsvp_responses.message`. Nadie los ve nunca. Están en la base desde la
rebanada 1 y no hay una sola pantalla que los muestre.

Esta rebanada los desentierra y les da lo que les falta: leído, destacado y respuesta.

Éxito:

- El atelier ve todos los mensajes del evento, el más reciente arriba.
- Marca leído lo que ya atendió, y el contador de sin leer baja.
- Destaca los que la pareja querrá releer o imprimir.
- Responde a un mensaje, y el invitado ve la respuesta al volver a su enlace.
- La pareja los ve desde su enlace de solo lectura.

## 2. Alcance

Dentro:

- Tabla `message_notes` con el estado editable de cada mensaje.
- Bandeja de mensajes en el panel, con filtros: todos, sin leer, destacados.
- Marcar leído y destacado.
- Responder, y que el invitado vea la respuesta en su página.
- Contador de sin leer en la navegación del evento.
- Los mensajes destacados, en la vista de solo lectura del cliente.

Fuera:

- **Mensaje suelto sin confirmar asistencia.** El invitado deja su mensaje al responder,
  que es como ya funciona. Un formulario aparte sería otra puerta pública de escritura
  para muy poco.
- Notificaciones por correo o WhatsApp al llegar un mensaje.
- Hilos de conversación: una respuesta por mensaje, no una charla.

## 3. La decisión que estructura todo

**No se duplica el mensaje.** Vive donde ya vive: en `rsvp_responses.message`, que es el
histórico inmutable de lo que el invitado escribió y cuándo.

Lo que se añade es solo el **estado editable** —leído, destacado, respuesta— en una tabla
aparte, `message_notes`, referida al `rsvp_response_id`.

Copiar el texto a una tabla nueva daría dos versiones del mismo mensaje que se
desincronizan en cuanto alguien edite una. Y meter `read_at` dentro de `rsvp_responses`
ensuciaría un histórico que hasta hoy es inmutable: una respuesta de RSVP se escribe una
vez y no se toca, y esa propiedad vale más que ahorrarse una tabla.

Un invitado que cambia su respuesta genera **otra** fila de RSVP con **otro** mensaje. Los
dos aparecen en el libro, en su orden. Eso es correcto: dijo dos cosas distintas en dos
momentos.

## 4. Modelo de dominio

Módulo `src/modules/guestbook/`.

```
GuestMessage = {           // lectura, compuesta de las dos tablas
  responseId, guestGroupId, groupLabel,
  body, writtenAt,
  readAt: Date | null,
  featuredAt: Date | null,
  reply: string | null,
  repliedAt: Date | null,
}
```

`domain/message-note.ts`, puro:

- `createReply(text): Result<string, GuestbookError>` — recorta, rechaza vacío y limita a
  1000 caracteres.
- `isUnread(m)`, `isFeatured(m)`.

`domain/inbox.ts`, puro:

- `filterMessages(messages, filter)` con `filter = 'all' | 'unread' | 'featured'`.
- `unreadCount(messages)`.
- El orden es **siempre por fecha de escritura descendente**, y no es configurable: el
  libro de firmas se lee de lo último a lo primero.

## 5. Esquema Postgres

Migración `db/migrations/0006_guestbook.sql`.

```sql
CREATE TABLE message_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rsvp_response_id uuid NOT NULL UNIQUE REFERENCES rsvp_responses(id) ON DELETE CASCADE,
  read_at timestamptz,
  featured_at timestamptz,
  reply text,
  replied_at timestamptz
);
CREATE INDEX message_notes_featured_idx ON message_notes (featured_at) WHERE featured_at IS NOT NULL;
```

`UNIQUE` sobre `rsvp_response_id`: una nota por mensaje. Las escrituras son `INSERT ... ON
CONFLICT DO UPDATE`, así que marcar leído dos veces no crea dos filas ni falla.

Cascada desde `rsvp_responses`, que ya cae desde `guest_groups` y de ahí desde `events`.

**Retención:** el texto del mensaje se anonimiza donde ya está —en `rsvp_responses`, que
la barrida existente ya cubre—. La respuesta del atelier vive en `message_notes.reply` y
**también** hay que borrarla al vencer: es texto escrito sobre un dato personal. Se amplía
`anonymizeExpiredEvents`, con su prueba.

## 6. Rutas

| Ruta | Grupo | Quién |
|---|---|---|
| `/panel/eventos/[slug]/mensajes` | `(panel)` | Atelier con sesión |
| `/i/{token}` | `(guest)` | El invitado ve la respuesta a su mensaje |
| `/compartir/{token}` | `(guest)` | El cliente ve los destacados |

Todas las acciones son del panel y abren con `requireSession()`. **El invitado no escribe
nada nuevo aquí**: solo lee la respuesta. Esta rebanada no abre ninguna puerta pública de
escritura, y eso es a propósito.

## 7. Errores

| Situación | Respuesta |
|---|---|
| Respuesta vacía o solo espacios | Rechazada en dominio |
| Respuesta de más de 1000 caracteres | Rechazada, con el límite en el mensaje |
| Mensaje de otro evento | `wrong_event` |
| Marcar leído dos veces | Correcto, idempotente |
| Responder a un mensaje ya respondido | Sustituye la respuesta anterior |
| El mensaje ya no existe | `not_found` |

## 8. Pruebas

- **Dominio:** `createReply` con vacío, espacios, 1000 y 1001 caracteres; `filterMessages`
  con los tres filtros; `unreadCount`; que el orden es descendente por fecha aunque la
  entrada venga desordenada.
- **Aplicación:** marcar leído es idempotente; responder sustituye; mensaje de otro evento
  se rechaza.
- **Infraestructura contra Postgres real:** el `UNIQUE` corta de verdad y el `ON CONFLICT`
  actualiza en vez de fallar; la cascada borra las notas al borrar el evento; **un grupo
  con dos respuestas produce dos mensajes en el libro**.
- **Retención:** al vencer, la respuesta del atelier queda borrada.
- **UI:** los tres filtros; el contador de sin leer; destacar y quitar; la respuesta
  aparece bajo el mensaje.
- **e2e:** el invitado confirma con un mensaje, el atelier lo ve sin leer, lo marca leído,
  responde, y el invitado ve la respuesta al recargar su enlace.

## 9. Decisiones tomadas

| Tema | Decisión | Coste si es errónea |
|---|---|---|
| Dónde vive el mensaje | Donde ya está; solo se añade estado | Ninguno; evita dos versiones del mismo texto |
| Histórico de RSVP | Sigue inmutable | Ninguno; es la propiedad que se protege |
| Mensaje suelto sin RSVP | Fuera | Añadirlo después es aditivo |
| Dos respuestas, dos mensajes | Aparecen los dos | Ninguno; dijo dos cosas distintas |
| Orden | Fijo, más reciente primero | Ninguno |
| Escritura del invitado | Ninguna nueva | Ninguno; no abre puerta pública |
| Respuesta del atelier | Se borra en la retención | Ninguno; es texto sobre un dato personal |
