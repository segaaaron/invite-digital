-- El contenido rico de la invitación: lo que los dieciséis diseños de boda y XV años
-- pintan y `events` no guarda —ceremonia y recepción por separado, itinerario, galería,
-- código de vestimenta, anfitriones, canción, cuenta atrás con hora—.
--
-- Un solo `jsonb` y no diecinueve columnas: se lee entero, se edita entero y tres de los
-- bloques son listas. La base garantiza que es JSON; que sea *este* JSON lo garantiza
-- `domain/invitation-content.ts` al leerlo y al escribirlo.
--
-- `cascade` porque el contenido no significa nada sin su evento, igual que `event_staff`.
-- Lo que nunca cae en cascada son los datos con valor propio: `events.user_id` sigue con
-- `restrict`.
--
-- Reaplicable: toda migración escrita a mano tiene que poder correrse dos veces, porque al
-- reconciliar el registro una base que ya las tiene las vuelve a ver.
create table if not exists event_content (
  event_id uuid primary key references events(id) on delete cascade,
  blocks jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- El mismo disparador que ya refresca `updated_at` en el resto de tablas.
drop trigger if exists event_content_set_updated_at on event_content;
create trigger event_content_set_updated_at
  before update on event_content
  for each row execute function set_updated_at();
