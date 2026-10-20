-- Revocar y devolver una invitación ahora avisan en vivo (20 oct). Los disparadores de la `0070` solo cubrían
-- respuestas, ingresos y visitas: la puerta se quedaba con su manifiesto —`revoked` del último render— y una
-- invitación devuelta seguía rechazándose hasta que algo recargaba la página, con la tarjeta roja pidiendo al
-- portero justo lo que el anfitrión ya había hecho. Al revés también importa: revocar llega a la puerta ya.
-- El aviso solo lleva el evento y el tipo, ningún dato personal. Se puede aplicar dos veces.
create or replace function notificar_cambio_de_evento() returns trigger
language plpgsql as $$
declare
  v_evento uuid;
begin
  if TG_TABLE_NAME = 'invitation_views' then
    v_evento := NEW.event_id;
  elsif TG_TABLE_NAME = 'guest_groups' then
    v_evento := NEW.event_id;
  else
    select event_id into v_evento from guest_groups where id = NEW.guest_group_id;
  end if;
  if v_evento is not null then
    perform pg_notify('cambio_de_evento', json_build_object('e', v_evento, 't', TG_ARGV[0])::text);
  end if;
  return null;
end;
$$;

-- Solo cuando cambia el estado de la invitación: renombrar un grupo o sentarlo no tiene que mover la puerta.
drop trigger if exists invitado_avisa_en_vivo on guest_groups;
create trigger invitado_avisa_en_vivo after update of revoked_at on guest_groups
  for each row when (OLD.revoked_at is distinct from NEW.revoked_at) execute function notificar_cambio_de_evento('invitado');
