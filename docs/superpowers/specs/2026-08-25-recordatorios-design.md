# Recordatorios de RSVP — ciclo 3, rebanada 4

Fecha: 25 de agosto de 2026 · Estado: aprobado, en construcción

## El problema

Faltan diez días para cerrar el número con el catering y hay catorce grupos que no han
contestado. Hoy el atelier los encuentra a ojo, recorriendo la tabla de invitados y
comparando fechas de cabeza. Los que se le pasan son los que aparecen sin avisar el día
del evento, o los que no aparecen habiendo comida pagada por ellos.

## Lo que se construye, y lo que no

**El servidor decide a quién toca recordar; el envío lo dispara el atelier.** No hay
proveedor de correo, no hay disparador periódico y el canal de WhatsApp es asistido: el
panel abre el chat con el mensaje escrito y una persona pulsa enviar. Automatizar el
*cálculo* es la mitad que aporta valor y la que se puede construir hoy entera. El canal
correo queda para cuando existan proveedor, dominio verificado y remitente — datos del
usuario.

Decirle «automático» a esto sería mentir en la pantalla: la vista se llama
**Recordatorios** y enseña una cola de tareas del día, no una bandeja de salida.

## El nudo: un recordatorio no puede llevar el enlace dentro

De cada token la base guarda **solo su SHA-256**. Reproducir el enlace es imposible por
diseño, y regenerarlo invalidaría el que el invitado ya tiene en la mano —que es
exactamente lo que no se quiere hacer al recordarle algo—.

El texto del recordatorio apunta, entonces, al mensaje anterior: «el enlace que les
enviamos por aquí». Se manda por el mismo chat de WhatsApp donde está ese mensaje, unas
líneas más arriba. Cuando el enlace de verdad se perdió, la salida es **reenviar** desde
«Enviar invitaciones», que ya existe y ya avisa de que rota el enlace y deja fuera a quien
lo tuviera.

Por eso `reminderMessage` acepta `{grupo}` y `{fecha}` y **no** acepta `{enlace}`.

## Las dos reglas

| Motivo | Condición | Qué hacer |
|---|---|---|
| `sin_respuesta` | Enlace repartido, sin RSVP, y faltan **≤ 7 días** para `rsvp_deadline` | Recordar por WhatsApp |
| `sin_abrir` | Repartido hace **≥ 3 días** y `opened_at` sigue nulo | Probablemente el mensaje no llegó: conseguir otro número o reenviar |

Un mismo motivo no se repite antes de **5 días**. Sin esa espera la cola no encoge nunca y
deja de leerse como una lista de tareas.

Quedan fuera a propósito:

- **«Confirmó y no tiene mesa»** ya lo enseña el panel «Invitados sin mesa» del resumen
  desde el ciclo 4. Dos sitios que dicen lo mismo son dos sitios que se desincronizan.
- **«Sin teléfono»** no es una regla, es el estado de una fila de las otras dos. Va como
  marca en la fila, y ahí el botón de WhatsApp no se pinta: no hay a quién escribirle.

Un grupo **revocado** no genera recordatorios. Revocar se deshace a propósito.

Los umbrales son constantes del dominio, no columnas ni configuración: hoy no hay ninguna
petición de cambiarlos por evento, y una preferencia que nadie toca es una pantalla más
que mantener.

## Forma

```
src/modules/reminders/
  domain/due.ts              dueReminders(...) puro, sin Date.now dentro
  domain/reminder-message.ts el texto por idioma; nunca lleva enlace
  application/ports.ts       ReminderRepository
  application/reminder-use-cases.ts
  infrastructure/drizzle-reminder-repository.ts
  actions.ts                 del panel, todas tras requireSession()
  ui/ReminderQueue.tsx
```

`dueReminders` recibe el día como argumento —igual que `autoAssign` no llama a
`Math.random`—, así que la cola de cualquier fecha es reproducible en una prueba.

## Esquema

```sql
create table reminder_log (
  id uuid primary key default gen_random_uuid(),
  guest_group_id uuid not null references guest_groups(id) on delete cascade,
  kind varchar(16) not null,
  sent_at timestamptz not null default now()
);
```

Es lo único que hace que la cola encoja. No guarda ni un dato personal —el grupo, el
motivo y cuándo—, así que la anonimización de la retención no tiene nada que borrar aquí;
el `cascade` se lo lleva con el grupo.

## Límites por plan

Ninguno. Es barato de calcular y es el corazón de lo que el producto promete. Cerrarlo
tras un plan haría que el plan de entrada vendiera una lista de invitados que no sirve
para lo único que se hace con ella.

## Pruebas

- Dominio: los dos umbrales, el borde exacto de cada uno, la espera de cinco días, el
  grupo revocado y el grupo sin teléfono.
- Repositorio contra Postgres real: que el `cascade` se lleve el registro con el grupo.
- e2e: sembrar un grupo sin contestar a cinco días del cierre, verlo en la cola, marcarlo
  recordado y comprobar que desaparece.
