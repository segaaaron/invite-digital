-- El cronograma ya no se siembra con una plantilla: en producción se leía como datos inventados.
-- Se quita la plantilla de los eventos donde nadie tocó ningún momento: todos siguen siendo
-- exactamente los de la plantilla (hora, título y duración), sin lugar, responsable, canción,
-- notas, proveedores, icono ni marca de invitación. Si uno solo cambió, el evento se queda igual.
with plantilla(starts_at, title, duration_min) as (
  values
    ('18:00', 'Ceremonia', 60), ('19:30', 'Entrada de los novios', 15), ('20:00', 'Brindis', 15),
    ('20:30', 'Primer baile', 10), ('22:30', 'Corte de la torta', 20), ('23:30', 'Lanzamiento del ramo', 15),
    ('18:00', 'Misa', 60), ('19:30', 'Entrada de la quinceañera', 15), ('20:00', 'Vals con el papá', 10),
    ('20:15', 'Vals de chambelanes', 15), ('21:30', 'Cambio de zapatillas', 10), ('22:30', 'Vals sorpresa', 15),
    ('23:30', 'Corte de la torta', 20)
),
tocados as (
  select distinct r.event_id
  from run_of_show r
  where r.place is not null or r.owner is not null or r.cue is not null or r.notes is not null
     or r.in_invitation or r.icon is not null or cardinality(r.vendor_ids) > 0
     or not exists (
       select 1 from plantilla p
       where p.starts_at = r.starts_at and p.title = r.title and p.duration_min = r.duration_min
     )
)
delete from run_of_show
where event_id not in (select event_id from tocados);
