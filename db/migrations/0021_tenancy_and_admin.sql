-- Multitenencia y administración.
--
-- Hasta aquí `events` no tenía dueño y `users` no tenía rol: con dos usuarios dados de
-- alta, cada uno veía y editaba las bodas del otro. No era una funcionalidad que faltase,
-- era una separación que nunca existió porque hasta hoy solo había un usuario.
--
-- Reaplicable: toda migración escrita a mano tiene que poder correrse dos veces.

alter table users add column if not exists role varchar(16) not null default 'atelier';

-- `restrict`, nunca `cascade`: borrar un usuario no puede llevarse por delante las bodas
-- que gestiona. El admin reasigna o borra los eventos primero.
alter table events add column if not exists user_id uuid;
alter table events drop constraint if exists events_user_id_fkey;
alter table events add constraint events_user_id_fkey
  foreign key (user_id) references users(id) on delete restrict;

create index if not exists events_user_idx on events (user_id, event_date);

-- Los eventos huérfanos pasan al usuario más antiguo, que es el del atelier.
update events
   set user_id = (select id from users order by created_at asc limit 1)
 where user_id is null;

-- Y ese mismo usuario queda como admin. Sin este paso la migración deja una base en la
-- que nadie puede administrar nada y la única salida es SQL a mano.
update users
   set role = 'admin'
 where id = (select id from users order by created_at asc limit 1)
   and not exists (select 1 from users where role = 'admin');

-- Quién hizo qué y cuándo.
--
-- `actor_user_id` con `set null` y `actor_email` copiado como texto: borrar al admin no
-- puede borrar el rastro de lo que hizo. Un registro que desaparece con su autor no es un
-- registro de auditoría.
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  actor_email varchar(160) not null,
  action varchar(48) not null,
  subject varchar(160),
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_recent_idx on audit_log (created_at desc);
