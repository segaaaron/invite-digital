-- La maqueta V3 dejó fuera cinco modelos: Étoile - Nocturna, Civil - Minimalista,
-- Bodas de Oro - Aniversario, Compromiso - Pedida y Destino - Playa. Se retiran del
-- escaparate (no se borran: las bodas que ya los usan siguen abriendo). El seed no toca
-- `is_published` al actualizar, así que sin esto seguirían a la venta en producción.
update templates set is_published = false where slug in ('boda', 'civil', 'aniv', 'eng', 'dest');
