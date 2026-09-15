-- Precios y grupos confirmados por el usuario el 15 de septiembre de 2026:
-- Atelier 690 Bs · 40 grupos, Firma 3D 1.190 Bs · 120 grupos, Alta Costura 1.990 Bs · sin límite.
-- Y el desglose de cada plan, que describe lo que el servidor corta de verdad. Las
-- traducciones de producción nunca recibieron los textos honestos del 14 de septiembre
-- (el seed ya no las pisa): seguían prometiendo «3D real», dominio propio y papelería.
-- Solo pisa los valores anteriores: lo que el admin haya cambiado desde el panel se queda,
-- y una segunda pasada no hace nada.
update "plans" set "price_cents" = 119000 where "slug" = 'firma-3d' and "price_cents" = 145000;
update "plans" set "price_cents" = 199000 where "slug" = 'alta-costura' and "price_cents" = 290000;
update "plans" set "max_guest_groups" = 40 where "slug" = 'atelier' and "max_guest_groups" = 30;
update "plans" set "max_guest_groups" = 120 where "slug" = 'firma-3d' and "max_guest_groups" = 80;

-- Solo se reemplazan las dos versiones que escribió el seed; un texto editado en el panel se queda.

update "plan_translations" t set "tagline" = 'Tu invitación, lista', "description" = 'Tu invitación digital con confirmación de asistencia, mesas y plan de tareas.',
  "features" = '["Invitación con portada animada y música", "Hasta 40 grupos de invitados", "Confirmación de asistencia con panel en vivo", "Mesas y plano del salón", "Plan de tareas y presupuesto", "8 fotos en la galería y 60 días en línea"]'::jsonb
from "plans" p
where p."id" = t."plan_id" and p."slug" = 'atelier' and t."locale" = 'es'
  and t."features" in ('["Sobre animado y sello de cera", "Galería de 8 fotografías", "Cuenta regresiva y mapa", "RSVP a WhatsApp"]'::jsonb, '["Portada con sobre animado", "Galería de fotos", "Cuenta regresiva, mapa e itinerario", "Confirmación de asistencia con panel en vivo", "Mesas y plano del salón"]'::jsonb);

update "plan_translations" t set "tagline" = 'Your invitation, ready', "description" = 'Your digital invitation with RSVP, tables and a task plan.',
  "features" = '["Invitation with animated cover and music", "Up to 40 guest groups", "RSVP with a live dashboard", "Tables and floor plan", "Task plan and budget", "8 gallery photos and 60 days online"]'::jsonb
from "plans" p
where p."id" = t."plan_id" and p."slug" = 'atelier' and t."locale" = 'en'
  and t."features" in ('["Animated envelope and wax seal", "Eight-photograph gallery", "Countdown and map", "RSVP straight to WhatsApp"]'::jsonb, '["Animated envelope cover", "Photo gallery", "Countdown, map and itinerary", "RSVP with a live dashboard", "Tables and floor plan"]'::jsonb);

update "plan_translations" t set "tagline" = 'Organiza todo el día', "description" = 'Invitados, regalos, la puerta con pases QR y el día del evento, en un solo panel.',
  "features" = '["Todo lo de Atelier", "Hasta 120 grupos e importación desde CSV", "Mesa de regalos y fondos", "Pases QR, modo puerta y 3 porteros", "Proveedores, cronograma, cortejo y documentos", "Fotos de los invitados y contraseña", "3 co-anfitriones y tu planner sin costo", "20 fotos, 180 días en línea y cambio de modelo antes de repartir"]'::jsonb
from "plans" p
where p."id" = t."plan_id" and p."slug" = 'firma-3d' and t."locale" = 'es'
  and t."features" in ('["Todo lo de Atelier", "Apertura de sobre en 3D real", "Música y transiciones cinemáticas", "Panel de RSVP en vivo + mesas", "Dominio propio 12 meses"]'::jsonb, '["Todo lo de Atelier", "Mesa de regalos y fondos", "Pases con QR y modo puerta sin conexión", "Música de fondo"]'::jsonb);

update "plan_translations" t set "tagline" = 'Run the whole day', "description" = 'Guests, registry, the door with QR passes and the event day, in one dashboard.',
  "features" = '["Everything in Atelier", "Up to 120 guest groups and CSV import", "Gift registry and cash funds", "QR passes, door mode and 3 door staff", "Vendors, run sheet, wedding party and documents", "Guest photos and password", "3 co-hosts and your planner at no cost", "20 photos, 180 days online and design change before sending"]'::jsonb
from "plans" p
where p."id" = t."plan_id" and p."slug" = 'firma-3d' and t."locale" = 'en'
  and t."features" in ('["Everything in Atelier", "True 3D envelope opening", "Music and cinematic transitions", "Live RSVP panel and seating", "Your own domain for 12 months"]'::jsonb, '["Everything in Atelier", "Gift registry and cash funds", "QR passes and offline door mode", "Background music"]'::jsonb);

update "plan_translations" t set "tagline" = 'Lo hacemos contigo', "description" = 'Todo lo de Firma 3D sin límites, con el Día D y una persona asignada.',
  "features" = '["Todo lo de Firma 3D", "Invitados y fotos sin límite", "Día D en el teléfono y enlaces para proveedores", "10 porteros", "Co-anfitriones y planners sin límite", "Cambio de modelo cuando quieras", "365 días en línea", "Atención de una persona asignada"]'::jsonb
from "plans" p
where p."id" = t."plan_id" and p."slug" = 'alta-costura' and t."locale" = 'es'
  and t."features" in ('["Todo lo de Firma 3D", "Monograma e ilustración a mano", "Save the date + agradecimiento", "Papelería imprimible coordinada", "Concierge dedicado"]'::jsonb, '["Todo lo de Firma 3D", "Invitados sin límite", "Atención de una persona asignada"]'::jsonb);

update "plan_translations" t set "tagline" = 'We do it with you', "description" = 'Everything in Signature 3D without limits, with Day-of and a dedicated person.',
  "features" = '["Everything in Signature 3D", "Unlimited guests and photos", "Day-of on your phone and vendor links", "10 door staff", "Unlimited co-hosts and planners", "Change design anytime", "365 days online", "A dedicated person"]'::jsonb
from "plans" p
where p."id" = t."plan_id" and p."slug" = 'alta-costura' and t."locale" = 'en'
  and t."features" in ('["Everything in Signature 3D", "Hand-drawn monogram and illustration", "Save the date and thank-you piece", "Coordinated printable stationery", "Dedicated concierge"]'::jsonb, '["Everything in Signature 3D", "Unlimited guests", "A dedicated person"]'::jsonb);
