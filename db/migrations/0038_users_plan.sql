-- El plan que compró el usuario.
--
-- El admin da de alta al usuario y le asigna el plan que pagó. `SET NULL`: retirar o borrar
-- un plan no puede llevarse la cuenta por delante. Nulo es «todavía sin plan».
alter table "users" add column if not exists "plan_id" uuid;
alter table "users" drop constraint if exists "users_plan_id_plans_id_fk";
alter table "users"
  add constraint "users_plan_id_plans_id_fk"
  foreign key ("plan_id") references "plans"("id") on delete set null;
