-- El hash del enlace anterior. Una invitación de antes de `0062` no guardó su token, así que el
-- panel no puede volver a enseñarlo; acuñar uno nuevo dejaba fuera al invitado que ya tenía el
-- suyo. Con esta columna el enlace nuevo convive con el viejo: los dos abren la misma invitación.
alter table guest_groups add column if not exists token_hash_prev bytea;
create unique index if not exists guest_groups_token_prev_idx on guest_groups (token_hash_prev) where token_hash_prev is not null;
