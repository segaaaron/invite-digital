# Personal de puerta y el check-in que una boda necesita

Fecha: 25 de agosto de 2026 · Estado: aprobado, en construcción

## 1. El rol de puerta

### Por qué el rol solo no basta

Una persona de puerta trabaja **una boda, una noche**. Un rol global «seguridad» le daría
el check-in de *todos* los eventos del atelier, con las listas de invitados de bodas que
no son la suya. Hace falta una **pertenencia**, no solo un rol:

```sql
create table event_staff (
  event_id uuid not null references events(id) on delete cascade,
  user_id  uuid not null references users(id)  on delete cascade,
  primary key (event_id, user_id)
);
```

`CASCADE` en los dos lados, y aquí sí: la pertenencia **no es un dato**, es un permiso.
Borrado el evento o el usuario, el permiso no significa nada. Lo que nunca se borra en
cascada son los datos —los eventos de un usuario, que van con `RESTRICT`—.

### Quién los da de alta

**El dueño del evento**, no solo el admin. Es quien contrata a su gente y quien sabe
quién estará esa noche en la puerta. El admin también puede, porque puede todo.

### Qué ve

Solo el check-in de los eventos donde es personal. Ni la lista de invitados, ni mesas, ni
regalos, ni mensajes, ni la bandeja de eventos.

**El corte va en la firma, como el de multitenencia.** `events.getFor(actor, slug)` pasa a
recibir la sección:

```ts
events.getFor(actor, slug)                        // sección 'full' por omisión
events.getFor(actor, slug, { section: 'checkin' }) // lo único que abre a un puerta
```

Una página nueva que no diga su sección hereda `full`, y `full` deniega a un puerta. **El
olvido cae del lado seguro**, que es la única forma de que una regla de permisos sobreviva
a la siguiente sesión. Lo mismo para `requireEventAccess` en las Server Actions.

### Lo que NO se construye

Un enlace de puerta sin cuenta, con la forma de `client_shares`. Es la alternativa para
personal contratado una noche, y sigue siendo la salida barata si la cuenta resulta ser
demasiada fricción. El spec del check-in ya lo tenía anotado como decisión reversible.

## 2. Los cuatro huecos del check-in

Salen de mirar qué pasa de verdad en la puerta de una boda.

### 2.1. La familia llega partida — y es lo normal, no la excepción

El padre a las 19:40; los hijos a las 20:20, con el mismo QR. Hoy el segundo escaneo pinta
ámbar, dice «Ya había ingresado» y **solo ofrece Cerrar**: la mitad de la familia se queda
sin registrar y el número del catering no cuadra.

`already` deja de ser un aviso y pasa a ser un estado de trabajo: enseña cuántos hay
registrados y permite **sumar** los que acaban de llegar. Sigue el mismo camino
append-only —una fila más con su `scan_id`—, así que la conciliación sin conexión no
cambia.

### 2.2. El acompañante que no estaba invitado

Pasa en todas las bodas. Se registra contra el grupo con el que llega, marcado como
**no listado**, para que el total del catering cuadre y la pareja sepa después qué pasó.

### 2.3. La tarjeta dice la etiqueta, no el nombre

«Familia Rojas Peña» es lo que el atelier escribió; «Valentina Ruiz y 2 acompañantes» es
lo que la persona de la puerta puede cotejar con quien tiene delante. Desde que existen
invitados por persona se puede decir el nombre de quien encabeza el grupo.

Sin personas cargadas, cae a la etiqueta: un grupo sin personas es válido y es el estado
de todos los eventos anteriores a esa tabla.

### 2.4. Confirmar, pero solo al teclear

| Camino | Confirma | Por qué |
|---|---|---|
| Cámara | **No** | El escaneo ya es el acto intencionado y el código es inequívoco. Con ciento veinte invitados en veinte minutos, un toque más por invitado es una fila en la puerta. Registra y ofrece deshacer. |
| Código manual | **Sí** | Ahí sí se teclea mal: poca luz, prisa, códigos parecidos. Ver el nombre antes de registrar es lo que evita dar entrada al grupo equivocado. |

Es un matiz de la decisión original del spec del check-in —«no hay confirmación»—, no un
cambio de rumbo: se mantiene donde la velocidad manda y se añade donde el error es
plausible.

## 3. Pruebas

- Dominio: `canAccessEvent` con la sección; un puerta abre `checkin` de su evento y nada
  más; sumar llegadas a un grupo ya registrado; el nombre a enseñar con y sin personas.
- Repositorio contra Postgres real: el `CASCADE` de `event_staff` por los dos lados.
- e2e: un usuario de puerta entra, ve el check-in, y recibe **404** en invitados, mesas,
  regalos y en la bandeja de eventos. Y el dueño lo da de alta desde su evento.
