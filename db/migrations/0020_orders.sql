-- El Plan B: pedidos por transferencia y sus comprobantes.
--
-- `plan_id` va con `set null`, no `cascade`: retirar un plan del catálogo no puede
-- llevarse por delante los pedidos que lo compraron. La contabilidad del atelier no
-- desaparece porque se deje de vender algo.
--
-- Los comprobantes son **varios por pedido**, no uno: un rechazo lleva a otra subida, y
-- el histórico de lo que se mandó es parte de la conversación con el cliente.
--
-- Reaplicable: toda migración escrita a mano tiene que poder correrse dos veces.
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  public_ref varchar(16) not null unique,
  plan_id uuid references plans(id) on delete set null,
  customer_name varchar(160) not null,
  contact varchar(160) not null,
  event_date date,
  notes text,
  -- 'pending_payment' | 'proof_submitted' | 'approved' | 'rejected'
  status varchar(24) not null default 'pending_payment',
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists orders_status_idx on orders (status, created_at desc);

create table if not exists order_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  -- El nombre con el que vive en disco. Es un UUID, nunca el nombre que mandó el cliente.
  storage_key uuid not null,
  -- El nombre original, solo para enseñarlo. Jamás se usa para construir una ruta.
  original_name varchar(255) not null,
  mime varchar(64) not null,
  size_bytes integer not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists order_proofs_order_idx on order_proofs (order_id, uploaded_at desc);
