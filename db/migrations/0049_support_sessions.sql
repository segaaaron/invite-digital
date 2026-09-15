-- El admin entra «como el cliente» con motivo, correo al cliente y registro, sin guardar
-- contraseñas (decisión del usuario, 15 de septiembre de 2026). Sin vencimiento: dura hasta
-- «Regresar como admin» o hasta cerrar la sesión del admin.
create table if not exists "support_sessions" (
  "id" uuid primary key default gen_random_uuid(),
  -- Procedencia, como la auditoría: borrar al admin no borra el rastro.
  "admin_user_id" uuid references "users"("id") on delete set null,
  "admin_email" text not null,
  "client_user_id" uuid not null references "users"("id") on delete cascade,
  "event_id" uuid not null references "events"("id") on delete cascade,
  "reason" text not null,
  "started_at" timestamptz not null default now(),
  "ended_at" timestamptz
);
create index if not exists "support_sessions_event_idx" on "support_sessions" ("event_id");

-- La sesión del admin apunta a su modo soporte abierto; `requireSession` devuelve al cliente.
alter table "sessions" add column if not exists "support_session_id" uuid references "support_sessions"("id") on delete set null;
