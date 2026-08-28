-- Qué diseño pinta cada plantilla del escaparate.
--
-- Sin esta columna, el catálogo vende ocho modelos que el motor no sabe pintar: lo que el
-- cliente elige en la web y lo que el invitado acaba recibiendo no tienen nada que ver.
-- Ese es el hueco que esta rebanada cierra.
--
-- Nace anulable y se rellena con el `slug`, que en las plantillas nuevas es exactamente la
-- clave del tema. Se pone `not null` al final, en la misma migración, cuando ya no queda
-- ninguna fila sin él.
--
-- Reaplicable: toda migración escrita a mano tiene que poder correrse dos veces.
alter table templates add column if not exists theme_key varchar(64);

update templates set theme_key = slug where theme_key is null;

alter table templates alter column theme_key set not null;
