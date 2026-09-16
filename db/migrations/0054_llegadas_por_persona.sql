-- Quiénes entraron en cada escaneo de la puerta, cuando la invitación tiene personas cargadas.
-- La pareja llega partida: el primero entra a las 19:40 y el segundo a las 20:20 con el mismo
-- QR, y la puerta tiene que ver quién ya está dentro. Nulo es un escaneo por número: las
-- invitaciones sin nombres y todas las llegadas anteriores.
alter table "arrivals" add column if not exists "person_ids" uuid[];
