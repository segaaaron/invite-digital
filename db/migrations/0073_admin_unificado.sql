-- El admin unificado (28 de septiembre): una venta es la consulta y su pedido juntos, y el
-- pedido aprende lo que un planner necesita para cobrar —cotización, anticipo, recordatorio,
-- cancelación, referido—. Más las notas de cada cliente y lo que el mantenimiento diario manda
-- por correo sin repetirse. Se puede aplicar dos veces.

-- La venta: el pedido sabe de qué consulta salió.
alter table orders add column if not exists consultation_id uuid references consultation_requests(id) on delete set null;
create index if not exists orders_consultation_idx on orders (consultation_id);
-- 'web' lo pidió el cliente desde precios; 'cotizacion' lo armó el admin y le mandó el enlace.
alter table orders add column if not exists origin varchar(16) not null default 'web';
-- Los extras que entran en una cotización, congelados como el importe: [{slug, name, cents}].
alter table orders add column if not exists quote_extras jsonb;
-- Lo que se rebajó del precio de lista en una cotización; el importe ya lo lleva descontado.
alter table orders add column if not exists discount_cents integer;
-- Anticipo: con él aprobado nace el evento; el saldo se registra después.
alter table orders add column if not exists deposit_cents integer;
alter table orders add column if not exists balance_paid_at timestamptz;
-- Cuándo se le recordó el pago por última vez.
alter table orders add column if not exists reminded_at timestamptz;
-- Cancelar es terminal y dice por qué.
alter table orders add column if not exists cancel_reason text;
alter table orders drop constraint if exists orders_cancelado_con_motivo;
alter table orders add constraint orders_cancelado_con_motivo check (status <> 'cancelled' or cancel_reason is not null);
-- El código de quien lo recomendó, si llegó recomendado.
alter table orders add column if not exists referral_code varchar(16);

-- La consulta: cuándo se contestó por primera vez y por qué se perdió.
alter table consultation_requests add column if not exists first_contact_at timestamptz;
alter table consultation_requests add column if not exists lost_reason varchar(24);
-- Las ya contactadas antes de esta columna: su cambio de estado es la mejor aproximación.
update consultation_requests set first_contact_at = status_changed_at
where first_contact_at is null and status <> 'new' and status_changed_at is not null;

-- El anticipo que pide cada plan, en porcentaje. 0: se paga entero de una vez (lo de siempre).
alter table plans add column if not exists deposit_pct smallint not null default 0;
alter table plans drop constraint if exists plans_anticipo_en_rango;
alter table plans add constraint plans_anticipo_en_rango check (deposit_pct between 0 and 100);

-- Notas y etiquetas de cada cliente. La clave es la de `agruparClientes` (correo o teléfono):
-- el cliente no es una tabla, se deriva de consultas, pedidos y cuentas.
create table if not exists client_notes (
  clave varchar(220) primary key,
  note text,
  tags text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Lo que el mantenimiento diario ya mandó de cada evento (hitos, RSVP bajo, encuesta,
-- aniversario): una fila por aviso, para no repetirlo nunca.
create table if not exists event_notices (
  event_id uuid not null references events(id) on delete cascade,
  kind varchar(32) not null,
  sent_at timestamptz not null default now(),
  primary key (event_id, kind)
);

-- La opinión del cliente tras el evento. Enlace sin sesión: de su token solo vive el hash.
create table if not exists event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references events(id) on delete cascade,
  token_hash bytea not null unique,
  rating smallint,
  comment text,
  allow_publish boolean not null default false,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
alter table event_feedback drop constraint if exists event_feedback_estrellas;
alter table event_feedback add constraint event_feedback_estrellas check (rating is null or rating between 1 and 5);

-- El código de referido de cada evento celebrado: quien compra con él recibe su descuento.
create table if not exists referral_codes (
  code varchar(16) primary key,
  event_id uuid not null unique references events(id) on delete cascade,
  created_at timestamptz not null default now()
);
