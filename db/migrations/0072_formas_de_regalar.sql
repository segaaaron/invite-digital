-- Las formas de regalar de un evento, además de la lista y los fondos: la lluvia de sobres (el
-- efectivo que se entrega en la fiesta) y la transferencia con su QR. Es lo que más se usa en
-- Bolivia, y va en todos los planes. Una fila por evento; sin fila, nada encendido.
--
-- El QR se guarda aquí (unos KB) y no en `event_media`: no es una foto del evento, no cuenta
-- contra el tope de fotos del plan y se va con la fila. Lo emite el banco del cliente, firmado:
-- nosotros no lo generamos.
create table if not exists event_gift_ways (
  event_id uuid primary key references events(id) on delete cascade,
  sobres boolean not null default false,
  sobres_texto text,
  transferencia boolean not null default false,
  banco varchar(80),
  titular varchar(120),
  cuenta varchar(40),
  nota varchar(200),
  qr_imagen bytea,
  qr_tipo varchar(32),
  updated_at timestamptz not null default now()
);
