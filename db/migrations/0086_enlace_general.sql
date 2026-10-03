-- El enlace general de un evento: uno solo, para quien no quiere cargar invitados. Cada invitado
-- escribe su nombre y quiénes van con él, y recibe **su** invitación personal (con pase), como las
-- cargadas a mano. Solo el hash para buscar y el enlace sellado para volver a enseñarlo.
create table if not exists "event_open_links" (
  "event_id" uuid primary key references "events"("id") on delete cascade,
  "token_hash" bytea not null,
  "token_sealed" text not null,
  "created_at" timestamptz not null default now()
);
create unique index if not exists "event_open_links_token_idx" on "event_open_links" ("token_hash");
