# Traspaso — 30 de agosto de 2026

## Build, marco de teléfono y la fidelidad de los siete XV

Tres frentes en una sesión: **por qué el build pedía 16 GB y no los necesitaba**, **el marco
de la vista previa**, y **una pasada de fidelidad contra la maqueta de los ocho diseños de
XV** que encontró catorce desviaciones.

Nada está confirmado en git. `pnpm typecheck` en verde al cerrar.

---

## 1. El build no necesitaba 16 GB, y la causa era un glob

`package.json` llevaba `NODE_OPTIONS=--max-old-space-size=16384`. Ese número había subido
8 → 12 → 16 en tres sesiones distintas, cada una dando por hecho que el culpable era la
compilación. **No lo era.** El registro del build lo decía línea a línea:

```
✓ Compiled successfully in 12.4s     ← webpack: doce segundos
✓ Generating static pages (13/13)
  Collecting build traces ...        ← muere aquí
FATAL ERROR: Reached heap limit
```

Lo que se comía cuatro gigas era el rastreo de ficheros del `output: standalone`, por un
`outputFileTracingIncludes` escrito como `./node_modules/.pnpm/**/@swc/helpers/**`. Ese
`**` sobre la raíz del almacén recorre los 584 paquetes y sus `node_modules` anidados
—cerca de un gigabyte— reteniendo la lista entera.

Anclado al nombre del paquete —`.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**`— el
problema desaparece. Sigue sin fijar versión, que es lo que se quería.

**Medido con `/usr/bin/time -l` y `STANDALONE=1`, con `.next` borrado:**

| | Antes | Ahora |
|---|---|---|
| Techo de heap | 16384 MB | **ninguno** |
| Pico real (RSS, todos los procesos) | >4 GB y moría a los 47 s | **1,7 GB** |
| Duración | ~5 min | **29 s** |
| Servidor en producción (`standalone` sirviendo) | sin medir | **135 MB** |

Se probó con el techo a 4096, 2048, 1024 y **sin flag**: pasa en los cuatro. El
`NODE_OPTIONS` se retiró.

Van con él tres opciones de `next.config.ts`, todas documentadas por Vercel:
`experimental.webpackBuildWorker` —que Next apaga solo en cuanto un plugin inyecta
configuración de webpack, y Serwist inyecta la suya (`next/dist/build/index.js:930`)—,
`experimental.webpackMemoryOptimizations` y los mapas de origen del prerenderizado.

**La lección, que ya está en `CLAUDE.md`: un techo de heap que hay que subir es un síntoma,
nunca el arreglo.** Antes de tocar ese número, mira **en qué fase** muere el build.

**Verificado que el build sigue completo:** `public/sw.js` se genera (75 KB, el modo puerta
sin red intacto), el `standalone` arranca y responde 200 en `/es`, `/es/colecciones`,
`/modelos/es/boda` y `/modelos/es/xv-isabelle`, y `@swc/helpers` y `@node-rs/argon2` —con
su binario nativo— se rastrean dentro. Que es justo lo que ese glob existía para salvar.

---

## 2. El marco de la vista previa

**El ancho lo mandaba la altura de la ventana.** `.theme-phone-frame` tenía
`aspect-ratio: 43/93` con la altura al mando, así que el ancho salía de lo alta que fuera
la pantalla: 399 px en un portátil de 900, y 360 —el suelo— en cuanto la ventana bajaba de
780. La invitación se veía más estrecha de lo que está dibujada y cambiaba de ancho al
redimensionar. Ahora manda el ancho: `width: min(430px, 100%)`.

**En el teléfono, sin medidas fijas y con aire sutil.** Los `min()` de la regla base ya
resuelven a `100%` en cualquier aparato; lo único que cambia el bloque móvil es el relleno
—`clamp(10px, 1.6vh, 16px)` arriba y abajo, `clamp(8px, 2.4vw, 12px)` a los lados— y el
radio. **Lo que NO puede ponerse ahí es `width: 100vw`**: ignora el relleno y saca la
tarjeta fuera por los dos lados.

Medido en siete aparatos, sin desborde en ninguno: 343 en un Android de 360, 357 en un SE,
371 en un iPhone 14, 409 en un Pro Max; 430 de tablet en adelante.

**El escenario ya no es un color plano**: un foco cenital con las esquinas cayendo, hecho
con `color-mix` sobre los tokens del escenario —ningún hexadecimal nuevo—, y el marco con
relieve en cuatro capas: filo de luz en el canto, contorno, sombra de contacto y sombra
larga. **Esto último no lo pidió el usuario**; se dedujo de una captura que además no era
nuestra. Está señalado por si hay que revertirlo.

---

## 3. Los formularios de la vista previa se pueden rellenar

`PreviewSlot` estaba envuelto en `inert`, que apaga el bloque entero: ni teclado, ni foco,
ni clic. El razonamiento escrito era «un formulario de muestra que parece funcionar y no
guarda nada es peor que no tenerlo»; **el usuario decidió lo contrario el 30 de agosto**, y
la maqueta también los deja rellenar.

Ahora se bloquea **solo el envío**, con un `preventDefault` en fase de captura sobre el
`submit`: React descarta su propio manejador de acción cuando el evento ya llega con el
defecto impedido, así que la Server Action no se dispara. Y tiene que no dispararse: aquí
el token va vacío y no hay grupo detrás.

Probado en los dieciséis. Los ocho XV escriben nombre, cambian el selector y escriben
mensaje; las ocho bodas pulsan «ASISTIRÉ», ven aparecer el contador y lo suben y bajan
(2 → 1 → 2). En los dieciséis: cero POST, sin navegar, sin errores de consola, y lo escrito
se conserva.

---

## 4. La fidelidad de los ocho XV — catorce desviaciones

El método que funciona está en `CLAUDE.md` y se afinó aquí: **extraer el texto literal de
cada componente de la maqueta recortando por límites reales de función**, y enfrentarlo al
texto renderizado. Dos trampas:

- **Los rangos por «función siguiente» mienten.** `ValentinaIntroCover` está definido
  *dentro* del tramo entre `QuinceInviteNatalia` y `QuinceInviteValentina`, así que su
  «15 AÑOS» se le atribuyó a Natalia. Hay que listar **todas** las funciones y componer
  cada diseño con su cuerpo + su portada + su formulario.
- **macOS no distingue mayúsculas en nombres de fichero.** Un script que leía `n-xv.txt` y
  escribía `N-xv.txt` se comió su propia entrada y dio «todo falta». Si un cotejo sale al
  100 %, sospecha del script antes que del código.

Lo que quedó como diferencia legítima: el nombre de invitado de muestra («Pedro Zárate» vs
«Lucas Montaño») y la copia del RSVP, que es nuestro componente y no el de la maqueta.

### Lo que estaba mal, diseño por diseño

**Mascarada (`xv-valentina`)**
- La corona del cronograma iba `saturate(700%) hue-rotate(2deg)` → **dorada**. La maqueta
  (`invites-1.jsx:1148`) gira 230 grados: es **morada**. `hue-rotate(2deg)` no gira nada.
  El comentario del código decía «en dorado, no en morado» — al revés de la maqueta.
- La portada decía «XV AÑOS»; su maqueta escribe **«15 AÑOS»** (`:852`), y es el único de
  los ocho que pone la cifra. No puede salir del monograma del contenido, porque ese mismo
  dato pinta el «XV» grande del cuerpo, que sí es XV.
- El aviso «Solo Adultos» estaba truncado: faltaba «Sabemos lo especiales que son tus
  pequeños…».

**Encanto Marino (`xv-natalia`)**
- Corona con `hue-rotate(2deg) brightness(85%) contrast(95%)` y sin opacidad → **roja**. La
  maqueta (`:718`): `hue-rotate(265deg) brightness(80%) contrast(105%) opacity(0.6)`.

**Jardín Encantado (`xv-luciana`)**
- **No usa el encabezado compartido.** Su maqueta (`:1338-1345`) no pinta ni la barra
  «· MIS QUINCE · / 2026» ni el «XV» de 92 px: escribe «MIS QUINCE AÑOS» en un renglón de
  13, cuelga su lámina de borde y remata con el nombre. Nuevo `PielXv.encabezado`.
- **Su cita va dentro de una corona de hojas y luces** (`BotanicalWreath`, `:866-955`), que
  no estaba portada: heredaba la tarjeta de cristal del esqueleto. Portada entera en
  `kit/flora/BotanicalWreath.tsx` con el generador de semilla 41, que es el mismo LCG.
  Nuevo `PielXv.citaMarco`.
- El borde rasgado de la foto de apertura es un `clipPath` de **66 vértices**; teníamos un
  zigzag de 7.
- Velo `rgba(10,28,20,.55)` → `rgba(8,22,14,.55)`, y faltaba `filter: saturate(1.1)`.
- «Solo Adultos» truncado, igual que Mascarada.

**Noche Estrellada (`xv-fantasia`, «Alicia»)**
- **El itinerario era el de «Bajo el Mar»**: cuatro filas con «Acto Central 20:30» y
  «Fiesta 21:30». El suyo (`:1857-1863`) son **cinco**: Recepción 18:00, Acto Principal
  21:00, Baile Sorpresa 23:00, Torta 00:00, Cierre 02:00.
- Velo `rgba(10,20,42,.48)` → `rgba(8,16,40,.45)` (`:1767`).

**Gala Real (`xv-valeria`)**
- Su itinerario **no lleva la línea divisoria vertical** (`:2075`); todos los demás sí.
- **Estira la quinta fila a las dos columnas** (`gridColumn: "1 / -1"`, `:2083`) para que
  «Cierre» quede centrado. Es el único.
- La cita salía **dorada**: no fijaba color y caía a `uva`, que aquí es el oro. La maqueta
  la escribe con `body`, marfil.

**Encanto Musical (`xv-mariana`)**
- **El fondo era otro fichero.** La maqueta (`:2232`) pinta `fondo-disco-tacones-opt`;
  usábamos `fondo-disco-mariana-opt`. Los dos están en el repositorio.
- Faltaba `objectPosition: 'center 20%'`, que es lo que deja la bola arriba.
- Velo azulado `rgba(10,14,26,.48)` → negro puro `rgba(0,0,0,.4)`.
- `fondoBase` estaba en `#0c1830`, **el azul noche de Alicia**. Ahora negro.
- Le faltaba la fila de la torta y la última se llamaba «Despedida» en vez de «Cierre».
- Su torta la **dibuja** la maqueta en SVG plateado en vez de traerla como imagen —por eso
  nadie la había portado—. Nueva `TortaDePlata.tsx`.

### Lo que el esqueleto compartido repartía mal a todos

Esto es la lección grande de la sesión, y es la misma que ya dejó escrita la sesión de los
siete XV: **lo que la vista pone por defecto es la piel de «Bajo el Mar»**.

- **Las burbujas se pintaban por defecto** y solo Natalia las apagaba. En la maqueta
  aparecen **una vez**, en `QuinceInvite` (`:351-352`). Cinco diseños soltaban burbujas de
  fondo del mar en un bosque, un salón de gala y una máscara veneciana. Ahora se piden.
- **Las partículas, igual**: `?? '✦'`, `?? P.orquidea`, `?? 18`. La maqueta solo las pone
  en Sofía (18 lilas, `:353`) y Natalia (14 notas doradas, `:598`). Los otros cinco no
  llevan ninguna. Sin defectos: el que no las declara no las pinta.
- **La tarjeta de regalos se pintaba siempre.** El QR de la maqueta solo está en cuatro
  sitios (`:526, 769, 1200, 1487`). En Alicia, Valeria y Mariana enseñaba una tarjeta que
  no existe, con el rótulo del diccionario —«MESA DE REGALOS», en mayúsculas— escrito en
  Great Vibes: una cursiva de caligrafía haciendo de rótulo. Nuevo `PielXv.regalos`.
- **El itinerario y la tarjeta de regalos usaban `vidrioFuerte` y `sombraFuerte`.** En la
  maqueta **ninguno de los siete** usa un fondo reforzado ahí: todos se pintan con
  `...panel`. Es lo que los hacía verse macizos.
- **Cinco de siete paneles estaban mal**, comparados uno a uno con el `const panel` de cada
  componente:

  | | Maqueta | Teníamos |
  |---|---|---|
  | Sofía | `rgba(255,255,255,.55)` blur 12 | `.42` blur 14 |
  | Natalia | `rgba(0,0,0,.55)` blur 12 | blur 14 |
  | Valentina | `rgba(30,15,48,.82)` **sin desenfoque** | + blur 12 |
  | Luciana | `rgba(12,28,18,.8)` **sin desenfoque** | `rgba(12,32,22,.78)` + blur 12 |
  | Fantasía | `rgba(12,22,50,.6)` blur 12 | `.72` |
  | Valeria | `rgba(58,14,28,.62)` blur 12 | igual ✓ |
  | Mariana | `rgba(0,0,0,.65)` blur 12 | `rgba(14,18,30,.70)` |

  Dos cosas los oscurecían: opacidades más altas que las de la maqueta, y un
  `backdropFilter` **inventado** en Valentina y Luciana, que no llevan ninguno.
- **`iconoGala` solo reconocía tres claves** —`corona`, `fiesta`, `despedida`— y el
  contenido de gala usa `cena`, `baile`, `torta` y `cierre`. Las cuatro caían al `return`
  final: **cinco agendas idénticas** donde la maqueta pone cinco dibujos distintos. Y
  faltaba el de la torta.
- **`iconoNodo` se preguntaba por el diseño, no por la fila.** Declararlo para un solo
  icono dejaba las otras cuatro sin dibujo. Ahora manda fila a fila y cae a la imagen.

**Verificado contando en el navegador**, no leyendo código:

| Diseño | Burbujas | Partículas | Filas | Dibujos distintos |
|---|---|---|---|---|
| Sofía | 16 + 44 | 18 | 4 | 4 |
| Natalia | 0 | 14 | 4 | 4 |
| Valentina · Luciana | 0 | 0 | 4 | 4 |
| Alicia · Valeria · Mariana | 0 | 0 | 5 | 5 |

---

## 5. La nitidez del arte

`scripts/optimize-theme-assets.ts` reduce **todo** a 1400 px de ancho, con el comentario
«a 2x, 1400 basta». No basta: los teléfonos buenos son **3x**, y una foto apaisada recortada
con `cover` en caja vertical se amplía por el otro eje.

`quinceanera-verde` era 2816×1536 en origen, 1400×764 en el repositorio, y se pintaba a
~1290×1257: **ampliada un 65 %**. Se reencodó desde el original de la maqueta a 2400×1309;
`bosque-verdee` a 1536×2726.

**El guion optimiza in situ y borra el original**, así que volver a correrlo sobre lo que ya
está a 1400 no sirve: hay que reimportar de `uploads/`.

**Los otros catorce diseños siguen a 1400.** Está sin decidir si se suben todos.

---

## 6. Dos avisos operativos

- **No borres `.next` con el `pnpm dev` del usuario abierto.** Se hizo cinco veces al medir
  el build y encima se le escribió un `.next` de producción encima. El síntoma fue el
  optimizador de imágenes **colgado**: `fiesta-icono` y `despedida-icono` a `w=64` en AVIF
  no respondían en 30 segundos, y en pantalla salían dos círculos blancos. En un servidor
  limpio y aparte respondían en menos de 70 ms. **No había nada que arreglar en el código.**
  Para medir, `NEXT_DIST_DIR=.next-diag` y puerto propio.
- **No uses `git stash` con trabajo sin confirmar encima.** Se lanzó para comparar el lint
  y se llevó la sesión entera; el `pop` falló porque `next dev` había tocado `tsconfig.json`
  por su cuenta. Se recuperó, pero fue innecesario.

---

## Qué queda

- **El itinerario de Mariana va en una sola columna** en su maqueta (`flexDirection:
  column`, gap 18), con el rótulo a 13 y la hora a 24. Nosotros lo pintamos en rejilla de
  dos. Es lo único que queda de esa invitación, y está pendiente de que el usuario lo pida.
- **Subir la resolución del arte de los catorce diseños restantes**, si se decide.
- **El fondo con degradado y el relieve del marco** no se pidieron: están señalados por si
  hay que revertirlos.
- Nada confirmado en git. Todo el trabajo está en el árbol.
