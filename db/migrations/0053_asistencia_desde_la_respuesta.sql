-- Las invitaciones confirmadas por el formulario simple guardaban la respuesta y dejaban a sus
-- personas sin asistencia: el panel enseñaba la fecha de confirmación junto a «Pendiente», y
-- los filtros y el catering no las contaban. Desde ahora la confirmación las marca; esto
-- arregla lo ya contestado con lo que se sabe seguro: con la última respuesta, «no» si no
-- viene nadie y «sí» si vienen al menos tantos como personas hay. Con menos, no se sabe
-- quiénes, y se deja. Lo ya marcado no se toca. Aplicarla dos veces no cambia nada.
with ultima as (
  select distinct on ("guest_group_id") "guest_group_id", "attending"
  from "rsvp_responses"
  order by "guest_group_id", "responded_at" desc
), cuantas as (
  select "guest_group_id", count(*) as n from "guest_people" group by "guest_group_id"
)
update "guest_people" p
set "attending" = case when u."attending" = 0 then 'no' else 'yes' end
from ultima u
join cuantas c on c."guest_group_id" = u."guest_group_id"
where p."guest_group_id" = u."guest_group_id"
  and p."attending" is null
  and (u."attending" = 0 or u."attending" >= c.n);
