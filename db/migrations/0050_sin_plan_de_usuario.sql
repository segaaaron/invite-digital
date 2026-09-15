-- El plan es de cada evento (events.plan_id): es lo que corta el servidor y lo que se cobra.
-- users.plan_id solo lo leía la columna «Plan que compró» de Usuarios, que no afectaba a nada.
alter table "users" drop column if exists "plan_id";
