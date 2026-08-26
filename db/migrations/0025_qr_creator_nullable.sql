-- Quién creó un código QR es **procedencia**, no propiedad: el código pertenece al
-- evento, no a la persona que lo tecleó.
--
-- Con `restrict`, borrar a un usuario que hubiera creado un código reventaba con un error
-- de clave foránea, y `canDeleteUser` solo cuenta eventos: el admin veía un fallo genérico
-- sin motivo. Se comprobó contra la base antes de escribir esto.
--
-- `set null`, como `audit_log.actor_user_id` y por lo mismo: el rastro de quién hizo qué
-- no puede impedir dar de baja a nadie.
--
-- Reaplicable: toda migración escrita a mano tiene que poder correrse dos veces.
alter table qr_codes alter column user_id drop not null;

alter table qr_codes drop constraint if exists qr_codes_user_id_fkey;
alter table qr_codes add constraint qr_codes_user_id_fkey
  foreign key (user_id) references users(id) on delete set null;
