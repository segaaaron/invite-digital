-- Los planes y los extras del documento de cambios (30 sep), tal como los compone la maqueta V4
-- (`Checkout.html`): Atelier Bs 490 · Gala Bs 690 (más elegido) · Imperial Bs 950, reserva fija de
-- Bs 100, cada plan incluye todo lo del anterior. Los `slug` no cambian (los usan pedidos, eventos y
-- pruebas): cambian nombre, frase, precio y límites. Idempotente: son `update` a valores fijos.
--
-- USD al cambio oficial (6,96): el precio en Bs es el principal; el de dólares es el equivalente.

-- ── Límites ─────────────────────────────────────────────────────────────────────────────────────
update "plans" set
  "price_cents" = 49000, "price_usd_cents" = 7040, "highlighted" = false, "sort_order" = 1,
  "deposit_pct" = 0, "deposit_fixed_cents" = 10000, "correction_rounds" = 2, "delivery_days" = 3,
  "online_days" = 60, "max_guest_groups" = null, "max_gallery_photos" = 5,
  "includes_guestbook" = false, "includes_gift_ways" = false, "includes_style" = false,
  "guest_photos" = false, "includes_seating" = false, "includes_checkin" = false, "max_door_porters" = 0,
  "csv_import" = false
where "slug" = 'atelier';

update "plans" set
  "price_cents" = 69000, "price_usd_cents" = 9914, "highlighted" = true, "sort_order" = 2,
  "deposit_pct" = 0, "deposit_fixed_cents" = 10000, "correction_rounds" = 3, "delivery_days" = 3,
  "online_days" = 90, "max_guest_groups" = null, "max_gallery_photos" = 10,
  "includes_guestbook" = true, "includes_gift_ways" = true, "includes_style" = true,
  "guest_photos" = false, "includes_seating" = false, "includes_checkin" = false, "max_door_porters" = 0,
  "csv_import" = false
where "slug" = 'firma-3d';

update "plans" set
  "price_cents" = 95000, "price_usd_cents" = 13649, "highlighted" = false, "sort_order" = 3,
  "deposit_pct" = 0, "deposit_fixed_cents" = 10000, "correction_rounds" = 5, "delivery_days" = 5,
  "online_days" = 180, "max_guest_groups" = null, "max_gallery_photos" = 20,
  "includes_guestbook" = true, "includes_gift_ways" = true, "includes_style" = true,
  "guest_photos" = true, "includes_seating" = true, "includes_checkin" = true,
  "csv_import" = true
where "slug" = 'alta-costura';

-- ── Nombre, frase, descripción y lo que incluye ─────────────────────────────────────────────────
update "plan_translations" t set
  "name" = 'Atelier',
  "tagline" = 'Elige tu diseño',
  "description" = 'Todo lo esencial de tu evento en una invitación elegante, personalizada para cada invitado.',
  "features" = '["Portada, cuenta regresiva, mapa y cronograma", "Código de vestimenta y música de fondo", "Envíos ilimitados", "Confirmación de asistencia por WhatsApp", "Lista de confirmados", "Nombre del invitado + pases «Reservamos X lugares»", "Botón para agendar en Google Calendar", "Galería de 5 fotos", "2 rondas de corrección · entrega en 3 días", "En línea 60 días después del evento"]'::jsonb
from "plans" p where p."id" = t."plan_id" and p."slug" = 'atelier' and t."locale" = 'es';

update "plan_translations" t set
  "name" = 'Atelier',
  "tagline" = 'Choose your design',
  "description" = 'Everything your event needs in an elegant invitation, personalised for each guest.',
  "features" = '["Cover, countdown, map and schedule", "Dress code and background music", "Unlimited sends", "RSVP via WhatsApp", "Guest list of confirmations", "Guest name + passes «We saved X seats»", "Add to Google Calendar button", "Gallery of 5 photos", "2 rounds of corrections · delivered in 3 days", "Online 60 days after the event"]'::jsonb
from "plans" p where p."id" = t."plan_id" and p."slug" = 'atelier' and t."locale" = 'en';

update "plan_translations" t set
  "name" = 'Gala',
  "tagline" = 'Hazlo tuyo',
  "description" = 'Suma regalos y libro de firmas para que tus invitados te dejen sus buenos deseos.',
  "features" = '["Lluvia de sobres y QR de transferencia", "Libro de firmas", "Colores y tipografías a tu gusto", "Galería de 10 fotos", "3 rondas de corrección · entrega en 3 días", "En línea 90 días después del evento"]'::jsonb
from "plans" p where p."id" = t."plan_id" and p."slug" = 'firma-3d' and t."locale" = 'es';

update "plan_translations" t set
  "name" = 'Gala',
  "tagline" = 'Make it yours',
  "description" = 'Add gifts and a guestbook so your guests can leave you their best wishes.',
  "features" = '["Envelope shower and transfer QR", "Guestbook", "Colours and fonts of your choice", "Gallery of 10 photos", "3 rounds of corrections · delivered in 3 days", "Online 90 days after the event"]'::jsonb
from "plans" p where p."id" = t."plan_id" and p."slug" = 'firma-3d' and t."locale" = 'en';

update "plan_translations" t set
  "name" = 'Imperial',
  "tagline" = 'Creado para ti',
  "description" = 'La experiencia completa: control en tiempo real, mesas, acceso con QR y álbum compartido.',
  "features" = '["Panel en tiempo real: confirma, rechaza, pendiente · descargable", "Número de mesa + QR de acceso al evento", "Álbum compartido con QR para la fiesta", "Galería de 20 fotos", "5 rondas de corrección · entrega en 5 días", "En línea 6 meses después del evento"]'::jsonb
from "plans" p where p."id" = t."plan_id" and p."slug" = 'alta-costura' and t."locale" = 'es';

update "plan_translations" t set
  "name" = 'Imperial',
  "tagline" = 'Created for you',
  "description" = 'The full experience: real-time control, tables, QR entry and a shared album.',
  "features" = '["Real-time dashboard: confirmed, declined, pending · downloadable", "Table number + event entry QR", "Shared album with a QR for the party", "Gallery of 20 photos", "5 rounds of corrections · delivered in 5 days", "Online 6 months after the event"]'::jsonb
from "plans" p where p."id" = t."plan_id" and p."slug" = 'alta-costura' and t."locale" = 'en';

-- ── Extras: los diez del documento, en su orden y con su precio (siguen apagados) ───────────────
update "addons" set "name" = 'Diseño desde cero', "price_cents" = 30000, "sort_order" = 1 where "slug" = 'diseno-desde-cero';
update "addons" set "name" = 'Entrega express en 24 h', "price_cents" = 15000, "sort_order" = 2 where "slug" = 'express-24h';
update "addons" set "name" = 'Versión extra (otro idioma o solo recepción)', "price_cents" = 20000, "sort_order" = 3 where "slug" = 'version-extra';
update "addons" set "name" = 'Save the date web', "price_cents" = 20000, "sort_order" = 4 where "slug" = 'save-the-date';
update "addons" set "name" = 'Álbum compartido para Atelier o Gala', "price_cents" = 15000, "sort_order" = 5 where "slug" = 'fotos-invitados';
-- El `slug` se queda (lo usan pedidos ya hechos); el extra pasa a 3 meses por Bs 100.
update "addons" set "name" = 'Tiempo extra en línea, 3 meses', "price_cents" = 10000, "amount" = 90, "sort_order" = 6 where "slug" = 'mas-6-meses';
update "addons" set "name" = 'Cambios después de la entrega', "price_cents" = 5000, "sort_order" = 7 where "slug" = 'cambio-adicional';
update "addons" set "name" = 'Día D en el teléfono' where "slug" = 'dia-d';
update "addons" set "name" = 'Video para estados de WhatsApp', "price_cents" = 15000, "sort_order" = 9 where "slug" = 'video-estados';

insert into "addons" ("slug", "name", "price_cents", "effect", "amount", "sort_order") values
  ('tarjetas-qr-mesas', 'Tarjetas QR impresas para las mesas', 15000, 'servicio', 0, 8),
  ('dominio-propio', 'Dominio propio por 1 año', 70000, 'servicio', 0, 10)
on conflict ("slug") do nothing;

-- Los extras que el documento no vende quedan detrás, sin borrar (pueden tener pedidos).
update "addons" set "sort_order" = 20 + "sort_order"
where "slug" in ('cambio-modelo', 'mas-40-grupos', 'express-48h', 'mas-3-porteros', 'sumar-planner', 'dia-d', 'luxury') and "sort_order" < 20;
