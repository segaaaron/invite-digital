# Roadmap del motor de QR

Fecha: 25 de agosto de 2026 · Página legible: artifact `0886b683`

## El hallazgo que reordena el plan

En Bolivia el QR de cobro es un instrumento **regulado**. El QR BCB es interoperable entre
todo el sistema financiero, y los códigos de QR Simple van cifrados y firmados
digitalmente por la entidad emisora.

**Ningún QR que mueva dinero puede salir de nuestro servidor.** O se sube la imagen que
genera el banco, o se pide a una API regulada que acuñe uno por pedido. No hay tercera
vía, y cualquier plan que la suponga está mal desde la primera línea.

| | QR estático | QR dinámico |
|---|---|---|
| Quién lo acuña | El banco, una vez | Una API, en cada pedido |
| Lleva el monto | No | Sí, con glosa |
| Conciliación | A mano, con comprobantes | Webhook: el pedido se aprueba solo |
| Coste | Cero | Bs 1.200 de alta + Bs 250/mes (CUCU) |
| Requisitos | Ninguno | Empresa con NIT y cuenta vinculada |

Además de agregadores —CUCU, Xmart—, **BCP** y **BISA** publican su propia API de cobros
QR. La decisión no es técnica: es de coste y de con quién se tiene la relación.

## Lo que ya está construido, y no se toca

- **El pase de check-in por invitado.** El enlace de invitación *es* el pase: el invitado
  ve su QR en su propia invitación, la hoja de reparto imprime una tarjeta por grupo, y la
  puerta lo escanea sin red.
- **El dibujo del QR.** SVG con corrección **M** —lo recomendado para papel—, a 3,4 cm en
  la hoja de reparto y 4,2 cm en el pase, por encima del mínimo práctico de 2,5 cm.

## La decisión que atraviesa lo demás: dinámicos

Un QR estático lleva la dirección final dentro; si esa tienda cambia el enlace, el código
impreso queda muerto y ya está en el salón. Uno dinámico lleva una dirección **nuestra**
(`/r/<id>`) que redirige.

Compra dos cosas que no se pueden añadir después: **cambiar el destino de algo ya impreso**
y **contar los escaneos**. Y de paso resuelve «ver los que creé en el panel»: una lista de
QR solo existe si los QR son entidades nuestras. Un código estático es una imagen, no una
entidad.

## Las fases

| # | Fase | Estado | Necesita del usuario |
|---|---|---|---|
| 0 | Datos de cobro editables desde el panel | En curso | La imagen del QR de su banco |
| 1 | El motor: tabla, ruta `/r/<id>` y su panel | Siguiente | Nada |
| 2 | Carteles imprimibles para el salón | — | Nada |
| 3 | QR de pago dinámico con webhook | Bloqueada | NIT, empresa, proveedor |
| 4 | El pase, guardable (instalable o Wallet) | — | Cuenta de desarrollador para Wallet |

**Fase 0.** Banco, titular, cuenta y la imagen salen de `BRAND.payment` —del código— y
pasan a `app_settings`, editables por el admin. Van al admin y no a cada atelier a
propósito: los pedidos del Plan B compran planes de InvitePremium, y ese dinero va a una
sola cuenta.

**Fase 1.** Con el motor, cada caso nuevo es **un dato, no código**: enlace a una tienda,
la mesa de regalos, el libro de firmas, o cualquier dirección. Aquí caen tres de las cinco
peticiones a la vez.

**Fase 2.** La regla de tamaño para un cartel: **1 cm de ancho por cada 10 cm de distancia
de lectura**. Reutiliza `printMarkedOnly` y la hoja de reparto.

**Fase 3.** Ojo con lo que implica: **deja obsoleta la mitad del Plan B ya construido.** Si
el pago se concilia solo, el cliente no sube comprobante y el atelier no revisa nada. La
subida se queda solo para quien transfiera por fuera.

**Fase 4.** Lo único que le falta al check-in: que el invitado pueda **guardar** su pase en
vez de buscar el mensaje de WhatsApp en la puerta, de noche y con gente detrás.

## Lo que hay que preguntar antes de la fase 1

**El QR de regalos, ¿quién lo escanea?** ¿El invitado, para elegir un regalo de la mesa? ¿O
la pareja, para cargar los suyos? Cambia a dónde apunta el código, y no se adivina.

## Fuentes

- Pagos QR BCB — Banco Central de Bolivia: <https://www.bcb.gob.bo/?q=pagos_qr_bcb_bolivia>
- ASFI, el uso del QR en Bolivia: <https://www.asfi.gob.bo/sites/default/files/2025-07/El%20uso%20del%20QR%20ha%20dinamizado%20el%20sistema%20de%20pagos%20en%20Bolivia.pdf>
- CUCU, API QR Simple: <https://cucu.bo/qr>
- BCP, API Pagos QR: <https://www.bcp.com.bo/Desarrollo/ApiPagosQR>
- BISA QR para Empresas: <https://www.bisa.com/empresas/bisa-QR>
- Uniqode, tamaño de QR para impresión: <https://www.uniqode.com/blog/qr-code-best-practices/how-to-perfectly-size-your-qr-codes>
