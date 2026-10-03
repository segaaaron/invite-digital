-- La reserva de importe fijo por plan («Reserva con Bs 100, el saldo al entregar»). Si está,
-- manda sobre `deposit_pct`. Nula: el anticipo sigue siendo el porcentaje (o ninguno).
alter table "plans" add column if not exists "deposit_fixed_cents" integer;
alter table "plans" drop constraint if exists "plans_deposit_fixed_check";
alter table "plans" add constraint "plans_deposit_fixed_check" check ("deposit_fixed_cents" is null or "deposit_fixed_cents" > 0);
