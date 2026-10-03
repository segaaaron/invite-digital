-- El precio de cada plan en dólares, fijado por el admin (no una conversión al vuelo: en Bolivia
-- el tipo de cambio no es estable). Nulo: la web enseña solo bolivianos.
alter table "plans" add column if not exists "price_usd_cents" integer;
alter table "plans" drop constraint if exists "plans_price_usd_check";
alter table "plans" add constraint "plans_price_usd_check" check ("price_usd_cents" is null or "price_usd_cents" > 0);
