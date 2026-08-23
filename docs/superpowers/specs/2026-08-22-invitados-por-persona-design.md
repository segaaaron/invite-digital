# Invitados por persona — Diseño

**Ciclo 5, rebanada 2.** De aquí salen tres cosas que la maqueta enseña y la aplicación
no puede: la tabla de invitados por persona, las chips **Tal vez** y **VIP**, y el
**reporte de menús para el catering**.

## 1. El problema

`Dashboard.html` lista **personas**: Nombre · Grupo · RSVP · Acompañantes · Restricciones
· Mesa · Enviado · Confirmado. La aplicación modela **grupos con cupos**: «Familia Rojas
Peña, 4 cupos, confirmaron 4». Nadie sabe quiénes son esos cuatro, y por eso no hay
restricciones alimentarias, ni menús para el catering, ni una fila por invitado.

## 2. La decisión de fondo: aditivo, no sustitutivo

Las personas **cuelgan del grupo**; el grupo no desaparece.

```
guest_groups (1) ──< guest_people (N)
```

- El enlace, el token, el RSVP agregado, la mesa y el pase de la puerta **siguen siendo
  del grupo**. Nada de lo construido —puerta sin red, mesas, regalos, libro de firmas— se
  toca.
- Un grupo puede tener **cero** personas cargadas: es el estado de hoy y sigue siendo
  válido. La tabla enseña entonces la fila del grupo, como hasta ahora.
- Las personas son **opcionales y aditivas**: quien las carga gana nombres, restricciones
  y menús; quien no, no pierde nada.

Sustituir grupos por personas habría obligado a rehacer RSVP, mesas y puerta —y a migrar
los datos de todos los eventos vivos— para llegar al mismo sitio.

## 3. Qué guarda una persona

| Campo | Tipo | Notas |
|---|---|---|
| `full_name` | texto | Obligatorio |
| `is_companion` | booleano | «+1» sin nombre propio; la maqueta los cuenta aparte |
| `dietary_note` | texto o nulo | Restricción alimentaria, en palabras del invitado |
| `vip` | booleano | La chip VIP de la maqueta |
| `attending` | `yes` · `no` · `maybe` · nulo | Nulo es **pendiente**; `maybe` es la chip «Tal vez» |
| `seat_of_group` | — | No existe: la mesa es del grupo y se lee de ahí |

**Los cupos del grupo siguen mandando.** Cargar cinco personas en un grupo de cuatro
cupos es un error del atelier y se rechaza en el caso de uso: el cupo es lo que se
prometió al invitado y lo que la puerta cuenta.

## 4. Qué cambia en la pantalla

- **Invitados**: la tabla pasa a listar personas cuando el grupo las tiene, con las
  columnas de la maqueta. Las chips ganan **Tal vez** y **VIP**, que hoy no tienen dato.
- **Un grupo sin personas** se sigue viendo como una fila de grupo. No se inventan
  nombres.
- **Mesas**: panel **Reporte de menús para el catering**, agrupado por restricción, con el
  número de comensales de cada una. Sin restricciones cargadas dice que no hay ninguna, no
  una tabla vacía.
- **CSV**: exporta personas cuando las hay, con sus restricciones.

## 5. Qué NO entra en esta rebanada

- El RSVP por persona desde la invitación. El invitado sigue confirmando cupos; marcar
  quién viene, uno a uno, es la rebanada siguiente.
- La columna **Enviado**, que pertenece al ciclo de canales de envío.

## 6. Decisiones y su coste si son erróneas

| Decisión | Si es errónea |
|---|---|
| Personas colgando del grupo, no en su lugar | Dos conceptos donde la maqueta enseña uno. A cambio, nada de lo construido se rompe y ningún evento vivo necesita migración |
| Cupos del grupo como tope | El atelier no puede cargar más personas que cupos sin subir el cupo. Es intencionado: el cupo es lo prometido |
| `attending` en la persona, aparte del RSVP del grupo | Dos verdades que se pueden contradecir. La del grupo manda para la puerta y los contadores; la de la persona es para el catering y el protocolo |
| `maybe` como estado | Un «tal vez» eterno ensucia la lista. A cambio, la maqueta lo pide y la realidad de una boda lo tiene |
