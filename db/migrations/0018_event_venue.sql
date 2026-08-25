-- El lugar del evento: «Hacienda Los Encinos, Cuernavaca». La maqueta lo pide en
-- Configuración y lo enseña en la vista previa del enlace, y hasta hoy no existía en
-- ninguna parte: el invitado recibía una invitación sin decir dónde es.
alter table events add column if not exists venue varchar(160);
