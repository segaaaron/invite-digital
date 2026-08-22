# Distribución de mesas y plano del salón (Ciclo 4, rebanada 1)

## 1. Propósito

El atelier sabe quién viene, pero no dónde se sienta. Hoy eso se resuelve en una hoja
de cálculo que nadie más ve y que el día del evento está desactualizada.

Además, la puerta ya tiene el hueco reservado: la tarjeta verde del check-in muestra
«SU MESA» y hoy no puede rellenarlo porque no existen las mesas. Esta rebanada lo cierra.

Éxito:

- El atelier crea mesas con su cupo y reparte los grupos de invitados entre ellas.
- Ve de un vistazo quién quedó sin mesa y qué mesas están a medias.
- Coloca las mesas y los elementos del salón —pista, barra, mesa de honor— sobre un plano.
- Reparte automáticamente lo que falta, sin deshacer lo ya colocado a mano.
- Imprime el plan para el banquete.
- **La puerta dice el número de mesa** al escanear el pase.

## 2. Alcance

Dentro:

- Tablas `venue_tables` y `venue_zones`.
- Asignación de un grupo de invitados a una mesa.
- Cupo de la mesa frente a cupos confirmados del grupo.
- Plano del salón: posición y tamaño de mesas y zonas, arrastrables.
- Auto-asignación de los grupos sin mesa.
- Reporte para el banquete: comensales confirmados por mesa.
- Buscador «¿dónde se sienta este grupo?».
- Vista imprimible.
- El número de mesa en la tarjeta de la puerta y en el manifiesto.

Fuera:

- Menú o restricción alimenticia por invitado — necesita invitados por persona.
- Sitio concreto dentro de la mesa (silla 3 de la mesa 5).
- Mesas de regalos, mensajes y planes — rebanadas siguientes.

## 3. Modelo de dominio

**La unidad que se sienta es el grupo**, igual que la unidad que se invita. Un grupo con
cuatro cupos ocupa cuatro sitios de una mesa. No se parte un grupo entre dos mesas: si
la familia Rojas no cabe entera, el atelier lo ve y decide, en vez de que el sistema los
separe por su cuenta.

Módulo `src/modules/venue/`:

- **domain/**
  - `venue-table.ts` — `createVenueTable({ id, eventId, label, capacity, shape, x, y })`.
    Cupo entero ≥ 1. `shape` es `'round' | 'rect' | 'sweetheart' | 'imperial'`.
    Posición en porcentaje del plano, `0..100`, para que el plano sea responsivo.
  - `venue-zone.ts` — `createVenueZone({ id, eventId, kind, label, x, y, w, h })`.
    `kind` es `'dance' | 'bar' | 'stage' | 'music' | 'entrance'`.
  - `seating.ts` — reglas de reparto, puras:
    - `occupancyOf(table, groups)` — sitios ocupados y libres.
    - `canSeat(table, group, groups)` — si el grupo cabe entero.
    - `autoAssign(tables, unseated, seated)` — devuelve las asignaciones nuevas.
  - `errors.ts`

- **application/**: `ports.ts`, `add-table.ts`, `update-table.ts`, `remove-table.ts`,
  `assign-group.ts`, `unassign-group.ts`, `auto-assign-groups.ts`, `move-element.ts`,
  `list-seating.ts`, `zone-use-cases.ts`.

- **infrastructure/**: `drizzle-venue-repository.ts`.

### 3.1 Auto-asignación

Determinista, sin azar: dos ejecuciones con los mismos datos dan el mismo resultado.

1. Solo toca grupos sin mesa. **Nunca mueve lo que un humano colocó.**
2. Ordena los grupos de más cupos a menos; a igualdad, por etiqueta alfabética.
3. A cada grupo le da la mesa donde quepa entero **dejando el menor hueco**. A igualdad,
   la mesa de etiqueta menor.
4. Un grupo que no cabe en ninguna se queda sin mesa y se informa. No se parte.

Primero los grupos grandes porque son los que se quedan sin sitio si se llena el salón
con parejas sueltas.

## 4. Esquema Postgres

Migración `db/migrations/0004_venue.sql`.

```sql
CREATE TABLE venue_tables (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id  uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label     varchar(80) NOT NULL,
  capacity  integer NOT NULL CHECK (capacity >= 1),
  shape     varchar(16) NOT NULL DEFAULT 'round',
  x         numeric(5,2) NOT NULL DEFAULT 50,
  y         numeric(5,2) NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX venue_tables_event_idx ON venue_tables (event_id);
CREATE UNIQUE INDEX venue_tables_label_unique ON venue_tables (event_id, label);

CREATE TABLE venue_zones (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  kind     varchar(16) NOT NULL,
  label    varchar(80) NOT NULL,
  x        numeric(5,2) NOT NULL,
  y        numeric(5,2) NOT NULL,
  w        numeric(5,2) NOT NULL,
  h        numeric(5,2) NOT NULL
);
CREATE INDEX venue_zones_event_idx ON venue_zones (event_id);

ALTER TABLE guest_groups
  ADD COLUMN table_id uuid REFERENCES venue_tables(id) ON DELETE SET NULL;
CREATE INDEX guest_groups_table_idx ON guest_groups (table_id);
```

`ON DELETE SET NULL` en `table_id`: borrar una mesa deja a sus grupos sin mesa, no los
borra. Perder invitados por eliminar una mesa sería catastrófico y silencioso.

La etiqueta es única por evento: dos «Mesa 03» en el mismo salón es un error de captura,
y la puerta canta ese número en voz alta.

Las posiciones son porcentajes con dos decimales, no píxeles: el plano se ve en un
portátil y en una tablet, y los píxeles de uno no significan nada en el otro.

## 5. Rutas

| Ruta | Grupo | Quién |
|---|---|---|
| `/panel/eventos/[slug]/mesas` | `(panel)` | Atelier con sesión |
| `/panel/eventos/[slug]/mesas/imprimir` | `(panel)` | Atelier con sesión |

Server Actions en `src/modules/venue/actions.ts`, todas abriendo con `requireSession()`.

### 5.1 Guardado del plano

El plano **no guarda solo**. Arrastrar mueve la marca en local y nada más; los cambios se
persisten con un botón **«Guardar cambios»**, acompañado de **«Descartar»** y de un
contador de cuántos elementos están movidos sin guardar.

Un plano se toquetea mucho antes de quedar bien. Guardar cada gesto convierte cada duda
en una escritura y deja al atelier sin forma de volver atrás; y guardar por fotograma de
arrastre son miles de escrituras por cada mesa que alguien mueve.

Salir con cambios pendientes avisa, en dos niveles:

- **Dentro de la aplicación** —otra sección del panel, cambiar de vista, «Volver»— un
  modal propio con tres salidas: guardar, descartar o cancelar. Modal propio y no
  `window.confirm`: los diálogos nativos no se pueden estilar, bloquean el hilo y quedan
  fuera del idioma visual del panel.
- **Cerrar la pestaña o recargar** — `beforeunload`, que es lo único que el navegador
  permite ahí. El texto lo pone el navegador. Se registra solo mientras haya cambios
  pendientes y se quita al guardar: si no, el aviso salta en cada recarga aunque no se
  deba nada, y el atelier aprende a ignorarlo justo antes del día que sí importaba.

Guardar manda **un solo lote** con todas las posiciones cambiadas, no una llamada por
mesa.

## 6. Integración con la puerta

`DoorManifestGroup` gana `tableLabel: string | null`. La tarjeta verde muestra el número
de mesa cuando existe, y «Mesa por asignar» cuando no.

El manifiesto se precarga al abrir la puerta, así que la mesa también funciona sin red.
Reasignar una mesa con la puerta ya abierta no se refleja hasta recargar: es aceptable —
las mesas se cierran antes de que llegue el primer invitado.

## 7. Seguridad y reglas

- Toda Server Action abre con `requireSession()`.
- Mesa y grupo deben pertenecer al mismo evento; asignar entre eventos se rechaza.
- Ningún hexadecimal fuera de `tokens.css`. Los estados del plano reutilizan
  `--color-ok`, `--color-warn` y `--color-danger`, ya existentes.
- Arrastrar respeta `prefers-reduced-motion`: sin transición durante el arrastre.
- El plano es accesible por teclado: seleccionar una mesa y moverla con las flechas.
  Un plano solo arrastrable deja fuera a quien no usa ratón.

## 8. Errores

| Situación | Respuesta |
|---|---|
| Cupo menor que 1 | Rechazado en dominio |
| Etiqueta duplicada en el evento | `duplicate_label`, mensaje claro en el formulario |
| Grupo que no cabe entero | `does_not_fit`, con cuántos sitios faltan |
| Mesa de otro evento | `wrong_event` |
| Borrar mesa con grupos | Permitido; los grupos quedan sin mesa y se avisa cuántos |
| Auto-asignar sin sitio para todos | Asigna lo que puede e informa de los que quedaron fuera |
| Posición fuera de `0..100` | Se recorta al rango, no se rechaza |

## 9. Pruebas

- **Dominio, sin dobles:** cupos en los bordes; `canSeat` con la mesa justa, una de menos
  y una de más; `autoAssign` determinista —dos ejecuciones idénticas—, que no toca lo
  colocado a mano, que prioriza grupos grandes, y que informa de los que no caben.
- **Aplicación con repositorios falsos:** mesa de otro evento, etiqueta duplicada, borrar
  mesa deja grupos sin mesa.
- **Infraestructura contra Postgres real:** el índice único de etiqueta corta de verdad,
  y borrar una mesa pone `table_id` a null en vez de borrar el grupo.
- **UI:** asignar y quitar, el contador de ocupación, el buscador, el aviso de sin mesa.
- **Integración con la puerta:** el manifiesto trae `tableLabel` y la tarjeta lo muestra.
- **e2e:** crear mesa, asignar grupo, auto-asignar el resto, y comprobar que la puerta
  canta el número de mesa al escanear.

## 10. Decisiones tomadas

| Tema | Decisión | Coste si es errónea |
|---|---|---|
| Unidad que se sienta | El grupo, no la persona | Reabre el motor de RSVP; se evita a propósito |
| Grupo partido entre mesas | No se parte nunca | Permitirlo después es aditivo |
| Auto-asignación | Determinista, solo sobre lo no asignado | Cambiar una función pura |
| Posiciones | Porcentaje, no píxeles | Ninguno; es lo que hace el plano responsivo |
| Borrar mesa | Deja los grupos sin mesa | Ninguno; el lado conservador |
| Guardado del plano | Explícito, con botón y aviso al salir | Ninguno; volver al guardado automático es aditivo |
| Escritura durante el arrastre | Nunca | Ninguno |
| Menú por invitado | Fuera: necesita invitados por persona | Rebanada aparte cuando exista ese modelo |
