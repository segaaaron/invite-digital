-- Cuándo se le mandó la invitación a un grupo. La columna «Enviado» de la maqueta.
--
-- Es una marca del atelier, no una prueba de entrega: el envío va por WhatsApp, correo o
-- papel, y ninguno de esos caminos avisa de vuelta. Decir «entregado» sería mentir; lo
-- que se guarda es que el atelier dio el enlace por repartido.
alter table guest_groups add column if not exists invitation_sent_at timestamptz;
