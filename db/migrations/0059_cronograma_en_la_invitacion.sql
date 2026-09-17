-- El cronograma del día es la única lista de momentos: los marcados salen en el itinerario de
-- la invitación, con el icono del diseño.
alter table "run_of_show" add column if not exists "in_invitation" boolean not null default false;
alter table "run_of_show" add column if not exists "icon" varchar(40);
