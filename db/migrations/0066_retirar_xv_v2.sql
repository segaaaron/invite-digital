-- Se retiran del escaparate los nueve «XV Años V2»: Art Déco, Realeza Cristal, Rosa Pastel,
-- Y2K Galaxy, Bohemia, Editorial, Princesa Real, Floral Elegante y Sunset. No se borran:
-- una boda que ya use uno sigue abriendo. El seed no toca `is_published` al actualizar.
update templates set is_published = false
where slug in ('xv-deco', 'xv-realeza', 'xv-vogue', 'xv-y2k', 'xv-boho', 'xv-min', 'xv-princ', 'xv-eleg', 'xv-trop');
