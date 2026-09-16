-- Dónde está abierta cada sesión y cuándo se usó: el dueño de la cuenta las ve en Mi cuenta y
-- cierra las demás con un código de su correo.
alter table "sessions" add column if not exists "device" varchar(80);
alter table "sessions" add column if not exists "last_seen_at" timestamp with time zone;
