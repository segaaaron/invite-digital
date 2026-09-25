-- La campana del admin, en el mismo canal que el tiempo real de los eventos (`0070`): una
-- consulta que llega o un pedido que cambia de estado avisa con `e = 'admin'` —ningún evento
-- se llama así: son UUID—. Solo el tipo, ningún dato del cliente.
create or replace function notificar_cambio_del_admin() returns trigger
language plpgsql as $$
begin
  perform pg_notify('cambio_de_evento', json_build_object('e', 'admin', 't', TG_ARGV[0])::text);
  return null;
end;
$$;

drop trigger if exists consulta_avisa_al_admin on consultation_requests;
create trigger consulta_avisa_al_admin after insert or update of status on consultation_requests
  for each row execute function notificar_cambio_del_admin('consulta');

drop trigger if exists pedido_avisa_al_admin on orders;
create trigger pedido_avisa_al_admin after insert or update of status on orders
  for each row execute function notificar_cambio_del_admin('pedido');
