-- Los límites nuevos de cada plan: fotos de galería, fotos de invitados, contraseña del
-- evento, importar CSV, días en línea y cuándo se cambia el modelo.
--
-- Viven en la base, no en el código: cambiar lo que incluye un plan es una decisión
-- comercial. Los planes existentes reciben los valores de la propuesta de planes.
alter table "plans" add column if not exists "max_gallery_photos" integer;
alter table "plans" add column if not exists "guest_photos" boolean not null default true;
alter table "plans" add column if not exists "event_password" boolean not null default true;
alter table "plans" add column if not exists "csv_import" boolean not null default true;
alter table "plans" add column if not exists "online_days" integer not null default 90;
alter table "plans" add column if not exists "design_change" varchar(24) not null default 'antes_de_repartir';

alter table "plans" drop constraint if exists "plans_design_change_check";
alter table "plans" add constraint "plans_design_change_check"
  check ("design_change" in ('ninguno', 'antes_de_repartir', 'siempre'));

-- Solo la primera vez: una segunda pasada no pisa lo que el admin haya cambiado.
update "plans" set
  "max_gallery_photos" = 8, "guest_photos" = false, "event_password" = false, "csv_import" = false,
  "online_days" = 60, "design_change" = 'ninguno'
where "slug" = 'atelier' and "online_days" = 90;
update "plans" set
  "max_gallery_photos" = 20, "guest_photos" = true, "event_password" = true, "csv_import" = true,
  "online_days" = 180, "design_change" = 'antes_de_repartir'
where "slug" = 'firma-3d' and "online_days" = 90;
update "plans" set
  "max_gallery_photos" = null, "guest_photos" = true, "event_password" = true, "csv_import" = true,
  "online_days" = 365, "design_change" = 'siempre'
where "slug" = 'alta-costura' and "online_days" = 90;
