-- El código corto del pase (5 caracteres sin 0/O/1/I/L), para escribirlo a mano en la puerta.
alter table guest_groups add column if not exists pass_code varchar(8);

-- A cada invitación que no lo tenga, uno único dentro de su evento.
do $$
declare
  fila record;
  alfabeto constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  candidato text;
begin
  for fila in select id, event_id from guest_groups where pass_code is null loop
    loop
      candidato := '';
      for i in 1..5 loop
        candidato := candidato || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
      end loop;
      exit when not exists (select 1 from guest_groups where event_id = fila.event_id and pass_code = candidato);
    end loop;
    update guest_groups set pass_code = candidato where id = fila.id;
  end loop;
end $$;

create unique index if not exists guest_groups_pass_code_idx on guest_groups (event_id, pass_code);
