-- Ajustes del sistema que el administrador cambia sin desplegar.
--
-- Nace con los datos de cobro del Plan B: banco, titular, cuenta y el QR. Estaban en
-- `BRAND.payment`, es decir en el código, y cambiar un número de cuenta exigía un
-- despliegue. No son datos de cada atelier: los pedidos del Plan B compran planes de
-- InvitePremium, y ese dinero va a una sola cuenta.
--
-- Clave y valor, no una columna por ajuste: cada ajuste nuevo sería una migración, y son
-- cadenas que solo lee la pantalla que las enseña. Si algún día hubiera que consultarlos
-- por su contenido, es la señal de que ese ajuste merece su propia tabla.
--
-- Reaplicable: toda migración escrita a mano tiene que poder correrse dos veces.
create table if not exists app_settings (
  key varchar(64) primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
