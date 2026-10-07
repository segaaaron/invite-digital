-- El admin entra al panel de **cualquier** evento: con cliente, como el cliente; sin cliente
-- («lo llevas tú»), como anfitrión de ese evento. Ese modo soporte no tiene cuenta de cliente.
alter table "support_sessions" alter column "client_user_id" drop not null;
