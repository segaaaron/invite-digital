-- Cuándo se recordó qué a quién. Es lo único que hace que la cola de recordatorios
-- encoja: sin este registro el mismo grupo vuelve a salir todos los días y la vista deja
-- de leerse como una lista de tareas.
--
-- No guarda un solo dato personal —el grupo, el motivo y la fecha—, así que la
-- anonimización de la retención no tiene nada que borrar aquí. El `cascade` se lo lleva
-- con el grupo.
--
-- Reaplicable: toda migración escrita a mano tiene que poder correrse dos veces.
create table if not exists reminder_log (
  id uuid primary key default gen_random_uuid(),
  guest_group_id uuid not null references guest_groups(id) on delete cascade,
  kind varchar(16) not null,
  sent_at timestamptz not null default now()
);

create index if not exists reminder_log_group_idx on reminder_log (guest_group_id, kind, sent_at desc);
