-- Las notas de la mesa que pide la maqueta al crearla: «cerca del baño», «acceso silla
-- de ruedas». Es información del salón, no de una persona: viaja al plan del banquete
-- impreso y no la toca la anonimización de la retención.
alter table venue_tables add column if not exists notes varchar(200);
