# Handoff — 19 de agosto de 2026 (segunda sesión)

Sesión larga. Se limpió el sitio de datos inventados, se fusionó el ciclo 1 a `main` y se
construyó entera la rebanada 1 del ciclo 3: el motor de invitaciones y RSVP. El árbol
está limpio y todo verde.

## Qué pasó hoy

**Cifras y testimonios inventados fuera** (`9247e3c`). `StatsStrip` publicaba "320+
eventos", "94% de confirmación RSVP" y "7 países" como hechos del negocio; venían del
diseño Ivory. Se borró la sección entera con sus claves de diccionario. De los
testimonios queda solo Daniela Ortiz, el único real.

**Ciclo 1 fusionado a `main`** (`671b244`). La rama `feat/sitio-publico` se borró tras
verificar el árbol fusionado.

**Rebanada 1 del ciclo 3 construida**, 16 tareas con TDD, sobre `feat/motor-invitaciones`:

| Tarea | Commit | Qué entrega |
|---|---|---|
| 1 Layout raíz | `fe13eb9` | Tres raíces por grupo de rutas; proxy y robots corregidos |
| 2 Esquema | `ef994e1` | Seis tablas, citext, hash de token; probado en base limpia |
| 3–5 Identidad | `…`, `00411bc`, `a4dc629` | Credencial, sesión deslizante, Argon2id, alta por consola |
| 6 Panel: sesión | `48959c6` | `/panel/entrar`, cookie httpOnly, límite por IP y por cuenta |
| 7–8 Eventos | `…`, `bd3f2ae` | Dominio con plazo, bandeja, alta y registro de plantillas |
| 9–10 Invitados | `…`, `612c8f7` | Grupos con cupos, enlace único, revocación |
| 11–12 RSVP | `…`, `58860a6` | Respuesta anexada con histórico, contadores en vivo |
| 13 Invitado | `aacf8f4` | `/i/{token}`: plantilla, formulario, cierre por plazo, 404 y 503 |
| 14 Cliente | `bd0d957` | `/compartir/{token}` de solo lectura, revocable y con caducidad |
| 15 Retención | `8aa0223` | Anonimización por retención y barrido de sesiones, a diario |
| 16 Verificación | este | Prueba de que el token no se guarda, e2e y documentación |

## Estado verificable

- Rama `feat/motor-invitaciones`, **sin fusionar**.
- 311 pruebas unitarias y 28 e2e verdes. `pnpm typecheck` y `pnpm lint` sin errores.
- Pila Docker completa probada: migraciones, seed, alta de usuario, mantenimiento, panel
  con redirección sin sesión, invitación inexistente con 404, y **Argon2 vivo dentro del
  contenedor** (`require('@node-rs/argon2')` responde).
- Anonimización comprobada a mano contra la base: etiquetas a "Grupo 1"/"Grupo 2",
  mensajes a `null`, `attending` intacto, segundo pase sin efecto.

## Lo que descubrió esta sesión y conviene no olvidar

**El puerto 3000 no es nuestro.** Dos veces durante la sesión, un `next-server` de otro
proyecto tomó el 3000 y `reuseExistingServer` de Playwright probó esa aplicación: seis
e2e en rojo por un fallo que no existía en el código. Las e2e ahora usan el 3100.

**El migrador reutiliza su imagen cacheada.** `docker compose --profile tools run --rm
migrator` dijo "migrations applied successfully" mientras aplicaba un juego de
migraciones viejo, y el contenedor de mantenimiento falló contra una tabla inexistente.
Antes de desplegar: `docker compose --profile tools build migrator`.

**Un layout de grupo que emita `<html>` gana siempre.** La página del invitado servía el
texto en inglés con `lang="es"` porque `(guest)/layout.tsx` envolvía al de `[token]`.
Next usa la raíz más externa; el grupo se quedó sin layout propio.

**El limitador de intentos hizo su trabajo contra nuestras propias pruebas.** Iniciar
sesión una vez por prueba chocaba con los tres intentos por minuto y cuenta. Ahora hay un
proyecto `setup` de Playwright que abre la sesión una sola vez.

## Decisiones que este plan tomó y el spec no fijaba

| Punto | Decisión | Dónde |
|---|---|---|
| Sesión | Cookie con token opaco; en la base solo su SHA-256 | `sessions.token_hash` |
| Caducidad | 30 días, renovación deslizante a la mitad de la ventana | `domain/session.ts` |
| Plantillas | Registro tipado con `clasico` de respaldo | `events/ui/themes/registry.ts` |
| Enlace del cliente | Se crea y revoca desde el panel del evento, 60 días | `ClientSharePanel` |

## Qué hacer a continuación

1. Decidir con el usuario si fusionar `feat/motor-invitaciones` a `main`.
2. Rebanada 2: canales de envío — WhatsApp asistido, email, copiar/CSV y QR de reparto.
   El spec ya la describe; toca `superpowers:writing-plans`.
3. Antes de cualquier despliegue real, los pendientes del usuario de abajo.

## Pendientes del usuario, sin resolver

- **Datos reales** en `src/shared/config/brand.ts`: WhatsApp, dominio y email siguen
  siendo marcadores. El WhatsApp aparece ahora también en el error de la invitación.
- **Fotos** de las plantillas `zafiro` y `onix`: marcadores generados.
- **Póster del hero**: SVG compuesto, no captura del primer fotograma.
- Datos de transferencia y QR de pago, que necesita el Plan B.
- **Solo hay una plantilla de invitación** (`clasico`). El registro admite más en cuanto
  se compongan a mano.

## Skills para la próxima sesión

- `superpowers:writing-plans` — plan de la rebanada 2.
- `superpowers:subagent-driven-development` — para ejecutarlo.
- `superpowers:finishing-a-development-branch` — si se decide fusionar antes de seguir.

## Nota de estilo

El usuario escribe en español y tiene el modo caveman activo: respuestas comprimidas, sin
relleno. Avísale al cerrar cada tarea; no pidas permiso entre tareas de un plan ya
aprobado.
