# InvitePremium — sitio de marketing

Plataforma de lujo para vender invitaciones digitales 3D en Bolivia. Precios en BOB.
Mercado: bodas, XV años, despedidas, graduaciones, bautizos, corporativo.

## LEE ESTO PRIMERO

**`docs/superpowers/2026-08-19-handoff.md`** — estado completo, decisiones tomadas y qué sigue.
No empieces a trabajar sin leerlo.

Después, según lo que vayas a hacer:

| Documento | Cuándo |
|---|---|
| `docs/superpowers/specs/2026-08-17-marketing-site-design.md` | Entender arquitectura, dominio, esquema, SEO, seguridad, despliegue |
| `docs/superpowers/plans/2026-08-18-marketing-site-plan-a.md` | Consultar cómo se construyó el ciclo 1: 14 tareas con pasos TDD |
| `docs/superpowers/specs/2026-08-19-invitation-engine-design.md` | Construir el motor de invitaciones y RSVP (ciclo 3) |
| `.superpowers/sdd/2026-08-18-marketing-site-plan-a/progress.md` | Ver el estado tarea por tarea y las decisiones con su motivo |

## Estado

**Plan A cerrado: las 14 tareas y la revisión completa de rama.** 164 pruebas unitarias
y 11 e2e en verde; pila Docker probada de punta a punta.
Rama de trabajo: `feat/sitio-publico`, **sin fusionar a `main`**.

Lo siguiente es el **ciclo 3**: motor de invitaciones y RSVP. El spec está escrito y
espera revisión del usuario; después toca `superpowers:writing-plans`.

Ojo: el spec del ciclo 1 dejó fuera pedidos, comprobantes y panel de administración,
que él mismo metía dentro de su alcance. Siguen sin construirse, igual que la
autenticación.

## Comandos

```bash
docker compose -f docker/compose.dev.yml up -d    # Postgres en el puerto 5434
pnpm db:seed                                       # idempotente
pnpm dev · pnpm test · pnpm typecheck · pnpm lint · pnpm build
```

Cualquier comando que toque la base o compile necesita:
`DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000`

Puerto 5434, no 5432: los puertos 5432 y 5433 los ocupan contenedores de otros proyectos de la máquina.
Docker Desktop puede estar parado; arráncalo con `open -a Docker`.

## Reglas del proyecto

- **pnpm exclusivamente.** Nunca npm ni yarn.
- TypeScript strict con `noUncheckedIndexedAccess`. Prohibido `any` y `@ts-ignore`.
- **Ningún color hexadecimal fuera de `src/shared/design/tokens.css`.** Única excepción: el color de
  acento que viene de los datos de una plantilla, y los materiales dentro de la escena 3D.
- **Fronteras de módulo impuestas por ESLint y verificadas como efectivas.** `domain` es puro;
  `application` nunca importa `infrastructure`; cada módulo se importa solo por su `index.ts`.
  No relajes la política para acomodar código mal ubicado.
- **Toda clave de diccionario nueva** se declara en `src/shared/i18n/dictionary.ts` Y en `es.ts`
  Y en `en.ts`, en el mismo commit. El typecheck falla si falta alguna.
- **Nunca un selector de idioma visible.** El idioma se negocia solo y se redirige a `/es` o `/en`.
- Toda animación respeta `prefers-reduced-motion: reduce`.
- Fuente visual de la verdad:
  `/Users/miguelangelsaraviabelmonte/Documents/vallhalla web images/Sitio Web Invitaciones Digitales/InvitePremium Ivory.dc.html`
  (ruta con espacios, entrecomíllala). Ivory es la variante canónica.

## Pendiente del usuario — reemplazar antes de desplegar

Los tres primeros están centralizados en `src/shared/config/brand.ts`:

- [ ] **WhatsApp real** — ahora `+59170012345`, es un marcador falso
- [ ] **Dominio real** — ahora `invitepremium.bo`; define canonical, sitemap y el TLS de Caddy
- [ ] **Email real** — ahora `atelier@invitepremium.bo`
- [ ] **Datos de transferencia y QR de pago** — los necesita el Plan B
- [ ] **Testimonios**: el diseño solo trae UNO real (Daniela Ortiz). Hay dos redactados de relleno.
      **No publicarlos como reales**: o el usuario aporta auténticos, o la sección se queda con el real.
- [ ] **Fotos de las plantillas `zafiro` y `onix`** — hoy usan marcadores generados

## Ciclos siguientes (aún sin planificar)

- **Plan B**: pedidos, subida de comprobante de pago, panel de administración mínimo.
  La sección 9 del spec ya lo describe. Aviso: `/admin` vive fuera de `/[locale]`, y como el layout raíz
  se fusionó con `[locale]`, habrá que reintroducir un layout raíz no dinámico.
- **Ciclo 3**: motor de invitaciones por evento (RSVP, QR, enlace por invitado).
- **Ciclo 4**: dashboard completo.

## Estilo de trabajo con este usuario

Escribe en español. Tiene el modo caveman activo: respuestas comprimidas, sin relleno ni preámbulos.
Avísale al cerrar cada tarea; no pidas permiso entre tareas de un plan ya aprobado.
