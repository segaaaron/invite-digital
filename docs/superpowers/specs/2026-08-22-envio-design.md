# Canales de envío — Diseño

**Ciclo 3, rebanada 2**, la que quedaba sin escribir. Cierra «Enviar invitaciones» de la
maqueta y hace que la columna «Enviado» se marque sola cuando el reparto ocurre de verdad.

## 1. El problema

El enlace de un grupo se enseña **una sola vez**, al crearlo: en la base solo queda su
hash. Si el atelier lo pierde, o el invitado nunca lo recibió, hoy no hay forma de volver
a mandarlo. Y repartir cincuenta invitaciones significa crear cincuenta grupos a mano.

## 2. Reenviar es rotar

No se puede «volver a enseñar» un enlace que no existe. Reenviar **acuña un token nuevo**
y deja el anterior inservible.

- Es lo correcto, no un apaño: si el enlace se perdió, pudo acabar en cualquier parte.
  Rotarlo cierra esa puerta.
- **Se avisa antes de hacerlo.** Quien ya tenía el enlace viejo —el propio invitado— deja
  de poder abrirlo, y eso hay que decirlo con esas palabras.
- El RSVP, la mesa y el pase de la puerta **no se tocan**: son del grupo, no del token.

## 3. Los tres caminos de reparto

| Camino | Qué hace |
|---|---|
| **Copiar** | Copia el enlace al portapapeles y marca el grupo como enviado |
| **WhatsApp** | Abre WhatsApp con el mensaje del evento y el enlace ya escritos. Si el grupo tiene teléfono, va directo a ese número |
| **QR** | Descarga el código del enlace, para imprimirlo o pegarlo en una tarjeta |

Ninguno de los tres puede prometer entrega: WhatsApp no avisa de vuelta. Los tres marcan
«enviado», que es lo que el atelier sabe de verdad — que repartió.

## 4. Plantilla del mensaje

Por evento, con dos marcas que se sustituyen: `{grupo}` y `{enlace}`. Sin plantilla se usa
una por defecto en el idioma del evento. La plantilla **nunca** se guarda con el enlace
dentro: el enlace se pega al abrir WhatsApp, no en la base.

## 5. Importación masiva

Un CSV de `etiqueta;cupos;teléfono` crea los grupos de golpe. Devuelve una **tabla de
resultado, fila por fila**: creada, rechazada y por qué. Nunca un «se importaron 37 de
50» sin decir cuáles fallaron, que obliga a comparar dos listas a mano.

- El tope del plan se aplica **por fila**: al llegar al límite, las siguientes se rechazan
  con su motivo, y las anteriores quedan creadas. Deshacerlo todo por la fila 38 sería
  peor.
- Los enlaces recién creados se enseñan una sola vez, en esa misma tabla.

## 6. Teléfono del grupo

Columna opcional. Es un dato personal del invitado: entra en la anonimización de la
retención, como la etiqueta.

## 7. Decisiones y su coste si son erróneas

| Decisión | Si es errónea |
|---|---|
| Reenviar rota el token | El invitado que tenía el viejo se queda fuera y hay que avisarle. A cambio, un enlace perdido deja de valer |
| Marcar «enviado» al repartir, sin prometer entrega | El atelier no sabe si llegó. Nadie lo sabe: ningún canal avisa de vuelta |
| Importar fila a fila, sin transacción global | Una importación puede quedar a medias. A cambio, se dice exactamente qué entró y qué no |
| Teléfono opcional | Sin él, WhatsApp abre sin destinatario y hay que elegirlo a mano. Exigirlo bloquearía a quien reparte en persona |
