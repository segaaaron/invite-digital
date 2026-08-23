-- Precio anual del plan, para el conmutador MENSUAL / ANUAL de la maqueta.
--
-- Anulable a propósito: hoy los planes se cobran **una vez por evento**, y ese es el
-- precio que ya existe en `price_cents`. Mientras esta columna esté vacía, el conmutador
-- no se pinta: enseñar una suscripción que nadie vende sería vender algo que no existe.
alter table plans add column if not exists price_annual_cents integer;
alter table plans drop constraint if exists plans_price_annual_positive;
alter table plans add constraint plans_price_annual_positive
  check (price_annual_cents is null or price_annual_cents > 0);
