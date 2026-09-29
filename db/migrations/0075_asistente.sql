-- Arturo, el asistente del panel (28 de septiembre). Lo que gasta cada evento cada mes: cuántos
-- mensajes y cuántos tokens, y lo que costaron en millonésimas de dólar. Sirve para la cuota del
-- evento (300 al mes) y el techo global (la suma del mes). Las conversaciones no se guardan.
create table if not exists assistant_usage (
  event_id uuid not null references events(id) on delete cascade,
  -- `YYYY-MM`, mes de Bolivia.
  month char(7) not null,
  messages integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cost_micro_usd bigint not null default 0,
  primary key (event_id, month)
);

create index if not exists assistant_usage_month_idx on assistant_usage (month);
