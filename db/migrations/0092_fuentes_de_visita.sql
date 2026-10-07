-- «Por dónde les llega» con cada forma de envío (6 de octubre): el enlace sale marcado con su
-- canal (`?utm_source=…`) y la visita se guarda con él. Antes solo había cuatro y casi todo caía
-- en «Directo», porque WhatsApp no dice de dónde viene. Las visitas ya guardadas no cambian.
alter table "invitation_views" drop constraint if exists "invitation_views_source_check";
alter table "invitation_views" add constraint "invitation_views_source_check"
  check (source in ('whatsapp', 'qr', 'correo', 'sms', 'enlace', 'mensaje', 'compartir', 'general', 'direct', 'other'));
