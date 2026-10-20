-- Tope **por cuenta** en la recuperación de contraseña (20 oct, hallazgos F2, F7 y F8 del escaneo).
--
-- Hasta hoy los cinco intentos eran por código, y pedir otro código borraba la fila e insertaba una con
-- `attempts = 0`: probando unas combinaciones, pidiendo otro código y repitiendo, la probabilidad de acertar
-- seis dígitos crecía sin límite. Lo único que lo frenaba eran limitadores en memoria por IP, y con IPv6 se
-- rotan direcciones gratis. Ahora la fila es **una por cuenta** y lleva su propia ventana de una hora:
--   · `issued_count`: códigos emitidos en la ventana (tope en el código de la aplicación).
--   · `failed_count`: intentos fallidos en la ventana, **que sobreviven a pedir otro código**.
--   · `window_at`: cuándo empezó la ventana; pasada una hora, los dos contadores vuelven a cero.
-- Se puede aplicar dos veces.
alter table "password_resets" add column if not exists "issued_count" integer not null default 0;
alter table "password_resets" add column if not exists "failed_count" integer not null default 0;
alter table "password_resets" add column if not exists "window_at" timestamp with time zone not null default now();

-- Una fila por cuenta: `issue` ya borraba las anteriores, así que esto fija lo que de hecho pasaba y permite
-- el `on conflict` que conserva los contadores. Por si acaso, primero se quedan solo las más recientes.
delete from "password_resets" p
where exists (
  select 1 from "password_resets" q
  where q."user_id" = p."user_id" and (q."created_at" > p."created_at" or (q."created_at" = p."created_at" and q."id" > p."id"))
);
create unique index if not exists "password_resets_user_unique" on "password_resets" ("user_id");
