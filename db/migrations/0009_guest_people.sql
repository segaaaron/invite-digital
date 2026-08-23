-- Personas dentro de un grupo de invitados. Aditivo: el grupo, su token, su RSVP, su
-- mesa y su pase de puerta siguen siendo los mismos. Un grupo sin personas es el estado
-- de hoy y sigue siendo válido.
create table if not exists guest_people (
  id uuid primary key default gen_random_uuid(),
  guest_group_id uuid not null references guest_groups (id) on delete cascade,
  full_name varchar(160) not null,
  -- Un «+1» sin nombre propio. La maqueta los cuenta en su columna de acompañantes.
  is_companion boolean not null default false,
  -- La restricción, en las palabras del invitado: «sin gluten», «vegetariana», «alergia
  -- a los frutos secos». Un catálogo cerrado dejaría fuera la mitad de los casos reales.
  dietary_note text,
  vip boolean not null default false,
  -- Nulo es pendiente. 'maybe' es la chip «Tal vez» de la maqueta.
  attending varchar(8),
  created_at timestamptz not null default now(),
  constraint guest_people_attending_check check (attending in ('yes', 'no', 'maybe'))
);

create index if not exists guest_people_group_idx on guest_people (guest_group_id);
