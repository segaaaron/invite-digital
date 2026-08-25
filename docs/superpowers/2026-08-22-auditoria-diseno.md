# Auditoría de fidelidad con el diseño entregado — 22 de agosto de 2026

Comparación pantalla por pantalla de lo construido contra las dos fuentes de verdad:

- **Web pública**: `…/Sitio Web Invitaciones Digitales/InvitePremium Ivory.dc.html`
- **Panel**: `docs/design-reference/dashboard/Dashboard.html`

Método: las dos maquetas y la aplicación abiertas en el mismo navegador a 1440 px, y un
recuento automático por sección de medios, títulos y botones. Lo que sigue son hechos
medidos, no impresiones.

## Por qué hubo desvío

1. **Se portó la maqueta solo donde ya había ruta.** Donde la maqueta define una vista
   propia y la aplicación tenía ese contenido dentro de otra pantalla, se enlazó con un
   ancla en vez de crear la vista. Pasó con Invitados —ya corregido— y sigue pasando con
   Configuración.
2. **No se hizo la comparación pantalla por pantalla.** El plan de la piel la exige como
   última tarea (`plans/2026-08-22-piel-del-panel.md`, Task 7) y se saltó.
3. **Se dio por bueno lo no tocado.** La sesión anterior dejó ocho páginas sin vestir.

## Regla que rige de aquí en adelante

Lo que la maqueta enseña, se construye. Lo que la aplicación añade y aporta —modo puerta
sin red, límites por plan, libro de firmas, mesa de regalos— se conserva, **acomodado**
al lenguaje de la maqueta, no colgando fuera de él.

## Web pública

Medios = imágenes, vídeos, lienzos e iconos SVG dentro de la sección.

| Sección | Medios maqueta → app | Desvío |
|---|---|---|
| `top` / `hero` | 9 → 1 | Faltan: banda «ORGANIZADORES QUE CONFÍAN EN NOSOTROS» con tres logos, franja de métricas (480 eventos · 72 h · 94 % · 16 países) y la flecha del botón primario. La navegación dice INVERSIÓN y HABLEMOS donde la maqueta dice CASOS, PRECIOS y CREAR INVITACIÓN; falta la entrada CASOS. El kicker va sin su línea. |
| `experiencia` | 4 → 0 | Las tres tarjetas van **sin imagen**: sobre lacrado, mesa de taller y vídeo con botón de reproducción. Sobra un subrayado bajo el título. |
| `movil` | 5 → 3 | Faltan dos piezas del mockup del teléfono. |
| `colecciones` | 11 → 8 | Faltan tres medios; la app añade flechas Anterior/Siguiente que la maqueta no tiene (añadido útil: acomodarlo al estilo de la maqueta). |
| `diferencia` | 1 → 0 | Falta el medio de la comparativa. |
| `precios` | 14 → 0 | **El más grave.** La maqueta tiene tres tarjetas con su nombre como título, iconografía, lista de incluidos y un CTA por plan («Elegir Atelier →», «Agendar llamada →»). La app pinta la sección sin un solo medio y sin esos CTA. |
| `modelos` | 16 → 8 | Faltan ocho medios: la mitad de las miniaturas. |
| `contacto` | 3 → 0 | Faltan los tres medios de la tarjeta de contacto. |

La app añade dos secciones que la maqueta no tiene: **testimonios** y **FAQ**. Aportan y
se quedan; hay que darles el lenguaje de las demás.

## Panel

| Vista | Estado |
|---|---|
| Resumen | Faltan los paneles **Actividad reciente**, **Distribución de mesas** y **Acciones rápidas**; el gráfico de barras de RSVP por día; la stat **Visitas a la invitación**; los botones de cabecera (Compartir enlace · Exportar lista · + Invitar persona); el crumb «DASHBOARD / BODA» y el título «Bienvenida, X». La app pone en su lugar **Llegada**, **Enlace para el cliente** y **Datos del evento**. |
| Invitados | Existe. Faltan **Exportar CSV**, **Enviar invitaciones**, y las chips **Tal vez** y **VIP**. La tabla de la maqueta es **por persona** —Nombre, Grupo, RSVP, Acompañantes, Restricciones, Mesa, Enviado, Confirmado— y la de la app es por grupo con cupos. |
| Mesas | Faltan **Invitados sin mesa** como panel propio, **Reporte de menús para el catering**, el toggle mapa/tarjetas y los botones de cabecera (Auto-asignar · Imprimir plan · + Añadir mesa). |
| Regalos | Coincide en fondo; faltan los botones de cabecera **+ Añadir regalo** y **+ Añadir fondo** como acciones de la cabecera. |
| Mensajes | Coincide. |
| Check-in | Coincide, salvo **CÓMO FUNCIONA** y **VER TODOS LOS INVITADOS →**. |
| Estadísticas | Faltan **Embudo de conversión**, **Dispositivos** y **Fuentes de tráfico**. La app tiene Embudo, Cupos y Desglose del RSVP. |
| Configuración | **No existe.** La maqueta tiene CUENTA / Configuración del evento con **Detalles del evento** (Guardar cambios · Eliminar evento) y **Vista previa del enlace**. En la app eso vive dentro del Resumen. |
| Plan | Existe. La maqueta lo titula **Tu plan** y ofrece el conmutador MENSUAL / ANUAL · AHORRA 17 %. |
| Ayuda | Existe. Falta el crumb SOPORTE y el panel **Contactar soporte** con su formulario. |

## Lo que exige dato nuevo, no piel

Decisión tomada: **se construye el dato**. Cada punto es un ciclo con su spec y su plan,
no un retoque de pantalla.

1. **Invitado por persona.** La maqueta modela personas —nombre, acompañantes,
   restricciones alimentarias, estado de envío, confirmación— y la aplicación modela
   grupos con cupos. Es la diferencia más profunda de todas: toca esquema, dominio, RSVP,
   mesas y puerta. De aquí salen también las chips «Tal vez» y «VIP» y el reporte de
   menús para el catering.
2. **Analítica de la invitación.** Visitas, dispositivos y fuentes de tráfico. Hoy no se
   registra ninguna visita.
3. **Envío de invitaciones.** «Enviar invitaciones» y la columna «Enviado» son el ciclo 3
   rebanada 2, que sigue sin construirse.
4. **Actividad reciente.** Un registro de eventos del panel que hoy no existe.
5. **Eliminar evento.** No hay caso de uso de borrado.
6. **Precios anuales.** El conmutador mensual/anual exige un precio anual por plan.

## Orden de trabajo propuesto

1. Web pública: medios y precios —es lo que ve un cliente antes de comprar.
2. Panel, lo que es piel pura: Configuración como vista propia, cabeceras con sus
   acciones, títulos y crumbs, paneles que faltan con los datos que **ya** existen.
3. Ciclos nuevos, en este orden: invitado por persona → analítica → envío → actividad.


---

## Estado al cerrar la sesión del 22 de agosto

**Web.** Medios por sección, medidos otra vez contra la maqueta:

| Sección | maqueta → app |
|---|---|
| experiencia · móvil · colecciones · diferencia · precios · contacto | igualadas |
| modelos | 16 → 24 (nuestras tarjetas llevan además la fotografía de la plantilla) |
| hero | 9 → 8 |

Lo único que falta en la portada es el tercer sello de la banda de confianza: son tres
marcadores, y **no se publican nombres de marcas ajenas afirmando que confían en el
atelier**. Lo pone el usuario o se retira la banda.

**Panel.** Todos los paneles que la maqueta enseña existen ya en la aplicación: Estado de
RSVPs, Actividad reciente, Invitados recientes, Distribución de mesas, Acciones rápidas,
Invitados sin mesa, Reporte de menús para el catering, Plano del salón, Buscar a mano,
Progreso de llegada, Últimas llegadas, Embudo de conversión, Dispositivos, Fuentes de
tráfico, Detalles del evento, Vista previa del enlace y Contactar soporte.

Los que la aplicación añade —Llegada, Reparto, Zonas del salón, Grupos y cupos— se quedan:
son funcionalidad construida y verificada que la maqueta no llegó a dibujar.

**Lo construido para llegar hasta aquí**, cada uno con su spec o su nota en `CLAUDE.md`:
analítica de la invitación, invitados por persona con restricciones y menús, actividad
reciente, columna «Enviado», moneda por evento, privacidad con contraseña y borrado de
evento.

## Lo único que queda, y por qué no lo decido yo

**El conmutador MENSUAL / ANUAL · AHORRA 17 % de la vista «Tu plan».** No se ha construido
porque contradice el propio producto: la web vende **pago único por evento** —Bs 690,
Bs 1.450 y Bs 2.900— y el panel de la maqueta enseña una suscripción. Construir el
conmutador exige decidir antes qué se cobra cada mes cuando lo que se entrega es una
invitación para una fecha concreta. Es una decisión comercial del usuario, no técnica.

**«Enviar invitaciones»** sigue siendo el ciclo 3 rebanada 2 —WhatsApp asistido,
importación CSV, QR de reparto—, que nunca se planificó. La columna «Enviado» ya existe y
se marca a mano.

---

## Corrección del 25 de agosto

Lo que la sección de arriba da por pendiente ya no lo está, y conviene decirlo aquí en vez
de reescribirla: un documento fechado cuenta lo que se sabía ese día.

**«Enviar invitaciones» se construyó esa misma tarde**, en `b9b18a7`, unas horas después
de cerrar esta auditoría. Reenviar rota el token, cada grupo lleva teléfono, WhatsApp se
abre con el mensaje del evento ya escrito, la plantilla vive en `events.message_template`
y la importación de CSV devuelve la tabla fila por fila. Quedan fuera el **QR de reparto**
y el **canal correo**.

**El conmutador MENSUAL / ANUAL sigue sin construirse**, y por el mismo motivo: es una
decisión comercial. `BillingToggle` existe y solo se pinta si algún plan tiene precio
anual; hoy ninguno lo tiene, así que no aparece. Eso es lo correcto mientras se cobre una
vez por evento.

**El tercer sello de la banda de confianza tampoco se ha puesto**, y no se pondrá desde
aquí: `pnpm preflight` corta si quedan los marcadores.
