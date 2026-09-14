-- La contraseña provisional y la recuperación con código.
--
-- **`must_change_password`**: la contraseña inicial la escribe el admin y viaja por
-- correo. Mientras esa sea la que vale, quien la escribió puede entrar como el cliente.
-- La marca obliga a cambiarla en la primera entrada; se apaga sola al cambiarla.
--
-- `true` por defecto **solo para las cuentas nuevas**: las que ya existen se quedan en
-- `false` con el `update` de abajo, porque sus dueños ya eligieron su contraseña y
-- echarlos a la pantalla de cambio sería castigarlos por una migración.
alter table "users" add column if not exists "must_change_password" boolean not null default true;
update "users" set "must_change_password" = false where "created_at" < now();

-- **Los códigos de recuperación.**
--
-- Del código solo se guarda su SHA-256, como los tokens de invitado y los de sesión: de
-- la base no se puede sacar ninguno. `consumed_at` lo deja gastado —un código vale una
-- vez— y `attempts` corta la fuerza bruta sobre seis dígitos.
create table if not exists "password_resets" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid not null references "users"("id") on delete cascade,
  "code_hash" bytea not null,
  "expires_at" timestamp with time zone not null,
  "consumed_at" timestamp with time zone,
  "attempts" integer not null default 0,
  "created_at" timestamp with time zone not null default now()
);

-- Por usuario: al pedir uno nuevo se invalidan los suyos anteriores.
create index if not exists "password_resets_user_idx" on "password_resets" ("user_id");
-- Y el barrido de los caducados, como el de sesiones.
create index if not exists "password_resets_expires_idx" on "password_resets" ("expires_at");
