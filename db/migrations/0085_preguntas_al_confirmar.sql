-- Lo que se pregunta al confirmar, además de si viene: canción, menú y actos (civil, iglesia,
-- fiesta). Una fila por evento; sin fila, el formulario de siempre. Las respuestas, en la misma
-- fila de `rsvp_responses` (que solo se anexa).
create table if not exists "event_rsvp_questions" (
  "event_id" uuid primary key references "events"("id") on delete cascade,
  "ask_song" boolean not null default false,
  "menus" text[] not null default '{}',
  "acts" text[] not null default '{}',
  "updated_at" timestamptz not null default now()
);
alter table "rsvp_responses" add column if not exists "song" varchar(200);
alter table "rsvp_responses" add column if not exists "menu" varchar(60);
alter table "rsvp_responses" add column if not exists "acts" text[] not null default '{}';
