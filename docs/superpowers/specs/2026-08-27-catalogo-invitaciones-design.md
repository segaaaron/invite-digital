# Los dieciséis diseños — bodas y XV años

**27 de agosto de 2026**

## 1. Qué se construye y por qué

La maqueta `VallHallaWwepApp` guarda un catálogo de invitaciones digitales terminadas.
De él entran aquí **ocho bodas y ocho XV años**. La sección «XV Años V2» de esa maqueta
queda fuera por decisión del usuario.

Hoy el motor de invitaciones tiene **un solo tema**, `clasico`: una hoja centrada con el
título, la fecha, el lugar y el formulario. La web vende ocho «modelos» —`perla`,
`mármol`, `laurel`, `carmesí`, `zafiro`, `nacarado`, `ónix`, `sobre`— que **no existen
como piezas**: son filas de catálogo dibujadas como una tarjeta de papel. Lo que el
cliente elige en el escaparate y lo que el invitado acaba recibiendo no tienen nada que
ver.

Esto lo cierra. Los dieciséis diseños se vuelven temas de verdad: el atelier elige uno,
y el invitado abre **ese** diseño, con sus animaciones, sus iconos, sus fondos y sus
tipografías, alimentado con los datos de su evento y con el RSVP, la mesa de regalos y
el libro de firmas **reales** del sistema.

El criterio que manda sobre todos los demás, dicho por el usuario: **fidelidad al
diseño**. Donde una regla del proyecto choque con la fidelidad, se resuelve ampliando la
regla con su motivo escrito, nunca recortando el diseño.

## 2. Los dieciséis

Cada uno lleva su clave de tema, que es también el `slug` de su fila en `templates`.

### Bodas

| Clave | Diseño | Origen | Líneas | Tipografías propias |
|---|---|---|---|---|
| `boda-bot` | Marcia & Ricardo · Botánica | `wedding-variants.jsx:6` | 240 | Great Vibes, Cinzel, Italiana, Cormorant, JetBrains Mono, Space Grotesk |
| `boda-ed` | María & Alex · Editorial | `wedding-variants.jsx:557` | 199 | + Spectral |
| `boda-cin` | Sofía & Diego · Cinemática | `wedding-variants.jsx:756` | 224 | — |
| `boda` | Camila & Mateo · Étoile | `invites-1.jsx:6` | 146 | — |
| `civil` | Lucía & Andrés · Civil | `invites-3.jsx:7` | 90 | + Spectral |
| `aniv` | Bodas de Oro · 50 años | `invites-3.jsx:97` | 109 | — |
| `eng` | Dijo sí · Compromiso | `invites-3.jsx:206` | 97 | + Newsreader |
| `dest` | Alejandra & Pablo · Tulum | `invites-3.jsx:303` | 108 | — |

### XV Años

| Clave | Diseño | Origen | Líneas | Imágenes |
|---|---|---|---|---|
| `xv` | Sofía · Bajo el Mar | `invites-1.jsx:343` | 245 | 16 |
| `xv-natalia` | Natalia · Bajo el Mar | `invites-1.jsx:588` | 243 | 14 |
| `xv-valentina` | Valentina · Mascarada | `invites-1.jsx:1024` | 233 | 11 |
| `xv-luciana` | Luciana · Bosque Encantado | `invites-1.jsx:1318` | 226 | 7 |
| `xv-fantasia` | Alicia · Noche Estrellada | `invites-1.jsx:1760` | 161 | 8 |
| `xv-valeria` | Valeria · Gala Real | `invites-1.jsx:1977` | 160 | 15 |
| `xv-mariana` | Mariana · Encanto Musical | `invites-1.jsx:2222` | 162 | 14 |
| `xv-isabelle` | Isabelle · Palacio Griego | `wedding-variants.jsx:303` | 254 | 6 |

Total: **2 897 líneas** de componente de tema, **46 auxiliares compartidos**, **74
imágenes** distintas y **12 familias tipográficas**, de las que nueve son nuevas en el
proyecto.

## 3. Arquitectura

### 3.1 El registro

`src/modules/events/ui/themes/` pasa de un archivo con un tema a:

```
themes/
  contract.ts          ThemeProps, InvitationContent, ThemeDefinition
  registry.ts          17 claves; carga perezosa por clave
  kit/                 los 46 auxiliares, portados una sola vez
  bodas/               8 archivos, uno por tema
  xv/                  8 archivos, uno por tema
  ClasicoTheme.tsx     el que ya existe; no se toca
```

Un tema no es solo un componente. Es una **definición**:

```ts
type ThemeDefinition = {
  readonly key: string
  readonly label: string
  readonly categorySlug: 'boda' | 'boda-civil' | 'xv-anos'
  readonly palette: ThemePalette        // los hexadecimales del diseño
  readonly fonts: readonly FontKey[]    // solo las que este diseño usa
  readonly sections: readonly SectionKey[]  // qué bloques pinta
  readonly defaultContent: InvitationContent
  readonly Component: ComponentType<ThemeProps>
}
```

`sections` es lo que el panel consulta para no pedirle al atelier un itinerario a un
diseño que no lo pinta. `fonts` es lo que el layout de invitado consulta para no bajar
nueve familias cuando el tema usa cinco.

**Una clave desconocida sigue cayendo a `clasico`.** Es la regla que ya existe y el
motivo no cambia: `theme_key` en la base es solo texto, y una invitación en blanco el día
de la boda es peor que una invitación sobria.

### 3.2 Ranuras, no `children`

Hoy el tema recibe `children` y lo suelta al final. Estos diseños **intercalan**: el RSVP
va a dos tercios del scroll, entre el código de vestimenta y la despedida; el libro de
firmas, después. Un `children` único no puede colocarse en dos sitios.

```ts
type ThemeProps = {
  event: Event
  content: InvitationContent
  dictionary: InvitationDictionary
  slots: {
    rsvp: ReactNode
    registry: ReactNode
    guestbook: ReactNode
    pass: ReactNode
  }
}
```

Los `<RSVP>`, `<GiftRegistry>` y `<Guestbook>` de la maqueta se tiran: solo hacen
`useState` y no guardan nada. Lo que se pinta es lo nuestro, que sí escribe en la base.

### 3.3 El RSVP tiene que poder vestirse

Este es el punto donde la fidelidad choca de frente con lo que hay. `RsvpForm` es hoy un
componente con sus clases de Tailwind clavadas en la paleta marfil: fondo `bg-bg-top/80`,
borde `--color-line`, botón `bg-gold`. Pintado dentro de la mascarada morada o del fondo
de mar pastel, es una mancha del sitio público dentro de la invitación.

Y no es un problema de color: **cada diseño tiene su propio formulario**.
`SofiaRSVPForm`, `ValentinaRSVPForm`, `LucianaRSVPForm`, `FantasiaRSVPForm`,
`ValeriaRSVPForm` y `MarianaRSVPForm` son seis formularios distintos en la maqueta, con
marcados distintos.

La respuesta es separar comportamiento de piel:

- `useRsvp(token, seats, previous)` — un hook cliente que envuelve `useActionState` sobre
  `respondAction` y devuelve `{ state, formAction, isPending, error }`. **La acción del
  servidor no se toca**: sigue siendo la misma, con su candado de contraseña y su
  validación.
- `RsvpForm` actual pasa a usar ese hook y se queda como está para `clasico`.
- Cada tema pinta **su** formulario con el marcado de su diseño, llamando al hook.

Mismo trato para la mesa de regalos y el libro de firmas: la lógica vive en un hook, la
piel la pone el tema. Un tema nunca importa `application` ni `infrastructure`; recibe y
llama.

### 3.4 Cliente y servidor

Llevan `'use client'` y nada más: `Reveal` (IntersectionObserver), `Countdown`,
`IntroCover` y sus seis variantes (el sobre que se abre), los fondos animados
(`WeddingMagicBg`, `Starfield`, `FloatingParticles`, `BubblesRise`, `PremiumBubbles`,
`FallingRosePetals`, `FallingPetals`), `ConfettiBurst` y los formularios.

El cuerpo de cada tema se queda en el servidor. Se carga con `next/dynamic` por clave:
quien abre una invitación baja su tema, no los diecisiete.

### 3.5 Movimiento reducido

La maqueta lo respeta a medias: hay un `@media (prefers-reduced-motion: reduce)` para las
burbujas y para nada más. En el kit es obligatorio y con una regla concreta: **sin
animación, el estado final visible**. Un `Reveal` que arranca en `opacity: 0` y espera un
observador que nunca dispara deja la invitación en blanco para quien pidió menos
movimiento. Se prueba pieza por pieza.

## 4. El contenido del evento

### 4.1 Por qué una tabla y no columnas

Los dieciséis pintan, entre todos, diecinueve secciones. Tres de ellas son listas
—itinerario, galería, anfitriones—. Diecinueve columnas en `events`, tres de ellas
`jsonb`, convertirían la tabla del evento en un formulario. Y el contenido se lee entero
y se edita entero.

```sql
create table if not exists event_content (
  event_id uuid primary key references events(id) on delete cascade,
  blocks jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

`CASCADE` porque el contenido no significa nada sin su evento — la misma regla que
`event_staff`. El `jsonb` se valida **en el dominio** al leerlo y al escribirlo: la base
garantiza que es JSON, no que sea *este* JSON.

### 4.2 Los bloques

Todos opcionales. Un bloque ausente no se pinta; no hay hueco ni marcador.

| Bloque | Campos |
|---|---|
| `hero` | `eyebrow`, `nameA`, `nameB`, `monogram`, `serial`, `coverImageId`, `portraitImageId` |
| `quote` | `text` |
| `hosts` | `label`, `names[]` |
| `schedule` | `startsAt` (fecha y hora reales) |
| `ceremony` | `label`, `place`, `address`, `time` |
| `reception` | `label`, `place`, `address`, `time` |
| `map` | `label`, `coords`, `href` |
| `itinerary` | `[{ time, label, imageId? }]` |
| `dressCode` | `title`, `note`, `detail`, `imageIds[]` |
| `music` | `track`, `artist` |
| `gallery` | `[{ imageId, label }]`, hasta 6 |
| `closing` | `text`, `signature`, `imageId` |

Qué bloque pinta cada tema **no se decide aquí**: lo declara la `sections` de su propia
definición, y se rellena leyendo el diseño al portarlo. `hero`, `schedule`, `reception` y
`closing` los pintan los dieciséis; `hosts`, solo los de XV. El resto varía y no se
adivina: si el diseño no lo tiene, no entra en su `sections`.

**`schedule.startsAt` es fecha y hora.** `events.event_date` es un día del calendario a
propósito —y así se queda—, pero una cuenta atrás necesita la hora. Vive aquí, no en
`events`, porque es contenido de la invitación.

### 4.3 Se siembra con el diseño

Cada tema declara su `defaultContent` con **el contenido exacto de la maqueta**. Al crear
un evento, o al cambiar de tema, cada bloque **vacío** se rellena con el del diseño.

Dos motivos. Uno: la invitación se ve terminada desde el primer segundo, que es la mitad
de lo que se vende. Dos: el atelier ve qué espera cada hueco antes de escribirlo.

**Cambiar de tema jamás pisa lo que el atelier escribió.** Solo rellena lo vacío. Perder
el itinerario de una boda por probar otro diseño sería la peor forma posible de
descubrirlo.

## 5. Imágenes

### 5.1 Las del diseño

Setenta y cuatro. Son *el aspecto del tema*, como un SVG del kit: van versionadas en
`public/temas/<clave>/`.

Al copiarlas se normaliza el nombre —`BORDE PLATA SF.png` → `borde-plata.png`,
`bajo el mar1-2ff80452.jpeg` → `bajo-el-mar-1.jpg`— porque un espacio y una mayúscula en
una ruta servida es un fallo que aparece en producción y no en macOS. La maqueta tiene
duplicados con sufijo de hash (`MASCARADA MORADA.jpeg` y `MASCARADA MORADA-5c764da1.jpeg`
son el mismo archivo): se deduplican por contenido.

Se convierten a AVIF/WebP donde el peso lo justifique, conservando el original cuando la
transparencia lo exija.

### 5.2 Las del evento

Retrato, portada, galería e iconos del itinerario los sube el atelier. Almacén nuevo
`EVENT_MEDIA_DIR`, por defecto `.data/eventos`, **volumen en producción** y **fuera de
`public/`** — exactamente el patrón de los comprobantes, y por el mismo motivo: lo que
vive en `public/` está publicado en internet.

De ahí se hereda entero lo que ya se aprendió con los comprobantes:

- El tipo lo deciden **los primeros bytes**, nunca la extensión ni el `Content-Type`, que
  los escribe quien sube el archivo. `RIFF` no basta para WEBP: hay que mirar el byte 8.
- El archivo se guarda con **UUID**. El nombre original solo se conserva para enseñarlo.
- El tope de tamaño se comprueba **antes** de leer el archivo a memoria.

Lo que **no** se hereda es la sesión. Las sirve `GET /media/[id]`:

- **Sin sesión** — el invitado no tiene ninguna.
- **Con la misma puerta que la invitación**: si el evento lleva contraseña y la cookie de
  desbloqueo no está, responde **404**. Un `<img>` no puede ser el agujero por el que se
  rodea el candado, igual que `respondAction` no podía serlo.
- Un identificador desconocido responde **404, nunca 403**.
- `Cache-Control: private`, sin `Content-Disposition: attachment` — aquí la imagen se
  pinta, no se descarga.

### 5.3 Retención

`maintenance` ya anonimiza los eventos vencidos. Se le añade **borrar del disco las
imágenes** de ese evento y vaciar `event_content`. Un retrato de la novia y una lista de
padrinos son datos personales, y hoy no hay nada que los barra.

## 6. Tipografías

Doce familias las piden los dieciséis diseños. **Tres ya están** en `public/fonts`:
Cormorant Garamond, Space Grotesk y JetBrains Mono. **Nueve son nuevas**: Alex Brush,
Allura, Cinzel, DM Sans, Great Vibes, Italiana, Marcellus, Newsreader y Spectral. (Jost,
la cuarta que el proyecto ya tiene, es de la web pública marfil y no la usa ningún tema.)

Se bajan como woff2 y viven en `public/fonts`, cargadas con `next/font/local`, igual que
las que ya hay. No se enlaza a Google: una invitación que depende de un tercero para
verse bien no se ve bien el día que ese tercero falla, y además le cuenta a Google quién
abre la invitación.

**Cada tema declara las suyas** y el layout de invitado carga solo esas. Cargar las doce
en toda invitación es medio megabyte de tipografía que ese diseño no pinta.

Con nueve familias, la fuente variable es la primera opción donde exista; donde no, solo
los pesos que el diseño usa. Cada declaración lleva su pila de respaldo real, no
`serif` a secas.

## 7. La web pública

Las ocho filas de relleno de `templates` se sustituyen por **las dieciséis reales**, con
`slug` igual a la clave del tema y su categoría (`boda`, `boda-civil`, `xv-anos`, que ya
existen).

- Columna nueva `templates.theme_key`, `NOT NULL`. **`pnpm preflight` falla** si una fila
  publicada apunta a una clave que el registro no tiene: vender un modelo que el motor no
  sabe pintar es la clase de fallo que no se descubre hasta el día de la boda.
- La portada de la tarjeta pasa a ser una **captura real del tema**. La tarjeta de papel
  dibujada que hay hoy se queda como respaldo cuando falte la imagen — media tarjeta con
  el monograma se lee como un fallo de carga, y esa lección ya está escrita.
- **Ruta nueva `/[locale]/modelos/[slug]`**: el tema entero, a pantalla completa, con el
  `defaultContent` de su propia definición. El RSVP, la mesa de regalos y el libro de
  firmas se pintan **inertes**, con un aviso de que es una vista previa: un formulario de
  muestra que parece funcionar y no guarda nada es peor que no tenerlo.
- `/modelos/` **no** entra en el `disallow` de `robots.txt` — al contrario que `/r/` y
  `/i/`, esto es escaparate y queremos que se indexe. Con `canonical` y `alternates` como
  el resto del sitio, y su entrada en el `sitemap`.

## 8. El panel

- **Elegir tema.** El `<select>` de `EventForm` ya se llena solo desde `THEME_KEYS`, pero
  diecisiete claves sueltas en un desplegable no sirven para elegir un diseño. Pasa a ser
  una **rejilla de miniaturas** agrupada por categoría, con la portada del catálogo, y
  cada una enlaza a `/modelos/<slug>` para verla entera antes de decidir.
- **Contenido de la invitación.** Sección nueva en `/panel/eventos/[slug]/configuracion`,
  un bloque por sección, cada uno con su formulario y su Server Action. **Solo se enseñan
  las secciones que el tema elegido pinta**, leídas de su `sections`.
- **Subida de fotos** para retrato, portada, galería e itinerario.
- Toda acción nueva empieza por `requireSession()` **en su propio cuerpo** y sigue con
  `requireEventAccess(actor, ref)`. `pnpm verify:tenancy` las cubre sin una sola
  excepción apuntada.
- Toda acción nueva devuelve `{ status, message }` por `useActionState`, y **la pantalla
  lo pinta**. Ninguna `Promise<void>` con el fallo en `console.error`.
- El estado que la maqueta abriría con un botón va en la URL (`?bloque=itinerario`), no
  en `useState`: cada Server Action revalida y remonta.

## 9. Las reglas del proyecto que esto toca

**Colores hexadecimales.** `tokens.css` es la única fuente, con la excepción ya escrita
del acento que viene de los datos de una plantilla. Estos dieciséis diseños son
hexadecimales de arriba abajo y no pueden salir de ahí: son cientos, son de un solo
diseño, y no son decisiones de marca. Se amplía la excepción con su motivo: **la paleta
de un tema de invitación es dato del tema**, declarada en la `ThemeDefinition` de su
propio archivo y en ningún otro sitio. Regla dura que lo acota: **ningún hexadecimal
suelto en `kit/`**. El kit recibe todo color por prop. Un `#d4b483` dentro de
`MapPreview` reaparecería en la boda botánica, que es verde.

**Fronteras de módulo.** El kit y los temas viven en `events/ui/`, que es donde ya vive
`ClasicoTheme`. `domain` sigue puro. `application` no importa `infrastructure`. Un tema
no importa `plans`, ni `registry`, ni `rsvp`: recibe ranuras ya pintadas y contenido ya
resuelto, igual que `guests` recibe la capacidad del plan como argumento.

**i18n.** Cada rótulo fijo del diseño —`DÍAS`, `HRS`, `SEG`, `SAVE THE DATE`, `Faltan`,
`Itinerario`, `Código de Vestimenta`, `Junto a mis padres`, `Confirma antes del`— es
clave de diccionario declarada en `dictionary.ts`, `es.ts` y `en.ts` **en el mismo
commit**. La invitación usa `events.locale`, no el idioma del navegador.

**Un solo `<main>`.** Los temas emiten `<article>`, como `ClasicoTheme`. El grupo
`(guest)` sigue sin layout propio a propósito.

**Migraciones.** `event_content`, `event_media` y `templates.theme_key` van cada una dada
de alta en `db/migrations/meta/_journal.json`, y aplicables dos veces: `if not exists` en
todo `create`/`alter`, y `drop constraint if exists` delante de cada `add constraint`.
Se prueban por los dos caminos —base vacía y copia de la real— antes de tocar el
registro.

## 10. Pruebas

**Unitarias**
- El parser de `InvitationContent`: cada bloque, cada campo ausente, cada lista vacía, y
  que un `jsonb` con basura dentro no revienta la invitación.
- El sembrado por tema: rellena lo vacío, **no pisa lo escrito**. Es la prueba que
  protege el itinerario de una boda real.
- El registro: las diecisiete claves resuelven; una desconocida cae a `clasico`; cada
  definición declara al menos una fuente y una sección.
- `prefers-reduced-motion` en cada pieza animada del kit: sin animación, contenido
  visible.
- La firma de las imágenes por sus primeros bytes, con el caso `RIFF` que no es WEBP y un
  nombre `../../etc/passwd`.

**Contra Postgres real**
- `event_content` cae en cascada al borrar el evento.
- Un solo contenido por evento.
- La retención borra contenido e imágenes del disco.
- Cada fila publicada de `templates` apunta a una clave registrada.

**e2e**
- Un evento por cada uno de los dieciséis, abierto desde el enlace del invitado, que
  **confirma asistencia de verdad** dentro del diseño y ve su respuesta al volver.
- La contraseña del evento tapando también `/media/[id]`.
- `/es/modelos/<slug>` responde 200 en los dieciséis, y su RSVP de muestra no escribe.
- La rejilla de temas del panel y el formulario de contenido de un tema que sí pinta
  itinerario y de otro que no.
- Anchos: 390 · 560 · 860 · 900 · 1280 sobre los dieciséis. Son diseños verticales de
  móvil, y el ancho es donde se rompen.

Cada suite e2e abre **su propia conexión** a Postgres; compartir el pool deja al segundo
`afterAll` escribiendo contra una conexión muerta.

Los fixtures siembran **con `user_id` y con plan `alta-costura`**: un evento sin dueño
solo lo ve el admin, y uno sin plan cae al más barato, que no trae mesa de regalos ni
modo puerta. Las dos cosas dejan la suite en 404 o en «función no incluida» sin decir por
qué.

## 11. Riesgos declarados

1. **Las nueve tipografías hay que descargarlas.** Si la red no da, el tema cae a su pila
   de respaldo y pierde carácter. Se comprueba en la primera tanda, no al final.
2. **Setenta y cuatro imágenes de la maqueta**, algunas con personas. Las de `uploads/`
   son del usuario; cualquiera que no lo sea se sustituye por un marcador antes de
   publicar.
3. **`pnpm build` ya va con 16 GB de heap** y el rastreo de ficheros del `standalone`
   crece con cada módulo. Dieciséis temas lo aprietan. Se mide tras la primera tanda; si
   muere, primero se borra `.next` y luego se sube el heap, en ese orden.
4. **Tamaño.** No es una rebanada: son ~8 000 líneas nuevas y tres migraciones. El plan
   lo parte en tandas de dos o tres temas, cada una verificable entera —unitarias, e2e,
   `typecheck`, `lint`, `verify:boundaries`, `verify:tenancy`— antes de seguir.

## 12. Fuera de alcance

- La sección **«XV Años V2»** de la maqueta (nueve diseños). Decisión del usuario.
- Las demás secciones: Sacramentos, Cumpleaños, Despedidas, Festejos, Hitos, Profesional.
- El **editor visual** de la maqueta (`Editor.html`, `design-canvas.jsx`): esto elige un
  diseño y rellena su contenido, no lo dibuja.
- **Audio real** en el reproductor de música. La maqueta pinta el reproductor y no suena;
  aquí también. Servir audio propio es otra rebanada, con su almacén y su licencia.
