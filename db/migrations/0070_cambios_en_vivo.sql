-- Tiempo real sin sondeo: cada cambio que importa en un evento avisa por `pg_notify` en el canal
-- `cambio_de_evento`, y la app, que escucha con `LISTEN`, lo reparte a las pestañas abiertas de
-- ese evento por SSE. El aviso solo lleva el evento y el tipo: ningún dato personal.
--
-- `pg_notify` sale al confirmar la transacción (una respuesta deshecha no avisa) y no se guarda
-- en ningún sitio: quien no escuchaba en ese momento se pone al día al reconectar.
create or replace function notificar_cambio_de_evento() returns trigger
language plpgsql as $$
declare
  v_evento uuid;
begin
  if TG_TABLE_NAME = 'invitation_views' then
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

drop trigger if exists rsvp_avisa_en_vivo on rsvp_responses;
create trigger rsvp_avisa_en_vivo after insert on rsvp_responses
  for each row execute function notificar_cambio_de_evento('rsvp');

-- También al anular (deshacer un ingreso escribe `voided_at`).
drop trigger if exists llegada_avisa_en_vivo on arrivals;
create trigger llegada_avisa_en_vivo after insert or update on arrivals
  for each row execute function notificar_cambio_de_evento('ingreso');

drop trigger if exists visita_avisa_en_vivo on invitation_views;
create trigger visita_avisa_en_vivo after insert on invitation_views
  for each row execute function notificar_cambio_de_evento('visita');

-- Si los anfitriones reciben un correo con cada respuesta. Encendido: es lo que esperan de una
-- invitación de pago; lo apagan en Configuración.
alter table events add column if not exists avisar_respuestas boolean not null default true;
