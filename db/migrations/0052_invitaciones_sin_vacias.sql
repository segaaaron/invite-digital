-- Una invitación nunca queda vacía. Sin nadie dentro no aparece en la lista del panel, pero
-- seguía contando contra el tope del plan, saliendo en el reparto y abriendo su enlace. Las
-- dejaban el alta antigua de grupos, la importación CSV y borrar a la última persona.
--
-- La que nunca salió —sin reparto, sin apertura, sin respuesta ni llegada— no existe para
-- nadie y se borra. La que ya salió conserva su enlace y su historia, y recibe su invitado
-- principal con el nombre de la invitación. Aplicarla dos veces no cambia nada.
delete from "guest_groups" g
where g."invitation_sent_at" is null
  and g."opened_at" is null
  and not exists (select 1 from "guest_people" p where p."guest_group_id" = g."id")
  and not exists (select 1 from "rsvp_responses" r where r."guest_group_id" = g."id")
  and not exists (select 1 from "arrivals" a where a."guest_group_id" = g."id");

insert into "guest_people" ("guest_group_id", "full_name", "is_companion")
select g."id", left(g."label", 160), false
from "guest_groups" g
where not exists (select 1 from "guest_people" p where p."guest_group_id" = g."id");
