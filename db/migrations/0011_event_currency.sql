-- La moneda del evento. La maqueta la ofrece en Configuración y en la mesa de regalos, y
-- hasta hoy estaba clavada en el código.
--
-- Por defecto BOB, que es lo que había: los eventos existentes no cambian de moneda al
-- aplicar esta migración.
alter table events add column if not exists currency varchar(3) not null default 'BOB';

alter table events drop constraint if exists events_currency_check;
alter table events add constraint events_currency_check check (currency in ('BOB', 'USD', 'CAD'));
