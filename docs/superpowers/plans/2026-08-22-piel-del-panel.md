# La piel del panel — Plan de implementación

> **Para agentes ejecutores:** REQUIRED SUB-SKILL: usa `superpowers:executing-plans`. Los pasos usan casillas (`- [ ]`).

**Objetivo:** que el panel se vea como el diseño que el usuario entregó. Toda la funcionalidad existe y está probada; lo que falta es el lenguaje visual.

**Esto NO cambia comportamiento.** Las 1101 pruebas unitarias y las 42 e2e tienen que seguir verdes al terminar. Si una empieza a fallar, es que se tocó lógica: deshaz y replantea.

**Referencia visual, exacta y disponible:** `docs/design-reference/dashboard/Dashboard.html`. Ábrela y míralas. No inventes un diseño: **pórtalo**.

## El problema

El panel se construyó sobre la maqueta minimalista que ya existía —columna centrada, sin barra lateral, números sueltos sobre fondo blanco—. El diseño entregado es otra cosa: barra lateral oscura fija, tarjetas con sombra, donut de RSVP, gráfico de barras, tabla con filtros y píldoras de color, fondo marfil con degradados.

## Restricciones globales

- **Ningún color hexadecimal fuera de `src/shared/design/tokens.css`.** Los tokens que falten se añaden ahí, no sueltos en un componente.
- Toda animación respeta `prefers-reduced-motion: reduce`.
- Prohibido `any` y `@ts-ignore`.
- El panel es solo español, con literales en el código.
- `pnpm typecheck && pnpm lint && pnpm test` en verde antes de cada commit.
- **No toques ninguna Server Action, caso de uso, dominio ni consulta.** Solo `ui/`, `layout.tsx`, `page.tsx` y `tokens.css`.
- Prefijo: `DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000`

**Regla de oro:** si para que algo se vea bien necesitas cambiar lo que una función devuelve, **para y dilo**. Esta rebanada es piel.

---

## Task 1: Tokens que faltan

**Archivos:** `src/shared/design/tokens.css`; su test si existe

La referencia usa cosas que hoy no tienen token: el fondo oscuro de la barra lateral, el degradado marfil del cuerpo, y el verde salvia de los acentos de dato.

- [ ] **Paso 1:** abre `docs/design-reference/dashboard/Dashboard.html` y saca los valores reales del bloque `:root` y del `body`.
- [ ] **Paso 2:** añade a `tokens.css` los que falten, con nombres semánticos, no literales: `--color-sidebar`, `--color-sidebar-deep`, `--color-sidebar-ink`, `--color-sage`, `--color-sage-deep`, y el degradado del cuerpo.
- [ ] **Paso 3:** `pnpm lint` y commit `feat: tokens del lenguaje visual del panel`

---

## Task 2: La carcasa — barra lateral y fondo

**Archivos:** crear `src/modules/shell/ui/PanelShell.tsx`, `SidebarNav.tsx` y sus tests; modificar `src/app/(panel)/layout.tsx`

Es el cambio que más se nota y el que ordena todo lo demás.

- [ ] **Paso 1: prueba que falla** — cubre:
  - la barra lateral lista las secciones del evento con su icono y su texto;
  - **la sección actual se marca como activa y lo declara con `aria-current="page"`**, no solo con color;
  - los contadores (mensajes sin leer, llegadas) aparecen cuando son mayores que cero y **no aparecen cuando son cero**;
  - en el nivel raíz —sin evento— la barra muestra solo lo que aplica: eventos y ayuda;
  - **por debajo de 860 px la barra pasa a una tira horizontal superior**, como en la referencia.
- [ ] **Paso 2:** ejecutar → FALLA
- [ ] **Paso 3:** implementar. El cuerpo recibe el degradado marfil. La barra es fija y no se desplaza con el contenido.
- [ ] **Paso 4:** ejecutar → PASA
- [ ] **Paso 5:** commit `feat: barra lateral fija y fondo del panel`

**Esto retira la cabecera de botones sueltos**, que además se rompía: con un título de tres palabras se partía en tres líneas y «Volver» se salía del borde.

---

## Task 3: Tarjetas de dato

**Archivos:** crear `src/modules/shell/ui/StatCard.tsx`, `PanelCard.tsx` y sus tests

- [ ] **Paso 1: prueba que falla** — cubre: la tarjeta muestra etiqueta, valor y detalle opcional; acepta una barra de progreso opcional que **nunca pasa del 100 %**; el icono de fondo es decorativo y va con `aria-hidden`; sin detalle no deja hueco vacío.
- [ ] **Paso 2–5:** ciclo TDD y commit `feat: tarjetas de dato del panel`

**Las cifras van en monoespaciada, no en Cormorant.** En la tipografía de marca el `1` se lee como `I` y el `0` como `()`; ya se detectó en la puerta y vuelve a pasar en «1 GRUPOS PENDIENTES». Los títulos siguen en Cormorant; **solo las cifras cambian**.

---

## Task 4: Donut de RSVP y barras

**Archivos:** crear `src/modules/shell/ui/DonutChart.tsx`, `BarChart.tsx` y sus tests

- [ ] **Paso 1: prueba que falla** — cubre:
  - el donut dibuja un arco por segmento y **la suma de los arcos nunca pasa de 100**;
  - con todo a cero dibuja el aro vacío y lo dice con texto, sin dividir por cero ni pintar `NaN`;
  - **el donut es accesible**: `role="img"` con un `aria-label` que enuncia los valores, porque un gráfico que solo se ve deja fuera a quien no ve;
  - las barras escalan al valor máximo y con todos a cero no colapsan a altura negativa;
  - con `prefers-reduced-motion` no hay animación de entrada.
- [ ] **Paso 2–5:** ciclo TDD y commit `feat: donut de RSVP y gráfico de barras`

SVG en línea, sin librerías: son dos formas y añadir una dependencia de gráficos para esto es desproporcionado.

---

## Task 5: Tabla de invitados con filtros

**Archivos:** modificar `src/modules/guests/ui/GuestGroupTable.tsx` y su test

- [ ] **Paso 1: prueba que falla** — cubre: filtros todos / confirmados / pendientes / revocados; el estado se muestra como píldora de color **y con texto**, nunca solo color; el buscador filtra por etiqueta; sin resultados lo dice; **las pruebas que ya existían siguen pasando sin tocarlas**.
- [ ] **Paso 2–5:** ciclo TDD y commit `feat: tabla de invitados con filtros y estados en píldora`

---

## Task 6: Aplicar la piel a las nueve páginas

**Archivos:** las `page.tsx` de `(panel)` y los componentes que haga falta

- [ ] **Paso 1:** aplica `PanelShell`, `PanelCard` y `StatCard` a: bandeja de eventos, evento, mesas, regalos, mensajes, plan, estadísticas, puerta y ayuda.
- [ ] **Paso 2:** el resumen del evento usa el donut de RSVP y las tarjetas de dato, como la referencia.
- [ ] **Paso 3:** **el modo puerta NO se toca.** Ya tiene su propio diseño a pantalla completa, probado, y es la única pantalla que se usa con poca luz y prisa.
- [ ] **Paso 4:** suite completa. **Si alguna e2e falla por un selector que cambió, arregla el selector, nunca la aserción.**
- [ ] **Paso 5:** commit `feat: el panel entero adopta el lenguaje visual del diseño`

---

## Task 7: Verificación visual, no solo pruebas

- [ ] **Paso 1:** `pnpm build` y arranca en el 3200.
- [ ] **Paso 2:** **abre cada página en un navegador y compárala con la referencia.** Las pruebas no ven si algo se sale del borde, se solapa o queda ilegible. Este plan existe justo porque todo estaba verde y aun así no se parecía al diseño.
- [ ] **Paso 3:** comprueba en ancho de móvil (390 px) que nada se sale y que la barra lateral pasa a tira superior.
- [ ] **Paso 4:** suite completa: `test`, `typecheck`, `lint`, `verify:boundaries`, `build`, `test:e2e`.
- [ ] **Paso 5:** actualiza `CLAUDE.md` y commit `chore: el panel ya viste el diseño entregado`

---

## Autorrevisión

**Lo que puede salir mal:** tocar lógica para que algo encaje visualmente. La señal de alarma es una prueba unitaria que falla — esas prueban comportamiento, no aspecto. Si una falla, se ha cruzado la línea.

**Lo que este plan corrige además:** la cabecera que se rompía con títulos largos, y las cifras en Cormorant donde el `1` se lee como `I`.

**Lo que no se toca:** el modo puerta, que ya tiene su diseño propio y verificado.
