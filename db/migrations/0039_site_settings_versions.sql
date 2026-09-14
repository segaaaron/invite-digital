-- El historial de «La web».
--
-- Cada guardado de los datos del negocio deja aquí la foto completa: quién, cuándo, qué
-- bloques cambió y cómo quedó todo. Restaurar es volver a guardar una de estas fotos, que a
-- su vez deja otra: nada se pierde al volver atrás.
--
-- `actor_email` va copiado como texto, igual que en la auditoría: borrar al admin no puede
-- borrar el rastro de lo que cambió.
create table if not exists "site_settings_versions" (
  "id" uuid primary key default gen_random_uuid(),
  "data" jsonb not null,
  "campos" text[] not null default '{}',
  "actor_email" text not null,
  "created_at" timestamp with time zone not null default now()
);

create index if not exists "site_settings_versions_created_idx" on "site_settings_versions" ("created_at" desc);
