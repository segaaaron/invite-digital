# InvitePremium — Sitio de marketing (Ciclo 1)

Fecha: 2026-08-17
Estado: aprobado el enfoque, pendiente revisión del spec

## 1. Propósito

Vender invitaciones digitales de lujo en Bolivia. El sitio convierte visitas en
conversaciones de WhatsApp y en pedidos pagados por transferencia con
comprobante. No es el producto: el motor de invitaciones, el RSVP y el
dashboard completo llegan en ciclos posteriores.

Éxito del ciclo 1:

- Un visitante entiende la propuesta, elige plan y abre WhatsApp con el
  mensaje correcto en menos de un minuto.
- Un pedido con comprobante subido queda registrado y un administrador lo
  aprueba o rechaza desde el panel.
- Las páginas en español e inglés se indexan por separado.
- LCP < 2.0 s, CLS < 0.05, INP < 200 ms en móvil 4G.

## 2. Alcance

Dentro:

- Landing de lujo basada en el diseño `InvitePremium Ivory.dc.html`.
- Catálogo de plantillas y planes leído de Postgres.
- Hero 3D: sobre con sello de cera que se abre.
- Captura de leads (formulario de consulta) y salida a WhatsApp.
- Pedido con subida de comprobante de pago.
- Panel de administración mínimo: bandeja de pedidos, aprobar/rechazar.
- i18n es/en por prefijo de ruta, sin selector visible.
- SEO técnico: metadatos, JSON-LD, sitemap, hreflang.
- Despliegue en VPS con Docker Compose.

Fuera (ciclos siguientes):

- Motor de invitaciones por evento, RSVP, QR por invitado, Wallet.
- Pasarela de pago automática.
- Dashboard analítico y editor visual de plantillas.
- Campañas de anuncios (se entrega el copy, no la ejecución de pauta).

## 3. Arquitectura

Monolito modular en una sola app Next.js 15 (App Router, TypeScript strict).
Cada módulo es una rebanada vertical con capas y frontera pública única.

```
src/
  modules/
    catalog/
      domain/          Template, Plan, Money, Currency — puro, sin imports de infra
      application/     ListTemplates, ListPlans, GetTemplateBySlug
      infrastructure/  DrizzleTemplateRepository, DrizzlePlanRepository
      ui/              TemplateCard, PlanCard, CollectionCarousel
      index.ts         única superficie pública del módulo
    leads/             ConsultationRequest, SubmitConsultation, WhatsAppLinkBuilder
    orders/            Order, PaymentProof, PlaceOrder, ReviewPaymentProof
    identity/          AdminUser, sesión, hash de contraseña
  shared/
    design/            tokens, primitivas de UI, animaciones
    i18n/              diccionarios, negociación de idioma, formateadores
    result/            Result<T, E> — errores como valores en dominio
    db/                cliente Drizzle, esquema, migraciones
    config/            env validado con Zod
  app/
    [locale]/(marketing)/   landing y páginas públicas
    (admin)/                panel, fuera de [locale], solo español
    api/                    route handlers
```

Reglas de dependencia, verificadas por `eslint-plugin-boundaries` en CI:

1. `domain` no importa de `application`, `infrastructure`, `ui`, ni de otro módulo.
2. `application` importa `domain` y puertos; nunca `infrastructure` concreta.
3. `infrastructure` implementa puertos declarados en `application`.
4. `ui` consume casos de uso, jamás repositorios.
5. Un módulo importa a otro solo por su `index.ts`.

La inyección es por argumento: cada caso de uso es una función que recibe sus
puertos y devuelve otra función. Sin contenedor DI, sin decoradores.

```ts
export const listTemplates =
  (deps: { templates: TemplateRepository }) =>
  async (filter: TemplateFilter): Promise<Result<Template[], CatalogError>> => { ... }
```

### Por qué así

- **SRP**: un caso de uso, una operación de negocio.
- **DIP**: el dominio define la interfaz del repositorio; Drizzle la implementa.
- **OCP**: agregar un canal de contacto o un método de pago es un adaptador
  nuevo, no un `if` más en el dominio.
- **DRY**: los tokens de diseño, los diccionarios y los esquemas Zod son fuente
  única; los tipos se infieren de ellos.
- **KISS**: un proceso, un contenedor de app, un `package.json`. Sin monorepo
  hasta que exista una segunda app real.

## 4. Modelo de dominio

Entidades y sus invariantes:

- **Plan** — `slug`, nombre, tagline, precio (`Money`), lista ordenada de
  features, bandera `highlighted`, orden. Invariante: precio > 0; exactamente
  un plan destacado. Seed: Atelier Bs 690, Firma 3D Bs 1.450 (destacado),
  Alta Costura Bs 2.900.
- **Template** — `slug`, nombre (Perla, Mármol, Laurel, Carmesí…), categoría
  de evento, paleta, imagen de portada, orden, `published`. Seed: las 8 del
  diseño Ivory.
- **EventCategory** — boda, boda civil, XV años, despedida, graduación,
  bautizo, corporativo. Tabla, no enum de código: crece sin migración.
- **ConsultationRequest** — nombre, contacto (teléfono o email, al menos uno),
  categoría, fecha tentativa, mensaje, `locale`, atribución UTM. Invariante:
  contacto no vacío; fecha del evento no en el pasado.
- **Order** — plan elegido, datos del cliente, `status`, comprobante opcional.
  Estados: `pending_payment → proof_submitted → approved | rejected`, y
  `rejected → proof_submitted` al resubir. Toda otra transición se rechaza en
  el dominio, no en la UI.
- **PaymentProof** — id de archivo opaco, MIME real, tamaño, hash, fecha,
  revisor, nota.
- **AdminUser** — email, hash Argon2id, rol.

Objetos de valor: `Money` (monto entero en centavos + moneda BOB), `Slug`,
`Locale`, `PhoneNumber` (E.164, prefijo +591 por defecto).

Los errores son valores: cada caso de uso devuelve `Result<T, E>` con errores
tipados. Las excepciones quedan para fallos de infraestructura.

## 5. Esquema Postgres

Postgres 17. Migraciones con `drizzle-kit`, versionadas en `db/migrations`,
aplicadas al arrancar el contenedor.

```
event_categories(id pk, slug uniq, sort_order)
event_category_translations(category_id fk, locale, name, pk(category_id, locale))

plans(id pk, slug uniq, price_cents int, currency char(3), highlighted bool,
      sort_order, is_active, created_at, updated_at)
plan_translations(plan_id fk, locale, name, tagline, description,
                  features jsonb, pk(plan_id, locale))

templates(id pk, slug uniq, category_id fk, cover_image_path, palette jsonb,
          sort_order, is_published, created_at, updated_at)
template_translations(template_id fk, locale, name, description,
                      pk(template_id, locale))

consultation_requests(id pk, name, email, phone, category_id fk, event_date,
                      message, locale, utm jsonb, created_at)

orders(id pk, public_ref uniq, plan_id fk, customer_name, customer_email,
       customer_phone, status, locale, amount_cents, currency,
       created_at, updated_at)
payment_proofs(id pk, order_id fk, storage_key, mime_type, size_bytes,
               sha256, uploaded_at, reviewed_by fk null, reviewed_at null,
               review_note null)
admin_users(id pk, email uniq, password_hash, role, created_at)
admin_sessions(...)  -- gestionado por Auth.js
```

Decisiones:

- **Traducciones en tabla aparte**, no columnas `name_es`/`name_en`: agregar un
  idioma es una fila, no una migración.
- **Dinero en enteros**: `price_cents` + `currency`, nunca `float`.
- Índices: `templates(is_published, sort_order)`, `orders(status, created_at)`,
  `consultation_requests(created_at)`, y los únicos de `slug`.
- `updated_at` por trigger, no por la aplicación.

## 6. Rutas, i18n y SEO

Idiomas: `en` (fallback) y `es`. Sin botón visible.

- `middleware.ts` negocia `Accept-Language`, respeta la cookie `NEXT_LOCALE`, y
  redirige `/` a `/en` o `/es` con 307.
- Sin coincidencia → `en`.
- `hreflang` para `en`, `es` y `x-default` → `en`.
- `sitemap.xml` con ambas ramas; `robots.txt` bloquea `/admin`.

Mapa de rutas:

```
/[locale]                      landing completa
/[locale]/colecciones          catálogo de plantillas
/[locale]/colecciones/[slug]   ficha de plantilla
/[locale]/planes               planes y precios
/[locale]/pedido/[plan]        formulario de pedido + subida de comprobante
/[locale]/pedido/gracias/[ref] confirmación
/[locale]/legal/*              privacidad, términos
/admin                         login
/admin/pedidos                 bandeja, detalle, aprobar/rechazar
/admin/consultas               leads recibidos
```

JSON-LD: `Organization` y `WebSite` en el layout; `Product` + `Offer` por plan;
`FAQPage` en una sección de preguntas frecuentes (sección nueva, no presente en el Ivory, añadida por valor SEO); `BreadcrumbList` en fichas. Los datos
salen de la base, no de literales duplicados en el markup.

Palabras clave objetivo (es): invitaciones digitales de lujo, invitaciones de
boda 3D, invitación virtual premium Bolivia. (en): luxury digital wedding
invitations, 3D interactive invitations.

## 7. Sistema de diseño

Tokens extraídos del Ivory, definidos una vez como variables CSS y expuestos a
Tailwind v4 con `@theme`:

| Token | Valor | Uso |
|---|---|---|
| `--iv-bg` | `#f6f1e9` | fondo base marfil |
| `--iv-bg-raised` | `#fdfaf4` | superficies elevadas |
| `--iv-bg-sunken` | `#efe7dc` | degradado inferior |
| `--iv-ink` | `#2b2723` | texto principal |
| `--iv-ink-soft` | `#58514a` | texto secundario |
| `--iv-ink-mute` | `#9a917f` | texto terciario |
| `--iv-gold` | `#c19b4a` | acento primario |
| `--iv-gold-deep` | `#a8823a` | enlaces, hover |
| `--iv-gold-light` | `#e2c584` | brillo del degradado foil |

Tipografía: Cormorant Garamond (display) + Jost (UI), servidas localmente con
`next/font` — sin llamadas a Google en producción, sin FOUT, sin CLS.

Escala de espaciado, radios y sombras derivados del diseño. Ninguna vista
declara un color literal; si un componente necesita un color nuevo, entra
primero como token.

Componentes por atomicidad: primitivas en `shared/design/ui`, compuestos en
`modules/*/ui`. Accesibilidad: contraste AA en texto, foco visible
(`outline: 1px solid var(--iv-gold)`), `prefers-reduced-motion` respetado en
todas las animaciones y en la escena 3D.

## 8. Hero 3D

Única escena WebGL del ciclo. React Three Fiber + drei.

- Sobre de algodón con sello de lacre. Al hacer scroll o tocar, el sello cede y
  la tarjeta emerge. Físicas simuladas por animación, no por motor de física.
- Modelo GLB con compresión Draco; texturas KTX2/Basis; presupuesto: < 900 KB
  total de assets 3D, < 40 k triángulos.
- Carga: `dynamic(() => import(...), { ssr: false })` dentro de `<Suspense>`,
  con un póster estático (AVIF) idéntico al primer frame como `fallback`. El
  LCP lo marca el póster, no el canvas.
- La escena no se monta si: `prefers-reduced-motion: reduce`, el dispositivo
  reporta `deviceMemory < 4`, o no hay contexto WebGL2. En esos casos queda el
  póster con animación CSS.
- `dpr={[1, 1.75]}`, `frameloop="demand"`, pausa al salir del viewport.

Riesgo asumido: si el hero 3D pone en peligro el presupuesto de LCP, la escena
se degrada al póster y se pospone la interacción — el sitio no se bloquea por
el 3D.

## 9. Pedidos y comprobantes

Flujo:

1. El cliente elige plan → formulario (nombre, contacto, fecha, notas).
2. Se crea `Order` en `pending_payment` con `public_ref` corto y aleatorio.
3. Se muestran los datos de transferencia y el QR; el cliente sube comprobante.
4. `Order` pasa a `proof_submitted`; se notifica al admin.
5. El admin aprueba o rechaza con nota; el cliente recibe email.

Seguridad de la subida, tratada como entrada hostil:

- Límite de 8 MB; solo `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- El tipo se determina por **magic bytes**, no por extensión ni por el
  `Content-Type` del cliente.
- Nombre de almacenamiento aleatorio (UUID); el nombre original solo se guarda
  como texto mostrado, escapado.
- Los archivos viven **fuera del directorio público**, en un volumen montado.
  Se sirven por un route handler que exige sesión de admin, con
  `Content-Disposition: attachment` y `Content-Security-Policy: sandbox`.
- Límite de tasa por IP en subida y en creación de pedidos.
- El puerto `FileStorage` abstrae el almacenamiento: hoy disco local, mañana
  S3/MinIO sin tocar dominio.

El panel de admin exige sesión (Auth.js v5, credenciales, Argon2id), cookies
`httpOnly` `secure` `sameSite=lax`, y protección CSRF en las mutaciones.

## 10. Manejo de errores

- Dominio y casos de uso: `Result<T, E>` con errores tipados; nunca lanzan.
- Borde HTTP: un mapeador traduce cada error de dominio a estado HTTP y a un
  mensaje traducido. El cliente jamás ve un `stack` ni un mensaje de Postgres.
- Fallos de infraestructura: se registran con id de correlación y se muestran
  como error genérico.
- Formularios: validación Zod compartida entre cliente y servidor; el servidor
  es la autoridad.
- Fallo del catálogo: la landing degrada a contenido de respaldo en caché en
  lugar de romper.

## 11. Pruebas

- **Vitest, unitarias**: reglas de dominio (transiciones de `Order`, `Money`,
  validación de contacto, negociación de idioma). Sin base de datos.
- **Vitest, integración**: casos de uso contra Postgres real en contenedor
  efímero; migraciones aplicadas por prueba.
- **Playwright, e2e**: tres flujos — consulta enviada, pedido con comprobante
  aprobado por admin, redirección de idioma correcta.
- **Presupuesto de rendimiento**: Lighthouse CI en el pipeline, falla si LCP >
  2.0 s o CLS > 0.05.
- Desarrollo por TDD en dominio y casos de uso: prueba que falla primero.

## 12. Despliegue

VPS limpio, `docker compose`:

```
caddy      TLS automático, cabeceras de seguridad, compresión
web        Next.js standalone, Node 22 alpine, usuario no root
db         Postgres 17, volumen persistente
backup     cron pg_dump diario, retención 14 días
```

- Variables de entorno validadas con Zod al arrancar: si falta una, el proceso
  no levanta.
- Cabeceras: HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
  CSP estricta con nonce (WebGL y fuentes locales no requieren `unsafe-inline`).
- Migraciones aplicadas en el arranque, dentro de una transacción.
- Sin secretos en la imagen; `.env` fuera del repo, con `.env.example` versionado.

## 13. Orden de construcción

1. Andamiaje: Next 15, TS strict, Tailwind v4, ESLint con fronteras, Vitest.
2. `shared`: tokens, config validada, `Result`, i18n con middleware.
3. `shared/db`: Drizzle, esquema, migraciones, seed de categorías/planes/plantillas.
4. `catalog`: dominio → casos de uso → repositorios → UI.
5. Landing: secciones del Ivory en orden — hero, experiencia, móvil,
   colecciones, comparativa, precios, modelos, contacto.
6. Hero 3D con póster y degradación.
7. `leads`: formulario de consulta y salida a WhatsApp.
8. `orders`: pedido, subida de comprobante, almacenamiento seguro.
9. `identity` + panel de admin.
10. SEO: metadatos, JSON-LD, sitemap, hreflang.
11. Copy inglés y revisión editorial.
12. Docker Compose, backups, Lighthouse CI.

## 14. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Diseño canónico | Ivory |
| Framework | Next.js 15 App Router, TypeScript strict |
| ORM | Drizzle + postgres.js |
| Estilos | Tailwind v4 con tokens del Ivory |
| 3D | Solo hero; resto CSS + Framer Motion |
| i18n | es/en por prefijo, detección automática, fallback en |
| Copy | Español canónico, inglés derivado |
| Catálogo | Postgres desde el inicio |
| Pagos | WhatsApp + comprobante, verificación manual |
| Infra | VPS propio, Docker Compose, Caddy |
| Equipo | PM secuencial con checkpoints y subagentes especializados |
