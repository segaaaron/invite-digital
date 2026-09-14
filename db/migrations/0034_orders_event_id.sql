-- Qué boda salió de este pedido.
--
-- Al aprobar, el pedido crea el evento. Sin esta columna, lo único que decía que la boda
-- se había creado era el estado de un `useActionState` en la pantalla del atelier — y ese
-- estado **se pierde en el mismo instante**: la acción revalida, el pedido deja de estar
-- «por revisar» y el formulario de decisión, que solo se pinta en ese estado, se desmonta
-- con el mensaje dentro. El atelier aprobaba y no llegaba a ver ni el enlace a la boda ni
-- el aviso de la contraseña del cliente.
--
-- `on delete set null`: borrar la boda no puede borrar el registro del pago. Lo que se
-- pierde es el enlace, no el pedido.
alter table "orders" add column if not exists "event_id" uuid;

do $$
begin
  alter table "orders" drop constraint if exists "orders_event_id_fkey";
  alter table "orders" add constraint "orders_event_id_fkey"
    foreign key ("event_id") references "events"("id") on delete set null;
end $$;
