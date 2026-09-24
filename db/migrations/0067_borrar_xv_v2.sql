-- Se borran de raíz los nueve «XV Años V2» (retirados en 0066): Art Déco, Realeza Cristal,
-- Rosa Pastel, Y2K Galaxy, Bohemia, Editorial, Princesa Real, Floral Elegante y Sunset.
-- Su código ya no existe: un evento que usara uno pasa a «Bajo el Mar» (`xv`), que es XV.
-- Sin esto, `themeFor` lo pintaría con el clásico, que es de boda.
update events set theme_key = 'xv'
where theme_key in ('xv-deco', 'xv-realeza', 'xv-vogue', 'xv-y2k', 'xv-boho', 'xv-min', 'xv-princ', 'xv-eleg', 'xv-trop');

update orders set template_slug = null
where template_slug in ('xv-deco', 'xv-realeza', 'xv-vogue', 'xv-y2k', 'xv-boho', 'xv-min', 'xv-princ', 'xv-eleg', 'xv-trop');

-- Las traducciones caen en cascada.
delete from templates
where slug in ('xv-deco', 'xv-realeza', 'xv-vogue', 'xv-y2k', 'xv-boho', 'xv-min', 'xv-princ', 'xv-eleg', 'xv-trop');

-- La canción de muestra de cada uno (`showcase.music.<tema>`, `showcase.song.<tema>`): sin
-- modelo no la pide nadie.
delete from app_settings
where key in (
  select prefijo || tema
  from unnest(array['showcase.music.', 'showcase.song.']) as prefijo,
       unnest(array['xv-deco', 'xv-realeza', 'xv-vogue', 'xv-y2k', 'xv-boho', 'xv-min', 'xv-princ', 'xv-eleg', 'xv-trop']) as tema
);
