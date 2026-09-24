-- El buscador del admin ignora las tildes: quien busca «lucia» encuentra a «Lucía». `unaccent`
-- viene con Postgres (contrib) y es una extensión de confianza desde la 13: la crea el dueño de
-- la base sin superusuario.
create extension if not exists unaccent;
