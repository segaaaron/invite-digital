# Traspaso — la fidelidad de los dieciséis, y las herramientas para verla

**28–29 de agosto de 2026** · rama `main`, veintitrés commits, de `34680d6` a `c345529`

## Qué se cerró

Tres cosas, en este orden: **el editor por campos**, **las dos herramientas que faltaban
del ciclo anterior**, y —lo que se llevó la mitad de la sesión— **la fidelidad de las
dieciséis invitaciones contra la maqueta**.

### 1 · El contenido se edita por campos

Cada bloque era un `textarea` con el JSON dentro. Ahora es un formulario con un campo por
dato; las listas —itinerario, galería, avisos, anfitriones— se añaden, se mueven y se
quitan una a una. El valor sigue viajando como JSON en un campo oculto, porque componer
listas de longitud variable desde campos planos con índices en el nombre es donde se
pierden filas al reordenar; la diferencia es que ese JSON lo compone `aValor` y no una
persona.

Y la fotografía se elige **desde el propio bloque**: antes se subía en una tarjeta, se
copiaba el identificador y se pegaba en otra.

### 2 · Vista previa del evento y fotos optimizadas

`/panel/eventos/<slug>/vista-previa` enseña la invitación **de esa boda** sin repartir un
enlace. Y al subir una fotografía se reduce, se reencoda a WEBP y pierde los metadatos:
entraban tal cual con el tope de 8 MB, y una de móvil ronda los cuatro.

### 3 · La fidelidad

Aquí está el grueso, y aquí está la lección de la sesión.

## La lección: cómo se verifica que un diseño está fiel

Se intentaron cuatro métodos, en este orden, y **solo el cuarto sirve**:

| Método | Qué caza | Qué se le escapa |
|---|---|---|
| Leer el `.jsx` y portar | — | Que la referencia del usuario sea **más nueva** que el `.jsx` |
| Comparar qué imágenes usa cada diseño | Un diseño que estrena arte (Editorial) | Un diseño que ya tenía su arte y le faltan bloques (Botánica) |
| Comparar literales del código | Textos que no existen en ninguna parte | Todo lo que dependa de dónde se pinta |
| **Comparar el texto renderizado** y **las capturas lado a lado** | Bloques que faltan, orden distinto, color, composición | Poco: es el bueno |

**El cotejo de texto renderizado**: pedir `/modelos/es/<clave>` al servidor, quitar
etiquetas y comparar con los textos del componente de la maqueta. Sus falsos positivos son
siempre los mismos —rótulos de portada y de pase, que en la vista previa no se pintan;
claves de icono; y el contenido de muestra que escribimos distinto a propósito—.

**La comparación en imagen**: levantar la maqueta con `python3 -m http.server` desde su
carpeta y montar un `__cmp.html` que cargue sus scripts y renderice un componente a 430 px.
Dos avisos que costaron tiempo:

- **Las portadas de la maqueta no se pueden anular desde fuera.** Cada script de Babel
  tiene su propio ámbito, así que `window.LucianaIntroCover = () => null` no cambia lo que
  ve el componente. Tampoco se abren con un clic sintético. La vía que funcionó fue
  comparar los diseños cuya portada sí se abre y, para los demás, mirar el código.
- **Borra el `__cmp.html` al terminar.** Es la carpeta del usuario, no el repositorio.

## Lo que se encontró y se arregló

**De composición** — lo más grave, y lo que ningún cotejo de texto habría visto:

- **Tres invitaciones se partían en dos fuera del teléfono**: la portada a sangre de
  Botánica, Cinemática y Palacio Griego quedaba fuera de `ThemeColumn`, y en un portátil la
  fotografía se estiraba a 1900 px —con `object-fit: cover` lo que se veía era el cielo—.
- **Todas se servían a lo ancho de la ventana.** La maqueta las enseña dentro de un marco
  de teléfono. Ahora también, con su cruz de salir.
- **Tres XV abrían por el título** y la maqueta abre con la fotografía de la quinceañera a
  sangre (Bosque Encantado, Gala Real) o con la bola de espejos (Encanto Musical).
- **Editorial estaba rehecho en la maqueta**: de revista crema con tinta negra a verde
  botánico con oro, con doce imágenes propias donde no tenía ninguna.
- **A Botánica le faltaban** la fotografía grande, «nuestra historia», el collage —con las
  fotos ya en el repositorio, sin usar—, el saludo al invitado, los padres y padrinos, las
  dos tarjetas con enlace al mapa, el ramo, el aviso de solo adultos y la tarjeta de fotos.
- **A Palacio Griego le faltaban** el busto de mármol, «mi historia», el florero y la
  columna: de sus seis imágenes usaba dos.

**De copia y color**:

- **El saludo al invitado** era una línea suelta —«Familia X · Lugares: 2»— donde el diseño
  compone cuatro piezas. Ahora el invitado viaja **como dato** (`guestInfo`) y lo pinta cada
  diseño con su tipografía.
- **Cada diseño habla con su voz**: «Cronograma» y «Detalles que Abrazan» en cuatro XV,
  «NUESTRO MEJOR REGALO» en Bodas de Oro, «LIBRO DE FIRMAS DIGITAL» en Étoile… No son
  traducciones, así que no salen del diccionario: las declara el diseño y lo que no declare
  cae al diccionario.
- **Cinco paletas de XV** llevaban dorados aproximados. Bosque Encantado tenía los acentos
  en verde donde la maqueta los pinta en oro.
- **La tira de cuatro fotos de Bodas de Oro** se veía como una barra amarilla: iba dorada
  sobre dorado.

## Las herramientas que quedan para la próxima

Un cambio de piel se comprobaba con `pnpm build` —**cinco minutos**— antes de cada pasada
de e2e. Ya no:

| Comando | Para qué | Coste |
|---|---|---|
| `pnpm shots` | Las dieciséis a fichero en `.shots/`, de un tirón | ~17 s |
| `pnpm test:e2e:dev` | Las e2e contra `next dev`, **sin build** | ~45 s en frío |
| `E2E_WORKERS=4 pnpm test:e2e modelos.spec.ts` | En paralelo lo que no toca la base | ~15 s |
| `pnpm check` | typecheck + lint + unitarias + fronteras + multitenencia | ~50 s |

Detalles en `CLAUDE.md`, sección «Cómo iterar rápido». Dos que no son evidentes:
`E2E_DEV=1` salta `checkin` y `puerta` —ahí Serwist va apagado— y usa su propia carpeta de
compilación, porque dos `next dev` sobre el mismo `.next` no arrancan.

**Medido y en contra de lo que supuse**: mover `output: standalone` a solo-Docker **no
acorta el build**. Con y sin él son cinco minutos; lo que cuesta es webpack.

## Qué queda

1. **La referencia del usuario manda sobre el `.jsx`.** Dos veces en esta sesión su captura
   tenía bloques que el archivo no trae. Si vuelve a pasar, no discutas con el archivo:
   pídele la captura y porta lo que se ve.
2. **El botón «SUBIR MIS FOTOS»** no existe: no hay función que suba fotografías de
   invitados. La tarjeta está con su icono y su texto; el botón, no. Es lo único que se
   dejó fuera a propósito de la copia de los diseños.
3. **Dos portadas** de la maqueta —telón y billete— se portaron como variantes del sobre
   del kit; las de fotografía viven con su tema. Si aparece otra, ese es el patrón.
4. Del ciclo anterior siguen fuera, por decisión del usuario: **XV Años V2** y las demás
   categorías, el **editor visual** y el **audio real**.
5. **Para desplegar faltan los datos del usuario**, no código: WhatsApp, dominio, correo,
   contraseña de Postgres y los datos de transferencia con su QR en `/panel/admin/pagos`.
   `pnpm preflight` corta mientras estén vacíos.

## Comprobado

- **1838 unitarias, 209 e2e**, typecheck, lint, `verify:boundaries`, `verify:tenancy`,
  `pnpm build`.
- Las dieciséis portadas del catálogo regeneradas: se captura **el marco del teléfono**, no
  la ventana.
- La e2e `checkin › sin red la puerta sigue registrando` sigue fallando de vez en cuando
  por cronometraje del Service Worker; a la segunda pasada va en verde.
