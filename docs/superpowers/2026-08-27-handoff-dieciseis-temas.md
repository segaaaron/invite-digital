# Traspaso — los dieciséis temas de invitación

**27 de agosto de 2026** · rama `temas-invitacion`

## Qué se cerró

La web vendía dieciséis modelos que **no existían como piezas**. El motor de invitaciones
tenía un solo tema —`clasico`, una hoja centrada— y el escaparate ocho filas de catálogo
dibujadas como una tarjeta de papel: `perla`, `mármol`, `laurel`, `carmesí`, `zafiro`,
`nacarado`, `ónix`, `sobre`. Lo que el cliente elegía y lo que el invitado acababa
recibiendo no tenían nada que ver.

Ahora hay **dieciséis diseños reales**, portados de la maqueta `VallHallaWwepApp`:

**Bodas** — `boda-bot` Botánica · `boda-ed` Editorial · `boda-cin` Cinemática · `boda`
Étoile · `civil` Civil · `aniv` Bodas de Oro · `eng` Compromiso · `dest` Destino

**XV años** — `xv` Bajo el Mar · `xv-natalia` Encanto Marino · `xv-valentina` Mascarada ·
`xv-luciana` Bosque Encantado · `xv-fantasia` Noche Estrellada · `xv-valeria` Gala Real ·
`xv-mariana` Encanto Musical · `xv-isabelle` Palacio Griego

## Lo que hay que saber antes de tocar nada

Está todo en `CLAUDE.md`, en cinco secciones nuevas: los dieciséis temas, el contenido,
las imágenes del evento, el escaparate y las reglas que esto amplió. Lo más caro de
redescubrir:

1. **`overflow-x: clip`, nunca `hidden`, en el artículo de un tema.** `hidden` hace que
   `overflow-y` pase a `auto` por especificación, el elemento se vuelve contenedor de
   scroll y los fondos `sticky` se anclan a él en vez de a la ventana.
2. **El seguro de `Reveal` no se puede quitar.** En una pestaña que no está al frente el
   `IntersectionObserver` no dispara nunca. Sin seguro, la invitación se queda en blanco.
3. **`next/font` exige literales.** El typecheck no lo ve; el build muere. Hay prueba que
   impide que `fonts.ts` y `font-manifest.ts` se separen.
4. **Las fuentes de Google se piden por su subconjunto `latin`.** El primer `@font-face`
   de la hoja es el cirílico, y baja sin una sola tilde.
5. **`mergeContent` nunca pisa lo escrito.** Cambiar de diseño no puede llevarse por
   delante el itinerario de una boda.

## Lo que encontró el QA al final

Dos cosas que había dado por hechas y no lo estaban. Las dos están arregladas, pero
conviene saber cómo se escaparon:

1. **`uploadMediaAction` no la llamaba ninguna pantalla.** Estaba escrita y probada, y el
   atelier no podía subir una sola fotografía. Se detecta con un `grep` de referencias por
   cada exportado nuevo de `actions.ts` — la regla del proyecto lo pide y vale la pena
   correrlo antes de cerrar cualquier rebanada.
2. **Un bloque de contenido borrado volvía solo.** `contentFor` fusionaba con la muestra
   del diseño en cada lectura. La invitación se veía perfecta y el fallo solo aparece si
   alguien intenta **quitar** una sección, que no es lo que se prueba primero.

De ahí salió la regla que ahora está en `CLAUDE.md`: **sin fila, la muestra; con fila
vacía, vacío.**

## Qué queda

Nada a medias de lo que se empezó. Lo que **no** entra, y por qué:

- **La sección «XV Años V2»** de la maqueta (nueve diseños) y las demás categorías
  —Sacramentos, Cumpleaños, Despedidas, Festejos, Hitos, Profesional—. Decisión del
  usuario: pidió bodas y XV años.
- **El editor visual** de la maqueta (`Editor.html`, `design-canvas.jsx`). Esto elige un
  diseño y rellena su contenido; no lo dibuja.
- **Audio real** en el reproductor. La maqueta lo pinta y no suena; aquí también. Servir
  audio propio es su propio problema: almacén, formato y licencia de la grabación.

### Para la siguiente sesión

Nada de esto bloquea usar la colección hoy. Por orden de valor:

1. **Editor por campos para el contenido.** Hoy cada bloque se edita como JSON. Funciona,
   valida en el servidor y no pierde filas al reordenar —que era el riesgo—, pero pedirle a
   un atelier que escriba llaves y comas para cambiar la hora de la cena es pedir errores.
   El itinerario y la galería son los que más lo piden.
2. **Elegir la imagen desde el bloque.** Hoy se sube en una tarjeta, se copia el
   identificador y se pega en otra. Un selector que enseñe las miniaturas del evento
   dentro del propio bloque quitaría ese paso.
3. **Vista previa del evento real desde el panel.** `/modelos/…` enseña el diseño con su
   contenido de muestra; falta ver la invitación **de esta boda** sin repartir un enlace.
4. **Recorte y redimensionado al subir.** Las fotos entran tal cual, con el tope de 8 MB.
   Una de móvil moderna ronda los 4 MB y se sirve entera a un invitado con datos.

### Fuera de alcance, por decisión

## Comprobado

- 1797 unitarias, 173 e2e, typecheck, lint, `verify:boundaries`, `verify:tenancy`.
- La e2e `checkin › sin red la puerta sigue registrando` **falla de vez en cuando**: es
  cronometraje del Service Worker al volver la red, no una regresión de esta rama —no toca
  nada del check-in—. A la segunda pasada va en verde. Si vuelve a molestar, ahí está el
  hilo del que tirar.
- Los dieciséis a 390, 559, 820 y 1280 px, sin un solo desborde de contenido.
- Migraciones `0026`–`0029` aplicadas dos veces sobre la base de desarrollo y una vez
  sobre una base vacía, con el esquema idéntico columna por columna.
- `pnpm build` limpio con el heap actual: los dieciséis temas no lo tumbaron.
- `pnpm preflight` corta si una plantilla publicada apunta a un diseño que el motor no
  conoce. Se verificó metiendo una clave inventada en la base.
