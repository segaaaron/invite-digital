-- Los planes con el nombre que vende la web (9 oct, del informe de lanzamiento): `/pedido/firma-3d` era
-- Gala y `/pedido/alta-costura` era Imperial. Pedidos, eventos y solicitudes apuntan al plan por su `id`,
-- así que cambiar el `slug` no mueve ninguna relación. Las direcciones viejas redirigen (301) en la página
-- del pedido. Se puede aplicar dos veces: si el nombre nuevo ya existe, no se toca.
update "plans" set "slug" = 'gala'
  where "slug" = 'firma-3d' and not exists (select 1 from "plans" where "slug" = 'gala');
update "plans" set "slug" = 'imperial'
  where "slug" = 'alta-costura' and not exists (select 1 from "plans" where "slug" = 'imperial');

-- Qué planes traen a Luxury se guarda por su nombre (Admin › Asistente): sin esto, Imperial lo perdía.
update "app_settings"
  set "value" = replace(replace("value", '"firma-3d"', '"gala"'), '"alta-costura"', '"imperial"')
  where "key" = 'asistente.config';
