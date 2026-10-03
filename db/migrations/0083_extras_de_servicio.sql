-- Los extras de servicio del documento de cambios (30 sep). Nacen **apagados**, como todos: venderlos
-- y fijar su precio es del admin en Catálogo › Extras. `mas_rondas`: un cambio después de gastar las
-- rondas suma una al diseño por encargo.
alter table "addons" drop constraint if exists "addons_effect_check";
alter table "addons" add constraint "addons_effect_check" check ("effect" in ('cambio_modelo', 'fotos_invitados', 'mas_grupos', 'mas_dias', 'mas_porteros', 'sumar_planner', 'dia_d', 'asistente', 'servicio', 'mas_rondas'));

insert into "addons" ("slug", "name", "price_cents", "effect", "amount", "sort_order") values
  ('diseno-desde-cero', 'Diseño desde cero', 30000, 'servicio', 0, 10),
  ('express-24h', 'Entrega express en 24 h', 15000, 'servicio', 0, 11),
  ('version-extra', 'Versión extra (solo recepción, otro idioma…)', 20000, 'servicio', 0, 12),
  ('cambio-adicional', 'Cambio después de la entrega', 5000, 'mas_rondas', 1, 13),
  ('video-estados', 'Video para estados de WhatsApp', 15000, 'servicio', 0, 14)
on conflict ("slug") do nothing;
