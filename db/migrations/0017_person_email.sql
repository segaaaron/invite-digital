-- Correo del invitado, que la maqueta pide en el alta junto al teléfono.
--
-- Es dato personal y entra en la anonimización de la retención, igual que el nombre y la
-- restricción alimentaria. Opcional a propósito: en Bolivia se reparte por WhatsApp y
-- pedir un correo obligatorio dejaría fuera a media lista.
alter table guest_people add column if not exists email varchar(160);
