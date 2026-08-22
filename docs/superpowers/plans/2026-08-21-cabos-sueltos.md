# Cierre de cabos sueltos del ciclo 4 — Plan de implementación

> **Para agentes ejecutores:** REQUIRED SUB-SKILL: usa `superpowers:executing-plans`. Los pasos usan casillas (`- [ ]`).

**Objetivo:** cerrar las seis cosas que quedaron a medias tras las cuatro rebanadas del ciclo 4. Ninguna rompe lo construido; todas son huecos que un usuario encuentra el primer día.

**Contexto:** las cuatro rebanadas están cerradas y verificadas — 992 pruebas unitarias, 42 e2e, typecheck, lint, `verify:boundaries` y build en verde. Este plan **no cambia ningún diseño**, solo termina lo empezado.

## Restricciones globales

Las mismas del plan del check-in (`docs/superpowers/plans/2026-08-21-checkin-qr.md`). **Aplican todas.** Las críticas:

- Prefijo: `DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000`
- `domain` puro; `application` nunca importa `infrastructure`; solo `src/app` los une.
- **`registry` no importa `plans`.** La capacidad entra como argumento, resuelta por la acción o la página.
- Ningún hexadecimal fuera de `src/shared/design/tokens.css`.
- Acciones del panel: `await requireSession()`. Acciones del invitado: por token.
- Los textos de la página del invitado van por diccionario (`dictionary.ts`, `es.ts`, `en.ts`, mismo commit).
- Prohibido `any` y `@ts-ignore`. Errores con `Result`.
- `pnpm typecheck && pnpm lint && pnpm test` en verde antes de cada commit.
- Las e2e locales necesitan `pnpm build` antes.
- **No elimines ni relajes ninguna prueba existente.**

---

## Task 1: Editar un regalo

**Archivos:** modificar `src/modules/registry/ui/GiftForm.tsx` y `GiftList.tsx`; sus tests

`updateGiftAction` existe, está probada y **no la llama nadie**. Hoy te equivocas al escribir un precio y solo puedes borrar el regalo y volver a crearlo — perdiendo de paso quién lo había reservado.

- [ ] **Paso 1: prueba que falla** — cubre:
  - el formulario en modo edición llega **relleno** con los valores actuales;
  - guardar llama a `updateGiftAction` con el id y los campos cambiados;
  - un importe inválido no llama a la acción;
  - **editar un regalo reservado conserva quién lo reservó** (la reserva no se pierde por corregir un precio);
  - cancelar no llama a nada.
- [ ] **Paso 2:** ejecutar → FALLA
- [ ] **Paso 3:** implementar. Reutiliza `GiftForm` con un modo edición; no dupliques el formulario.
- [ ] **Paso 4:** ejecutar → PASA
- [ ] **Paso 5:** commit `feat: editar un regalo sin perder su reserva`

---

## Task 2: Editar un fondo

**Archivos:** modificar `src/modules/registry/ui/FundForm.tsx` y `FundCard.tsx`; sus tests

`updateFundAction` está en la misma situación.

- [ ] **Paso 1: prueba que falla** — cubre: el formulario llega relleno; guardar llama a `updateFundAction`; una meta inválida no llama a la acción; **bajar la meta por debajo de lo ya recaudado se permite y la barra sigue recortada al 100 %** con el aviso de superada; cancelar no llama a nada.
- [ ] **Paso 2–5:** ciclo TDD y commit `feat: editar un fondo, incluso por debajo de lo recaudado`

Bajar la meta por debajo de lo recaudado es legítimo —la pareja ajusta su objetivo— y no puede romper la barra.

---

## Task 3: Dar uso a `getDoorState` o retirarlo

**Archivos:** modificar `src/app/(panel)/panel/eventos/[slug]/page.tsx` y `src/modules/checkin/ui/`; sus tests

`getDoorState` está construido y probado, y **no lo usa nadie**. Código muerto probado sigue siendo código muerto.

Tiene un uso claro: la página del evento no dice cuánta gente ha llegado, y ese es justo el dato que el atelier mira desde el móvil durante la recepción.

- [ ] **Paso 1: prueba que falla** — cubre: la página del evento muestra «N de M grupos llegaron» y las personas dentro; **sin ninguna llegada muestra el estado inicial, no un hueco vacío**; si el evento no incluye check-in en su plan, la tira no aparece.
- [ ] **Paso 2:** ejecutar → FALLA
- [ ] **Paso 3:** implementar una tira de llegada en la página del evento, alimentada por `getDoorState`.
- [ ] **Paso 4:** ejecutar → PASA
- [ ] **Paso 5:** commit `feat: la página del evento muestra cuánta gente ha llegado`

Si al implementarlo concluyes que `getDoorState` es redundante con `getDoorManifest` y la tira se alimenta mejor de este último, **retíralo con sus pruebas y dilo en el informe**. Lo que no puede quedarse es construido y sin usar.

---

## Task 4: El plan cierra también el lado del invitado

**Archivos:** modificar `src/app/(guest)/i/[token]/page.tsx`, `src/modules/registry/ui/GuestRegistry.tsx`, `src/modules/registry/actions.ts`; sus tests

Hoy, si un evento baja a un plan sin mesa de regalos, **el invitado sigue viendo la lista y puede reservar**. Las acciones del panel están cerradas; la puerta del invitado no.

**Decisión del usuario: congelar, no ocultar.**

- Lo ya reservado **se sigue viendo**, para que quien reservó no compre dos veces.
- **No se puede reservar nada nuevo.**
- **No se puede liberar**: liberar devolvería el regalo a un catálogo cerrado.
- Un aviso explica que la lista está cerrada.

Ocultarla entera haría que alguien que ya reservó la cafetera creyera que no reservó nada.

- [ ] **Paso 1: prueba que falla** — cubre:
  - con `registry` incluido, todo funciona como hasta ahora;
  - **sin `registry` incluido, el invitado que reservó sigue viendo su reserva**;
  - sin `registry`, no hay botón de reservar en ningún regalo;
  - **`claimGiftAction` rechaza con `feature_not_included` aunque se llame directamente** — desactivar un botón no protege nada;
  - `releaseGiftAction` también se rechaza;
  - los fondos siguen la misma regla.
- [ ] **Paso 2:** ejecutar → FALLA
- [ ] **Paso 3:** implementar. La capacidad la resuelve la página o la acción y entra **como argumento**: `registry` no importa `plans`.
- [ ] **Paso 4:** ejecutar → PASA
- [ ] **Paso 5:** `pnpm verify:boundaries` y commit `feat: sin el plan, la mesa de regalos se congela en vez de desaparecer`

---

## Task 5: Estadísticas del evento

**Archivos:** crear `src/app/(panel)/panel/eventos/[slug]/estadisticas/page.tsx` y `src/modules/rsvp/ui/` lo que haga falta; sus tests

Hoy hay contadores sueltos pero no la vista. Se construye **solo con datos que ya existen**: nada de inventar métricas que nadie mide.

- [ ] **Paso 1: prueba que falla** — cubre:
  - el embudo con los datos reales: invitados, respondieron, confirmaron;
  - el desglose de RSVP: asisten, no asisten, sin responder;
  - **si el evento no tiene invitados, la vista lo dice en vez de pintar ceros y porcentajes con división por cero**;
  - los porcentajes suman 100 salvo redondeo, y nunca se pinta `NaN`.
- [ ] **Paso 2–5:** ciclo TDD y commit `feat: vista de estadísticas del evento con los datos que ya existen`

**No inventes métricas.** La maqueta mostraba dispositivos y fuentes de tráfico, que **no se miden en ninguna parte**. No las pongas con datos falsos: o se miden de verdad en otra rebanada, o no salen.

---

## Task 6: Ayuda

**Archivos:** crear `src/app/(panel)/panel/ayuda/page.tsx`; su test

- [ ] **Paso 1: prueba que falla** — cubre: la página lista las preguntas; cada una se abre y se cierra; el enlace de contacto usa el WhatsApp y el correo de `src/shared/config/brand.ts`, **no valores escritos a mano**.
- [ ] **Paso 2:** ejecutar → FALLA
- [ ] **Paso 3:** implementar. Las preguntas cubren lo que este panel hace de verdad: cómo crear un evento, cómo repartir enlaces, cómo funciona el modo puerta y su modo sin conexión, cómo asignar mesas, cómo funciona la mesa de regalos, y qué significan los límites del plan.

**No copies el FAQ de la maqueta**: hablaba de funciones que no existen aquí y de otra marca.

Que el contacto salga de `brand.ts` importa: hoy son marcadores que `pnpm preflight` vigila, y escribirlos a mano crearía una copia que la puerta de despliegue no puede ver.

- [ ] **Paso 4:** ejecutar → PASA
- [ ] **Paso 5:** commit `feat: centro de ayuda del panel, con el contacto desde brand.ts`

---

## Task 7: Cierre

- [ ] **Paso 1:** comprueba que **no queda ninguna acción ni caso de uso construido sin usar**. Busca los exportados de cada `actions.ts` y de cada `application/` y confirma que algo los llama. Lo que quede huérfano: úsalo o retíralo con sus pruebas, y dilo.
- [ ] **Paso 2:** suite completa en este orden: `pnpm test`, `typecheck`, `lint`, `verify:boundaries`, `pnpm build`, `pnpm test:e2e`.
- [ ] **Paso 3:** actualiza `CLAUDE.md`: ciclo 4 cerrado del todo, sin cabos sueltos.
- [ ] **Paso 4:** commit `chore: ciclo 4 sin cabos sueltos`

---

## Autorrevisión

**Los seis cabos, y por qué cada uno importa:** 1 y 2, código probado que ninguna pantalla alcanza — no puedes corregir un precio mal escrito. 3, código muerto. 4, una puerta del invitado que el plan no cierra. 5 y 6, dos vistas que la maqueta prometía.

**La trampa de la Task 5** es inventar métricas para llenar la pantalla. Dispositivos y fuentes de tráfico **no se miden**: pintarlas con datos plausibles sería mentir en un panel que alguien usará para decidir.

**La trampa de la Task 4** es cerrarlo entero. Un invitado que ya reservó y de pronto no ve nada compra el regalo dos veces.
