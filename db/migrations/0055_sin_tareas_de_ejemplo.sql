-- Crear un evento ya no siembra tareas: en un evento real se leían como datos inventados.
-- Se quita el plan sembrado solo en los eventos donde nadie lo tocó —ninguna tarea de la
-- plantilla hecha ni con notas—. Las propias y los planes en uso se quedan. Aplicarla dos
-- veces no borra nada más.
delete from "planner_tasks" t
where t."stage" <> 'propias'
  and not exists (
    select 1 from "planner_tasks" u
    where u."event_id" = t."event_id"
      and u."stage" <> 'propias'
      and (u."done_at" is not null or u."notes" is not null)
  );
