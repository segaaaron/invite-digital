-- La ventana del acceso del portero (20 oct). Con 6 horas antes y 4 después, la puerta cerraba a las 04:00 del día
-- siguiente: una fiesta que acaba a las cinco de la mañana —lo normal aquí— se quedaba sin puerta en lo último, y
-- ninguna pantalla permite ampliarlo. Pasa a 12 y 12: cubre el montaje de la tarde anterior y el amanecer siguiente,
-- y sigue cerrando. Solo mueve las filas que están en el valor viejo, para no pisar un ajuste a mano.
-- Se puede aplicar dos veces.
alter table "door_porters" alter column "opens_hours_before" set default 12;
alter table "door_porters" alter column "closes_hours_after" set default 12;
update "door_porters" set "opens_hours_before" = 12 where "opens_hours_before" = 6;
update "door_porters" set "closes_hours_after" = 12 where "closes_hours_after" = 4;
