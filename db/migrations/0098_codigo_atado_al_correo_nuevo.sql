-- El código del cambio de correo queda atado a la dirección nueva (20 oct, hallazgo F12 del escaneo).
--
-- Hasta hoy «Cambiar el correo» pedía el código al correo **actual** y escribía el nuevo sin pedir ninguna prueba de
-- que esa dirección es tuya: alguien con cualquier cuenta podía ponerse el correo de una persona que iba a comprar y,
-- cuando el admin aprobaba ese pedido, heredaba el acceso a su evento —lista de invitados, teléfonos, notas de salud—.
-- Ahora el código se emite **para** una dirección, viaja a ella, y el cambio solo se aplica si coinciden.
-- `null` = código normal (recuperar la contraseña, cerrar sesiones), que no sirve para cambiar el correo.
-- Se puede aplicar dos veces.
alter table "password_resets" add column if not exists "pending_email" citext;
