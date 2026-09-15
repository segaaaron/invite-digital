-- Un solo pedido abierto por evento y extra. Sin esto, un doble clic o dos pestañas crean
-- dos pedidos y, aprobados los dos, se cobra dos veces lo que se enciende una. «Rechazado» no
-- es terminal —el cliente sube otro comprobante—, así que también cuenta como abierto.
-- Sin limpieza previa a propósito: los extras nacieron apagados y no hay pedidos de extras.
-- Si hubiera duplicados, que la migración falle a la vista; tocar pedidos a ciegas, no.
create unique index if not exists "orders_extra_abierto_idx" on "orders" ("event_id", "addon_slug")
  where "addon_slug" is not null and "event_id" is not null and "status" <> 'approved';

-- El Día D solo se vende sobre Firma 3D: la web lista los extras sin plan al lado, así que
-- lo dice el nombre. Solo si sigue con el nombre de origen.
update "addons" set "name" = 'Día D en el teléfono · Firma 3D' where "slug" = 'dia-d' and "name" = 'Día D en el teléfono';
