-- El motor de QR: códigos que apuntan a **nosotros** y redirigen.
--
-- Un QR con la dirección final dentro queda muerto el día que esa tienda cambia el
-- enlace, y para entonces ya está impreso y colgado en el salón. Con este, se cambia una
-- fila. Y de paso se pueden contar los escaneos, que en un código estático no existe.
--
-- `event_id` es anulable: un código puede ser del atelier y no de una boda concreta.
-- `user_id` no lo es y va con `restrict`, igual que en `events`: borrar un usuario no se
-- lleva por delante lo que creó.
--
-- Reaplicable: toda migración escrita a mano tiene que poder correrse dos veces.
create table if not exists qr_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_id uuid references events(id) on delete cascade,
  label varchar(120) not null,
  -- 'registry' | 'store' | 'custom'
  kind varchar(24) not null default 'custom',
  target text not null,
  active boolean not null default true,
  -- Contador y última vez, no una tabla de escaneos: lo que la pantalla enseña es
  -- «cuántos» y «cuándo fue el último». Una fila por escaneo solo haría falta para
  -- dibujar una serie en el tiempo, y ese día será su propia tabla.
  scan_count integer not null default 0,
  last_scan_at timestamptz,
  created_at timestamptz not null default now()
);

alter table qr_codes drop constraint if exists qr_codes_user_id_fkey;
alter table qr_codes add constraint qr_codes_user_id_fkey
  foreign key (user_id) references users(id) on delete restrict;

create index if not exists qr_codes_event_idx on qr_codes (event_id, created_at desc);
create index if not exists qr_codes_user_idx on qr_codes (user_id, created_at desc);
