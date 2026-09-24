-- Un pedido aprobado sin fecha de decisión hacía que «Hoy» y «Ingresos» no cuadraran: uno lo
-- contaba como aprobado y el otro no. La base ya no lo acepta; los que había toman la fecha de
-- creación, la mejor aproximación que queda.
--
-- El importe NO se exige aquí, a propósito: un pedido sin importe congelado (anteriores a la
-- 0037) no podría aprobarse, y dejar a alguien que pagó sin su evento es peor que el aviso
-- «sin importe» que ya da Ingresos. Se probó y la e2e del pedido a boda lo cazó.
update orders set decided_at = created_at where status = 'approved' and decided_at is null;

alter table orders drop constraint if exists orders_aprobado_con_fecha;
alter table orders add constraint orders_aprobado_con_fecha check (status <> 'approved' or decided_at is not null);

alter table orders drop constraint if exists orders_aprobado_con_importe;
