-- El idioma del último aparato con que entró cada cuenta (14 oct): el panel y la web en español e inglés, según el
-- aparato (inglés si no es ni español ni inglés). Sirve para los correos, que no tienen aparato delante. Nulo = no ha
-- entrado desde entonces: sus correos salen en español, como hasta hoy. Se puede aplicar dos veces.
alter table "users" add column if not exists "locale" varchar(2);
alter table "users" drop constraint if exists "users_locale_check";
alter table "users" add constraint "users_locale_check" check ("locale" is null or "locale" in ('es', 'en'));
