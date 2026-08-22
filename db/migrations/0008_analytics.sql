-- Analítica de la invitación: una fila por visita, con categorías y nada más.
-- Ni IP, ni agente de usuario, ni identificador de navegador: lo que no se escribe no se
-- filtra, y ninguna de las tres cosas hace falta para contar quién abrió el enlace.
create table if not exists invitation_views (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  -- Nulo a propósito: la vista de solo lectura del cliente no pertenece a ningún grupo.
  guest_group_id uuid references guest_groups (id) on delete cascade,
  device varchar(16) not null,
  source varchar(16) not null,
  viewed_at timestamptz not null default now(),
  constraint invitation_views_device_check check (device in ('mobile', 'tablet', 'desktop')),
  constraint invitation_views_source_check check (source in ('whatsapp', 'qr', 'direct', 'other'))
);

-- El panel pregunta siempre «las de este evento, de las más recientes hacia atrás».
create index if not exists invitation_views_event_time_idx
  on invitation_views (event_id, viewed_at desc);
