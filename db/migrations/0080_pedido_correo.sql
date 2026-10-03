-- El pedido de la web pide WhatsApp **y** correo por separado: al aprobarlo, sin correo no se
-- crea la cuenta del cliente ni su evento. Los pedidos anteriores lo tienen en `contact` o nada.
alter table "orders" add column if not exists "email" varchar(160);
