-- Nombre y teléfono de quien compra, para que su equipo sepa a quién llamar. Viven en la
-- cuenta —son de la persona, no de una boda— y se rellenan con lo que dejó en su pedido.
alter table "users" add column if not exists "full_name" varchar(160);
alter table "users" add column if not exists "phone" varchar(32);

-- Lo ya vendido: el nombre del pedido, y su contacto solo si es un número (puede ser correo).
update "users" u
set "full_name" = coalesce(u."full_name", o."customer_name"),
    "phone" = coalesce(u."phone", case when o."contact" ~ '^[+0-9 ()-]{7,}$' then o."contact" end)
from "orders" o
join "event_staff" s on s."event_id" = o."event_id" and s."membership" = 'cliente'
where s."user_id" = u."id" and o."addon_slug" is null and (u."full_name" is null or u."phone" is null);
