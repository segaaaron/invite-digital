-- Teléfono del grupo y plantilla de mensaje del evento: los dos datos que faltaban para
-- repartir invitaciones sin escribirlo todo a mano.
--
-- El teléfono es un dato personal del invitado y entra en la anonimización de la
-- retención, igual que la etiqueta del grupo.
alter table guest_groups add column if not exists phone varchar(32);
alter table events add column if not exists message_template text;
