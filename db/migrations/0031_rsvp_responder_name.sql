-- Quién contesta, con su nombre.
--
-- La maqueta abre el formulario con «Nombre completo» y el enlace ya sabe **el grupo**,
-- no la persona: en «Familia Rojas Peña» contesta uno de cuatro, y hasta ahora la pareja
-- leía el mensaje sin saber cuál. El campo llega prellenado con la etiqueta del grupo, así
-- que quien no lo toque deja lo de siempre.
--
-- Nulo es todo lo anterior a esta migración, y también quien lo borre a propósito.
--
-- Es dato personal: la retención lo anonimiza junto con el mensaje.
--
-- Reaplicable: toda migración escrita a mano tiene que poder correrse dos veces.
alter table rsvp_responses
  add column if not exists responder_name varchar(120);
