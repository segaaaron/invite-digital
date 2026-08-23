-- Privacidad del evento: pública con el enlace, o protegida con contraseña.
--
-- Se guarda el **hash** de la contraseña, nunca la contraseña. Es el mismo criterio que
-- ya rige para los tokens de invitado y las sesiones del atelier: en la base no hay nada
-- que sirva para entrar si alguien la lee.
alter table events add column if not exists access_password_hash text;
