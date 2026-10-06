-- Lo que el formulario de datos pide según el plan (documento de cambios, sección 7): en Gala, qué
-- secciones quitar, agregar u ordenar; en Imperial, además temática, vestido, decoración y flores.
-- Respuestas de texto del cliente, en una sola columna: no se consultan, se leen en su ficha.
alter table "event_design" add column if not exists "brief" jsonb;
