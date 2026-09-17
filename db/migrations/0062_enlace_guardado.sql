-- El enlace de cada invitado, cifrado, para volver a enseñarlo y su QR sin generar otro.
alter table guest_groups add column if not exists token_sealed text;
