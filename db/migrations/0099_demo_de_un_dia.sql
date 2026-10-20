-- Demos de un día (20 oct): la invitación que el admin le manda a un cliente para que vea cómo funciona.
--
-- Es un evento de verdad —mismo editor, mismo diseño, misma música, mismo enlace `/i/<token>`— con fecha de
-- muerte. `demo_until` es lo único que lo distingue: con fecha es una demo, sin fecha es una boda vendida.
--
-- Una columna en `events` y no una tabla aparte porque lo que se enseña **es** una invitación: una tabla
-- propia obligaría a duplicar el contenido, las fotos, los grupos, la música y los veinte diseños para
-- cambiar una palabra. Lo que sí cambia es quién la ve: la bandeja de eventos, los ingresos y la retención
-- filtran por esta columna, y el barrido de mantenimiento las borra enteras cuando vencen.
--
-- El índice es parcial: las demos vivas son cinco o seis, las bodas son todas las demás.
-- Se puede aplicar dos veces.
alter table "events" add column if not exists "demo_until" timestamp with time zone;

create index if not exists "events_demo_until_idx" on "events" ("demo_until") where "demo_until" is not null;
