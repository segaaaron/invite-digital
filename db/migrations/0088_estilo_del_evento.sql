-- El estilo del evento (Gala o más): el color de acento y la letra sobre la piel de su diseño.
-- Una fila por evento; sin fila, el diseño sale como siempre. Ningún dato personal: no lo toca
-- la retención. El plan lo trae con `includes_style`, que nace apagado: lo enciende el admin.
create table if not exists "event_styles" (
  "event_id" uuid primary key references "events"("id") on delete cascade,
  "accent" varchar(7),
  "script_font" varchar(30),
  "title_font" varchar(30),
  "updated_at" timestamptz not null default now()
);
alter table "event_styles" drop constraint if exists "event_styles_accent_check";
alter table "event_styles" add constraint "event_styles_accent_check" check ("accent" is null or "accent" ~ '^#[0-9a-f]{6}$');
alter table "plans" add column if not exists "includes_style" boolean not null default false;
