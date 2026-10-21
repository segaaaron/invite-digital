-- Precio de lanzamiento (20 oct): el precio de antes, tachado al lado del de ahora.
--
-- `price_before_cents` es **el de lista**, el que vuelve cuando termine la promoción; `price_cents` sigue
-- siendo lo que se cobra hoy. Nulo = sin promoción, y entonces no se pinta nada tachado.
-- Va en la base y no en el código porque subir o quitar una promoción es una decisión comercial.
-- Se puede aplicar dos veces.
alter table "plans" add column if not exists "price_before_cents" integer;
