-- El importe del pedido, congelado al pedir.
--
-- Hasta aquí el pedido solo apuntaba a su plan, y el precio se leía del plan. Desde que el
-- admin edita precios en `/panel/admin/planes`, eso reescribiría la historia: subir el
-- plan de 690 a 790 haría que todo lo cobrado antes pareciera cobrado a 790. Se guarda lo
-- que costaba cuando se pidió.
alter table "orders" add column if not exists "amount_cents" integer;
alter table "orders" add column if not exists "currency" char(3);

-- Los pedidos que ya existen se rellenan con el precio actual de su plan: es la mejor
-- aproximación que hay, y hasta hoy los precios no se habían tocado desde el panel. Solo
-- los vacíos, para que aplicarla dos veces no mueva nada.
update "orders" o
   set "amount_cents" = p."price_cents",
       "currency" = p."currency"
  from "plans" p
 where p."id" = o."plan_id"
   and o."amount_cents" is null;

-- Los ingresos se leen por estado y fecha de decisión.
create index if not exists "orders_decided_idx" on "orders" ("status", "decided_at");
