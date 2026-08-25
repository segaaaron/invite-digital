# Multitenencia y administración

Fecha: 25 de agosto de 2026 · Estado: aprobado, en construcción

## El hallazgo que lo motiva

`events` **no tiene dueño** y `users` **no tiene rol**. `requireSession()` comprueba que
hay sesión, no de quién, y `events.list()` devuelve todos los eventos de la base.

Con dos usuarios dados de alta, cada uno ve y edita las bodas del otro: invitados, mesas,
regalos, mensajes y pedidos. No es una funcionalidad que falte; es una separación que
nunca existió, y lleva ahí desde el ciclo 1 porque hasta hoy solo había un usuario.

Así que esto no es «añadir una sección de admin». Es construir la multitenencia y poner el
admin encima.

## El modelo

```sql
alter table users  add column role varchar(16) not null default 'atelier';
alter table events add column user_id uuid references users(id) on delete restrict;
```

**`ON DELETE RESTRICT`, nunca `CASCADE`.** Borrar un usuario no puede llevarse por delante
las bodas que gestiona. El admin reasigna o borra los eventos primero, y la pantalla lo
dice con el número. Es la misma regla que ya rige `guest_groups.table_id`.

La migración además:

- asigna los eventos huérfanos al usuario **más antiguo**, y
- le pone `role = 'admin'`, para que el sistema no se quede sin ninguno.

Sin ese segundo paso, la migración deja una base donde nadie puede administrar nada y la
única salida es SQL a mano.

## La autorización

El problema real no es la regla —«el evento es tuyo o eres admin»— sino **aplicarla en los
sesenta sitios que la necesitan sin que se olvide ninguno**.

### En las páginas: la firma obliga

`events.getBySlug(slug)` desaparece. En su lugar:

```ts
events.getFor(actor, slug): Promise<Result<Event, EventError>>
```

Una página que no pase el actor **no compila**. Es el mismo recurso que ya usan las
capacidades del plan: no se confía en que alguien se acuerde, se hace imposible olvidarlo.

Cuando el evento existe pero no es del actor, el resultado es **`not_found`** —404, nunca
403—, igual que un token de invitado desconocido. Un 403 confirmaría que ese `slug` existe.

### En las Server Actions: una guardia que revienta

Cada acción del panel recibe `eventId` o `eventSlug` de un formulario. Tras
`requireSession()` va:

```ts
await requireEventAccess({ eventSlug })
```

y **lanza** si el evento no es del actor. No devuelve un estado de error, y es a propósito:
un usuario legítimo no puede llegar ahí desde ninguna pantalla, así que meter un mensaje
de «esto no es tuyo» en cincuenta y cuatro formularios sería mantener texto para un estado
inalcanzable. Lo que importa es que **no se escribe nada**, y eso lo garantiza el lanzar.

### Y una prueba de que no falta ninguna

`pnpm verify:tenancy` recorre cada `actions.ts`, busca las funciones exportadas que llaman
a `requireSession()` y exige que cada una llame también a `requireEventAccess`, o que esté
en una lista de excepciones **con su motivo escrito**. Una acción nueva sin guardia deja
el comando en rojo.

Es el mismo razonamiento que `verify:boundaries`: una regla que solo vive en la cabeza de
quien la escribió se pierde en la siguiente sesión.

### Lo que no se toca

Las rutas del invitado —`/i/[token]`, `/compartir/[token]`— y las acciones públicas del
Plan B y de la mesa de regalos. Se autorizan por token o son públicas por diseño, y no
tienen sesión de la que sacar un actor.

## El admin

Vive en `/panel/admin`, tras `requireAdmin()`. La sección **ADMINISTRACIÓN** de la barra
solo se pinta para un admin: un usuario normal no ve ni el rótulo.

| Ruta | Qué hace |
|---|---|
| `/panel/admin` | Métricas: eventos por mes, reparto por plan, invitados totales, pedidos aprobados |
| `/panel/admin/usuarios` | Alta con contraseña inicial, cambio de rol, borrado |
| `/panel/admin/eventos` | Todos los eventos con dueño y plan; crear para un usuario, reasignar, cambiar plan, borrar |
| `/panel/admin/auditoria` | Quién hizo qué y cuándo |

El admin **entra en cualquier evento y trabaja dentro** como si fuera suyo. Es lo que hace
falta para dar soporte: «no me carga la lista» se resuelve mirando, no pidiendo capturas.
Por eso mismo existe la auditoría.

### Reglas del admin que no son negociables

- **Un admin no se quita a sí mismo el rol**, y no se puede borrar al último admin. Las
  dos cosas dejan el sistema sin nadie que administre y sin forma de arreglarlo desde la
  aplicación.
- **Un usuario con eventos no se borra.** Se dice cuántos tiene y se pide reasignarlos.
- **La contraseña inicial se enseña una sola vez**, como los enlaces de invitado: se
  guarda su argon2, no ella.

## La auditoría

```sql
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  actor_email varchar(160) not null,
  action varchar(48) not null,
  subject varchar(160),
  detail text,
  created_at timestamptz not null default now()
);
```

`actor_user_id` con **`SET NULL`** y `actor_email` como **texto copiado**: borrar al admin
no puede borrar el rastro de lo que hizo. Un registro de auditoría que desaparece con su
autor no es un registro de auditoría.

Se anota: crear, borrar y reasignar eventos; crear, borrar y cambiar de rol a usuarios;
cambiar el plan de un evento. **No** se anota cada lectura: eso sería un rastro de
navegación del atelier, y lo que no se escribe no se filtra.

## Pruebas

- Dominio: `canAccessEvent(actor, event)` con las cuatro combinaciones, y las reglas del
  último admin y del usuario con eventos.
- Repositorio contra Postgres real: el `RESTRICT` al borrar un usuario con eventos.
- e2e con **dos usuarios de verdad**: A no ve el evento de B —404, no 403—, el admin sí, la
  sección del admin no existe para A, y **una Server Action llamada a mano con el evento de
  otro no escribe nada**. Esto último es lo que de verdad hay que demostrar: lo demás lo
  tapa la interfaz.
- `pnpm verify:tenancy` como parte de la puerta previa.
