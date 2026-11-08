-- «+500 fotos» para el álbum compartido (documento del 6 nov): cuando el álbum se llena, el cliente suma 500
-- fotos más por Bs 50 desde su panel. Es un extra más: efecto `mas_fotos`, cantidad 500.
--
-- Nace **apagado**, como todos los extras: venderlo y confirmar su precio es del admin en Catálogo › Extras.
-- Se puede aplicar dos veces: la restricción se rehace y la fila no se duplica.
alter table "addons" drop constraint if exists "addons_effect_check";
alter table "addons" add constraint "addons_effect_check" check ("effect" in ('cambio_modelo', 'fotos_invitados', 'mas_grupos', 'mas_dias', 'mas_porteros', 'sumar_planner', 'dia_d', 'asistente', 'servicio', 'mas_rondas', 'mas_fotos'));

insert into "addons" ("slug", "name", "price_cents", "effect", "amount", "sort_order") values
  ('mas-500-fotos', '500 fotos más para el álbum', 5000, 'mas_fotos', 500, 6)
on conflict ("slug") do nothing;
