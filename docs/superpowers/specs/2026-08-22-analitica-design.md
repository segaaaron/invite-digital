# Analítica de la invitación — Diseño

**Ciclo 5, rebanada 1.** Cierra tres huecos que la maqueta enseña y la aplicación no
puede pintar: la cifra **visitas a la invitación** del resumen, y los paneles
**dispositivos** y **fuentes de tráfico** de estadísticas.

## 1. El problema

`Dashboard.html` promete «847 visitas · ↑124 hoy», un desglose por dispositivo y otro por
fuente. Hoy no se registra ni una visita: la invitación se abre y no queda rastro. Sin
eso, el atelier no sabe si el enlace llegó —un grupo que no responde puede no haber
abierto nunca la invitación, que es una llamada distinta de la que hay que hacerle a
quien la abrió tres veces y no confirmó.

## 2. Qué se registra, y qué no

Una fila por visita, con **cuatro** datos:

| Campo | Valor | Por qué |
|---|---|---|
| `event_id` | evento | Para contar por evento |
| `guest_group_id` | grupo o `NULL` | La vista del cliente (`/compartir`) no es de ningún grupo |
| `device` | `mobile` · `tablet` · `desktop` | Es lo que la maqueta enseña |
| `source` | `whatsapp` · `qr` · `direct` · `other` | Ídem |
| `viewed_at` | marca de tiempo | Para el «hoy» y para la retención |

**No se guarda**: dirección IP, cadena de agente de usuario, identificador de navegador,
ni nada que persiga a una persona entre eventos. El dispositivo y la fuente se resuelven
**en el servidor** y se guardan ya categorizados: lo que no se escribe no se filtra.

Un invitado que abre su invitación cinco veces produce cinco filas. Es lo que quiere
saber el atelier —quién insiste sin confirmar— y es también el motivo de que la retención
las borre con el evento.

## 3. Cómo se registra

La página del invitado es un Server Component que **no** escribe: renderizar no puede
tener efectos. Monta un componente cliente diminuto que llama a una Server Action
`recordInvitationViewAction` una sola vez por pestaña, guardando la marca en
`sessionStorage`.

- **Una vez por pestaña, no por render.** Sin el guardo, cada navegación interna sumaría
  una visita y el contador diría cinco donde hubo una.
- **La acción se autoriza por token**, con el mismo `resolveByToken` del RSVP, y vive en
  el bloque de acciones del invitado. Un token desconocido no escribe y responde 404.
- **El fallo es silencioso a propósito, y solo aquí.** Si el registro falla, el invitado
  no se entera: está mirando una invitación, no un panel. Es la única excepción a la regla
  de que ninguna acción falla en silencio, y se escribe en el registro del servidor.

`device` sale de las *client hints* y del agente de usuario en la cabecera de la petición,
categorizado en el servidor. `source` sale del parámetro `utm_source` cuando existe y del
`Referer` cuando no; sin ninguno de los dos es `direct`.

## 4. Qué se enseña

- **Resumen**: `StatCard` «Visitas a la invitación» con el total y el detalle «↑ N hoy».
- **Estadísticas**: panel **Dispositivos** y panel **Fuentes de tráfico**, cada uno con su
  barra por categoría y su porcentaje sobre el total.
- Con cero visitas se dice «Todavía nadie ha abierto la invitación», no un 0 %: un cero
  con porcentajes se lee como que nadie contesta, y es distinto de que nadie haya mirado.

## 5. Retención

Las visitas de un evento vencido se **borran**, no se anonimizan: ya no identifican a
nadie, pero tampoco sirven de nada sin el evento, y son la tabla que más crece. Entra en
`maintenance` junto al resto.

## 6. Decisiones y su coste si son erróneas

| Decisión | Si es errónea |
|---|---|
| Guardar categorías, no agente de usuario | Perdemos detalle fino de navegador. A cambio, una fuga de esta tabla no dice nada de nadie. |
| Una fila por visita, no un contador | La tabla crece. A cambio se puede contar «hoy», que es lo que la maqueta enseña. |
| Registrar desde el cliente | Un bloqueador puede impedirlo y el conteo queda bajo. Registrar en el render haría que un rastreador de enlaces contase visitas que nadie vio. |
| Fallo silencioso en esta acción | Si el registro se rompe, el contador miente sin avisar. Se acepta: la alternativa es enseñarle un error a un invitado que solo quería ver la invitación. |
