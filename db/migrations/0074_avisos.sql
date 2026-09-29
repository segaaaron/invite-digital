-- Los avisos del panel (28 de septiembre): la campana y las notificaciones push web.
--
-- `avisos` es lo que enseña la campana de cada persona: uno por destinatario. Las push son solo el
-- canal de entrega y viven en `push_subscriptions` (un aparato por fila). Idempotente.

create table if not exists avisos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  kind varchar(24) not null,
  title varchar(160) not null,
  body varchar(400) not null default '',
  href varchar(400) not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index if not exists avisos_usuario_idx on avisos (user_id, created_at desc);
create index if not exists avisos_sin_ver_idx on avisos (user_id) where seen_at is null;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device varchar(80),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists push_subscriptions_usuario_idx on push_subscriptions (user_id);

-- Los tipos de aviso que la persona no quiere recibir en sus aparatos. La campana los guarda igual.
alter table users add column if not exists avisos_silenciados text[] not null default '{}';

-- La campana se entera en vivo por el canal de siempre, con el «evento» `u:<usuario>`.
create or replace function notificar_aviso() returns trigger language plpgsql as $$
begin
  perform pg_notify('cambio_de_evento', json_build_object('e', 'u:' || new.user_id, 't', 'aviso')::text);
  return null;
end;
$$;

drop trigger if exists aviso_nuevo on avisos;
create trigger aviso_nuevo after insert on avisos for each row execute function notificar_aviso();
