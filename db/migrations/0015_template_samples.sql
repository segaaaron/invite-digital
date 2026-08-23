-- Los datos de muestra que la maqueta dibuja en cada tarjeta de modelo: monograma,
-- nombres, fecha y lugar. Son de escaparate y por plantilla, así que viven en el catálogo
-- y no en el código.
alter table templates add column if not exists sample_monogram varchar(16);
alter table templates add column if not exists sample_names varchar(80);
alter table templates add column if not exists sample_date_label varchar(32);
alter table templates add column if not exists sample_venue varchar(120);
