-- Las rondas de corrección de Gala, como las vende el documento del 30 de octubre: **cuatro**.
-- La tarjeta del plan y las preguntas frecuentes dicen cuatro desde el 21 de octubre, y la tabla
-- comparativa —que lee la base— decía tres: las dos cifras se veían en la misma pantalla.
--
-- Solo mueve la fila si sigue en el valor viejo, así que no pisa lo que el admin haya decidido
-- después, y volver a correrla no hace nada.
update "plans" set "correction_rounds" = 4 where "slug" = 'gala' and "correction_rounds" = 3;
