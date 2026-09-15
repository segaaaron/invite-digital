-- Cuántas personas suma el anfitrión a su equipo: co-anfitriones y planner contratado.
-- `null` es sin límite. Los planes existentes reciben 1/0 · 3/1 · sin límite.
alter table "plans" add column if not exists "max_cohosts" integer default 1;
alter table "plans" add column if not exists "max_hired_planners" integer default 0;

-- Solo la primera vez: con los valores por defecto aún puestos.
update "plans" set "max_cohosts" = 3, "max_hired_planners" = 1
  where "slug" = 'firma-3d' and "max_cohosts" = 1 and "max_hired_planners" = 0;
update "plans" set "max_cohosts" = null, "max_hired_planners" = null
  where "slug" = 'alta-costura' and "max_cohosts" = 1 and "max_hired_planners" = 0;
