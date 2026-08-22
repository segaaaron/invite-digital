# Plan del evento y sus límites (Ciclo 4, rebanada 4)

## 1. Propósito

El sitio de marketing vende tres planes desde el ciclo 1 —atelier, firma-3d y
alta-costura— con sus precios en la base. Pero **un evento no está atado a ningún plan**,
y por tanto los planes no significan nada: quien compra el más barato tiene exactamente lo
mismo que quien compra el más caro.

Esta rebanada convierte el plan en algo que se puede cumplir.

Éxito:

- Cada evento tiene su plan, visible en el panel.
- Los límites del plan **se aplican de verdad**: pasarse de invitados no es posible.
- El atelier ve cuánto margen le queda antes del límite, antes de chocar con él.
- Cuando un cliente quiere más, queda registrada una solicitud de cambio.

## 2. Lo que NO es esta rebanada

**No hay cobro en línea.** No existe pasarela de pago, los datos de transferencia y el QR
siguen pendientes del usuario, y nada de eso se construye aquí. Un cambio de plan queda
como una **solicitud** que el atelier resuelve fuera del sistema y luego aplica a mano.

Tampoco es una suscripción. Una boda ocurre una vez y se paga una vez: no hay ciclo
mensual ni anual, aunque la maqueta lo dibujara. El precio del plan es el precio del
evento.

Fuera también: facturación, impuestos, recibos y panel de administración —eso es el
Plan B, con spec propio.

## 3. Qué limita un plan

Se añaden columnas a `plans`, que hoy solo tiene precio y orden:

| Columna | Significado |
|---|---|
| `max_guest_groups` | Cuántos grupos de invitados admite. `NULL` = sin límite |
| `includes_seating` | Si el evento puede usar mesas y plano del salón |
| `includes_registry` | Si puede usar mesa de regalos y fondos |
| `includes_checkin` | Si puede usar el modo puerta |

Los límites viven **en la base, no en el código**. Cambiar lo que incluye un plan es una
decisión comercial y no debería exigir un despliegue.

`events.plan_id` apunta al plan, anulable. Un evento sin plan se trata como el plan más
barato activo: los eventos creados antes de esta rebanada no pueden quedar en un limbo
donde todo esté prohibido.

## 4. Dónde se aplica el límite

Aquí está el riesgo de la rebanada: **la comprobación toca código ya cerrado**.

| Límite | Dónde se comprueba |
|---|---|
| `max_guest_groups` | `addGuestGroup`, en `src/modules/guests/application/` |
| `includes_seating` | Las páginas y acciones de `venue` |
| `includes_registry` | Las páginas y acciones de `registry` |
| `includes_checkin` | La página y las acciones de `checkin` |

Regla: **el módulo que aplica el límite no importa el módulo de planes.** Recibe la
capacidad ya resuelta como argumento. Si `guests` importara `plans`, dos módulos que hoy
son independientes quedarían atados para siempre por una regla comercial.

`src/modules/plans/domain/allowance.ts`, puro:

- `canAddGroup(limit: number | null, current: number): boolean`
- `remainingGroups(limit, current): number | null`
- `hasFeature(plan, feature): boolean`

Y el caso de uso `getEventAllowance(eventId)` devuelve la capacidad resuelta, que las
acciones de los otros módulos reciben.

## 5. Aviso antes del choque

Chocar contra un límite sin haberlo visto venir es la peor forma de descubrirlo. El panel
avisa **antes**:

- Con margen amplio, nada.
- Al **80 %** del límite, un aviso discreto con cuántos quedan.
- Al llegar, el formulario de alta se deshabilita y explica por qué, con el enlace a
  solicitar el cambio de plan.

El límite se aplica igual en el servidor aunque el formulario esté deshabilitado: la
acción es un extremo HTTP público y desactivar un botón no protege nada.

## 6. Solicitud de cambio

```sql
CREATE TABLE plan_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  requested_plan_id uuid NOT NULL REFERENCES plans(id),
  note text,
  status varchar(16) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE UNIQUE INDEX plan_change_pending_idx
  ON plan_change_requests (event_id) WHERE status = 'pending';
```

El índice único parcial: **una sola solicitud pendiente por evento**. Sin él, pulsar dos
veces genera dos solicitudes y el atelier no sabe a cuál hacer caso.

`status` es `'pending' | 'applied' | 'rejected'`. Aplicarla cambia `events.plan_id` y
marca la solicitud, en la **misma transacción**: si se aplica el plan y falla el marcado,
la solicitud queda pendiente para siempre sobre un evento que ya cambió.

## 7. Esquema

Migración `db/migrations/0008_plan_limits.sql`:

```sql
ALTER TABLE plans
  ADD COLUMN max_guest_groups integer,
  ADD COLUMN includes_seating  boolean NOT NULL DEFAULT true,
  ADD COLUMN includes_registry boolean NOT NULL DEFAULT true,
  ADD COLUMN includes_checkin  boolean NOT NULL DEFAULT true;

ALTER TABLE events
  ADD COLUMN plan_id uuid REFERENCES plans(id) ON DELETE SET NULL;
```

Los tres `includes_*` entran con `DEFAULT true` a propósito: la migración **no puede
quitarle nada a un evento que ya existe**. Restringir es una decisión comercial posterior,
que se hace con datos, no con un `ALTER TABLE`.

El seed asigna los límites reales a los tres planes existentes. Es idempotente, como el
resto del seed.

## 8. Errores

| Situación | Respuesta |
|---|---|
| Añadir un grupo pasado el límite | `plan_limit_reached`, con el límite y el actual |
| Usar una función no incluida | `feature_not_included`, con el nombre del plan que sí la trae |
| Segunda solicitud pendiente | `request_already_pending` |
| Solicitar el plan que ya se tiene | `same_plan` |
| Aplicar una solicitud ya resuelta | `already_resolved` |
| Evento sin plan | Se trata como el plan más barato activo, sin error |

## 9. Pruebas

- **Dominio:** `canAddGroup` con límite nulo, justo debajo, justo en el límite y por
  encima; `remainingGroups` con nulo; `hasFeature` con las cuatro banderas.
- **Aplicación:** añadir el grupo que hace tope funciona y el siguiente falla; un evento
  sin plan usa el más barato; solicitar dos veces da `request_already_pending`; aplicar
  cambia el plan y marca la solicitud.
- **Infraestructura contra Postgres real:** el índice único parcial **corta de verdad** —
  dos solicitudes pendientes fallan, pero una pendiente y otra ya aplicada conviven;
  aplicar es transaccional.
- **Regresión, la que importa:** las **604 pruebas anteriores siguen verdes**. Esta
  rebanada toca `addGuestGroup`, que lleva cerrado desde la rebanada 1.
- **UI:** el aviso aparece al 80 % y no antes; al llegar al límite el formulario se
  deshabilita y explica por qué; una función no incluida se ve bloqueada con el plan que
  la trae.
- **e2e:** con un plan de dos grupos, crear dos funciona y el tercero se rechaza **también
  llamando a la acción directamente**, no solo por el botón deshabilitado.

## 10. Decisiones tomadas

| Tema | Decisión | Coste si es errónea |
|---|---|---|
| Dónde viven los límites | En la base, no en el código | Ninguno; cambiarlos no exige desplegar |
| Cobro | Fuera; solicitud manual | Plan B, spec propio |
| Suscripción | No existe: un evento se paga una vez | Añadir ciclos sería otro modelo |
| Evento sin plan | El más barato activo | Ninguno; evita el limbo |
| Acoplamiento | Los módulos reciben la capacidad, no importan planes | Ninguno; los mantiene independientes |
| Migración | `includes_*` en `true` | Ninguno; no quita nada a lo existente |
| Solicitudes | Una pendiente por evento, índice único parcial | Ninguno |
| Aplicar cambio | Transaccional | Ninguno; el lado correcto |
