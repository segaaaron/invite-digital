-- Las imágenes que el atelier sube para una invitación: retrato, portada, galería y los
-- iconos del itinerario.
--
-- El fichero **no vive aquí**: vive en disco, fuera de `public/`, y esta tabla guarda a
-- qué evento pertenece, cómo se llamaba y de qué tipo es. En `public/` estaría publicado
-- en internet, y una foto de la novia no se sirve a quien adivine el nombre del archivo.
--
-- `cascade` porque una imagen no significa nada sin su evento, igual que `event_content`.
-- El barrido del disco lo hace la retención; esto solo borra la fila.
--
-- Reaplicable: toda migración escrita a mano tiene que poder correrse dos veces.
create table if not exists event_media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  -- El tipo lo decide la firma de los primeros bytes, nunca la extensión ni el
  -- Content-Type, que los escribe quien sube el fichero.
  content_type varchar(32) not null,
  -- Solo para enseñarlo. Componer una ruta con él sería dejar que quien sube elija dónde
  -- se escribe: el fichero en disco se llama por el `id`.
  original_name varchar(255) not null,
  byte_size integer not null,
  created_at timestamptz not null default now()
);

create index if not exists event_media_event_idx on event_media (event_id);
