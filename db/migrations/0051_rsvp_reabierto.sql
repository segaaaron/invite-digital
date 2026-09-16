-- Se confirma una sola vez: el enlace acaba en el chat de toda la familia y, con el formulario
-- siempre abierto, cualquiera podría cambiar lo que dijeron los demás. Corregir se pide al
-- atelier, que reabre esa respuesta desde el panel; la marca solo vale para la siguiente.
alter table "guest_groups" add column if not exists "rsvp_reopened_at" timestamptz;
