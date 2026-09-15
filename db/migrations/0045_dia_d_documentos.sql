-- El Día D necesita saber qué proveedor ya llegó; y los documentos del evento —contratos,
-- cotizaciones, facturas y fotos de referencia— son privados: tabla propia, fuera de
-- `event_media`, que `/media/[id]` sirve a los invitados.
alter table "vendors" add column if not exists "arrived_at" timestamp with time zone;

create table if not exists "event_documents" (
  "id" uuid primary key default gen_random_uuid(),
  "event_id" uuid not null references "events"("id") on delete cascade,
  "kind" varchar(16) not null,
  "topic" varchar(80),
  "original_name" varchar(255) not null,
  "content_type" varchar(32) not null,
  "byte_size" integer not null,
  "vendor_id" uuid references "vendors"("id") on delete set null,
  "budget_item_id" uuid references "budget_items"("id") on delete set null,
  "created_at" timestamp with time zone not null default now()
);
create index if not exists "event_documents_event_idx" on "event_documents" ("event_id");
alter table "event_documents" drop constraint if exists "event_documents_kind_check";
alter table "event_documents" add constraint "event_documents_kind_check" check ("kind" in ('contrato', 'cotizacion', 'factura', 'referencia'));
