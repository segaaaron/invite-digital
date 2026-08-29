-- Las fotografías que sube **el invitado** desde su invitación.
--
-- No es otra tabla: es la misma `event_media`, con la procedencia dentro. Una fotografía
-- de la boda es una fotografía de la boda, la haya sacado la novia o su tío; separarlas en
-- dos tablas obligaría a unir en cada listado del panel y a duplicar el barrido de la
-- retención, que es justo donde se olvida una.
--
-- `null` es lo que sube el atelier, que es todo lo anterior a esta migración.
--
-- `set null` y no `cascade`: si el grupo se borra —o la retención lo anonimiza— la
-- fotografía **se queda**. Es de la pareja, no del invitado; lo que se pierde es saber
-- quién la trajo, que es justo el dato personal.
--
-- Reaplicable: toda migración escrita a mano tiene que poder correrse dos veces.
alter table event_media
  add column if not exists uploaded_by_group_id uuid;

alter table event_media drop constraint if exists event_media_group_fk;
alter table event_media
  add constraint event_media_group_fk
  foreign key (uploaded_by_group_id) references guest_groups(id) on delete set null;

-- Para contar cuántas lleva subidas un grupo sin recorrer las del evento entero.
create index if not exists event_media_group_idx on event_media (uploaded_by_group_id);
