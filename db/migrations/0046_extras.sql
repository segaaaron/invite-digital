-- Extras sueltos: se compran como un pedido y, al aprobarse, suben un límite del evento.
-- Nacen **apagados** con el precio propuesto: venderlos es una decisión comercial que se
-- toma en /panel/admin/extras, no en una migración.
create table if not exists "addons" (
  "slug" varchar(32) primary key,
  "name" varchar(80) not null,
  "price_cents" integer not null,
  "currency" char(3) not null default 'BOB',
  "effect" varchar(24) not null,
  "amount" integer not null default 0,
  "is_active" boolean not null default false,
  "sort_order" integer not null default 0
);
alter table "addons" drop constraint if exists "addons_effect_check";
alter table "addons" add constraint "addons_effect_check" check ("effect" in ('cambio_modelo', 'fotos_invitados', 'mas_grupos', 'mas_dias', 'mas_porteros', 'sumar_planner', 'dia_d', 'servicio'));
alter table "addons" drop constraint if exists "addons_price_check";
alter table "addons" add constraint "addons_price_check" check ("price_cents" >= 0 and "amount" >= 0);

insert into "addons" ("slug", "name", "price_cents", "effect", "amount", "sort_order") values
  ('cambio-modelo', 'Cambiar de modelo', 15000, 'cambio_modelo', 0, 1),
  ('fotos-invitados', 'Fotos de los invitados', 12000, 'fotos_invitados', 0, 2),
  ('mas-40-grupos', '+40 grupos de invitados', 15000, 'mas_grupos', 40, 3),
  ('mas-6-meses', '+6 meses en línea', 10000, 'mas_dias', 180, 4),
  ('express-48h', 'Entrega exprés en 48 h', 20000, 'servicio', 0, 5),
  ('mas-3-porteros', '+3 porteros', 8000, 'mas_porteros', 3, 6),
  ('sumar-planner', 'Sumar a tu planner', 15000, 'sumar_planner', 1, 7),
  ('dia-d', 'Día D en el teléfono', 15000, 'dia_d', 0, 8)
on conflict ("slug") do nothing;

-- El pedido de un extra: sin plan, con el extra y el evento que lo compra.
alter table "orders" add column if not exists "addon_slug" varchar(32) references "addons"("slug") on delete set null;

-- Lo que compró cada evento. Se aplica al aprobar el pedido; varios del mismo se acumulan.
create table if not exists "event_addons" (
  "id" uuid primary key default gen_random_uuid(),
  "event_id" uuid not null references "events"("id") on delete cascade,
  "addon_slug" varchar(32) references "addons"("slug") on delete set null,
  "effect" varchar(24) not null,
  "amount" integer not null default 0,
  "order_id" uuid references "orders"("id") on delete set null,
  "applied_at" timestamp with time zone not null default now()
);
create index if not exists "event_addons_event_idx" on "event_addons" ("event_id");
create unique index if not exists "event_addons_order_idx" on "event_addons" ("order_id");
