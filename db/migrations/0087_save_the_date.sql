-- El «save the date»: un enlace del evento, antes de la invitación, con la portada del diseño, los
-- nombres, la fecha y la cuenta regresiva. Se vende como extra (nace apagado); el admin lo da siempre.
create table if not exists "event_save_dates" (
  "event_id" uuid primary key references "events"("id") on delete cascade,
  "token_hash" bytea not null,
  "token_sealed" text not null,
  "created_at" timestamptz not null default now()
);
create unique index if not exists "event_save_dates_token_idx" on "event_save_dates" ("token_hash");

insert into "addons" ("slug", "name", "price_cents", "effect", "amount", "sort_order") values
  ('save-the-date', 'Save the date', 20000, 'servicio', 0, 15)
on conflict ("slug") do nothing;
