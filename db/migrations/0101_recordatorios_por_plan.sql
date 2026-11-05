-- Los recordatorios («su panel le dice a quién escribir hoy», con el mensaje listo) pasan a ser
-- una función del plan. El documento de correcciones del 30 de octubre los vende como exclusivos
-- del plan Imperial, y hasta hoy los veía cualquier plan: la web prometía una cosa y el panel hacía
-- otra.
--
-- Nace **encendida** para que ningún evento ya vendido se quede sin la cola de un día para otro, y
-- se apaga en los planes que no la incluyen. Apagarla no borra nada: lo que ya se marcó como
-- recordado sigue en su tabla, y volver a encenderla devuelve la cola tal como estaba.
alter table "plans" add column if not exists "includes_reminders" boolean not null default true;

-- Atelier y Gala no los traen (documento del 30 oct). Se escribe por `slug` y no por posición, y
-- vuelve a correr sin daño: el mismo update deja el mismo valor.
update "plans" set "includes_reminders" = false where "slug" in ('atelier', 'gala');
