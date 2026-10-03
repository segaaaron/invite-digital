-- El libro de firmas y las formas de regalar (lluvia de sobres, QR de transferencia), por plan.
-- Nacen encendidos: es como fue siempre. Apagarlos en un plan no se lo quita a quien ya los usa:
-- la invitación sigue enseñando lo que el evento ya configuró o ya recibió.
alter table "plans" add column if not exists "includes_guestbook" boolean not null default true;
alter table "plans" add column if not exists "includes_gift_ways" boolean not null default true;
