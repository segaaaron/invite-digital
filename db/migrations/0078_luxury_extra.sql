-- Luxury, el planner con IA, también como **extra** para los planes que no lo traen.
-- Nace **apagado** con el precio propuesto, como todos los extras: venderlo se decide en
-- /panel/admin/extras.
alter table "addons" drop constraint if exists "addons_effect_check";
alter table "addons" add constraint "addons_effect_check" check ("effect" in ('cambio_modelo', 'fotos_invitados', 'mas_grupos', 'mas_dias', 'mas_porteros', 'sumar_planner', 'dia_d', 'asistente', 'servicio'));

insert into "addons" ("slug", "name", "price_cents", "effect", "amount", "sort_order") values
  ('luxury', 'Luxury, tu planner con IA', 15000, 'asistente', 0, 9)
on conflict ("slug") do nothing;
