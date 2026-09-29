-- El registro de fallos (28 de septiembre): cada vez que un servicio falla —una acción, una página, una
-- ruta, el navegador— queda aquí **qué** falló y **por qué** (el mensaje y la pila), para arreglarlo sin
-- adivinar. Antes solo iba a la consola del contenedor, que nadie mira. Se borra a los 30 días.
create table if not exists service_failures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Dónde: `events/actions`, `route:/panel/eventos/[slug]/asistente`, `navegador`.
  service varchar(160) not null,
  -- Qué pasó, en una línea, y la causa entera (pila, detalle).
  message text not null,
  detail text not null default '',
  -- La misma clase de fallo, para agruparlos: servicio + mensaje sin números ni identificadores.
  fingerprint char(16) not null,
  origin varchar(12) not null default 'servidor',
  path varchar(400),
  action varchar(120)
);

create index if not exists service_failures_created_idx on service_failures (created_at desc);
create index if not exists service_failures_fingerprint_idx on service_failures (fingerprint, created_at desc);

-- El correo a los anfitriones con cada respuesta se quitó el mismo día: el aviso va por la campana y la push.
alter table events drop column if exists avisar_respuestas;
