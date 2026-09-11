# Traspaso — los siete XV, repasados uno por uno contra su maqueta

30 de agosto de 2026. Sesión corta y de piel: **no se tocó dominio, ni base, ni acciones**.
Todo el trabajo está en `src/modules/events/ui/themes/xv/` y en `themes/kit/MarcoQr.tsx`.

## Lo que más importa de esta sesión

**El esqueleto compartido llevaba la piel de «Bajo el Mar» puesta a los siete.** Siete de
los ocho XV comparten `XvSharedView`, y lo que cambia entre ellos entra por `PielXv`. El
problema es lo que **no** estaba en `PielXv`: la sombra blanca del texto, el halo blanco del
titular, el disco blanco del cronograma, el filete degradado, el marco rosa del retrato, la
cita en mayúsculas de DM Sans, el orden del reloj y la fecha. Todo eso estaba escrito a
pelo en la vista, con los valores de la marina, y por eso **seis invitaciones oscuras
escribían con sombra blanca sobre negro** y ninguna se parecía del todo a su modelo.

La regla que sale de aquí: **si un valor aparece distinto en dos maquetas, no es de la
vista, es de la piel**. Ya son treinta y tantos campos de `piezas` y no es una piel
inflada: es exactamente la lista de lo que la maqueta reparte distinto en cada diseño.

Lo segundo: **una pieza suelta de un diseño no se puede quedar «por si acaso»**. Mascarada
pintaba su máscara **dos veces** —colgando sobre el arco del retrato y encima de la cuenta
atrás— porque `corona` y `reloj` eran obligatorios en el tipo y había que ponerles algo.
Ahora los dos son opcionales, y quien no los declare no pinta nada. Lo mismo con `retrato`:
«Gala Real» y «Bosque Encantado» abren con su fotografía a sangre y la repetían dentro del
arco rosa dos pantallas más abajo.

Lo tercero, y es el que no se ve leyendo código: **las partículas se reparten por su
contenedor**. `FloatingParticles` coloca sus dieciocho chispas en porcentajes de quien las
contiene. En la maqueta ese contenedor es la ventana; aquí era el `<article>` entero, seis
mil píxeles de invitación. Dieciocho chispas repartidas por todo el scroll son dos o tres
por pantalla, y el efecto **no existía** en ninguno de los siete. Va en un contenedor
`sticky` de `100dvh` con `margin-bottom: -100dvh`, como el fondo. **`fixed` no vale**:
dentro del marco de teléfono se ancla al marco, que lleva `translateZ(0)`.

## Cómo se hizo la comparación

Leyendo el `.jsx` **función por función** —`QuinceInvite` (Sofía), `QuinceInviteNatalia`,
`…Valentina`, `…Luciana`, `…Fantasia`, `…Valeria`, `…Mariana` en `invites-1.jsx`, y
`QuinceIsabelleBotanical` en `wedding-variants.jsx`— y capturando **la nuestra por tramos**
con un guion de sesión: Playwright, ancho 520, y `scrollTop` del contenedor del marco de
820 en 820 hasta el final. Mirar la primera pantalla no sirve: lo que estaba mal estaba a
los tres mil píxeles.

Ese guion no se guardó —es de sesión, como los de la sesión de fidelidad—, pero el método
es ese, y sin él no se habría visto ni la máscara colgando ni el candelabro metido dentro
del panel de la cita.

## Lo que se corrigió, diseño por diseño

**Transversal (los seis oscuros)**

- Fondo `fixed` y velo **sin desenfoque**. Solo la marina lleva el velo borroso; los seis
  oscuros lo llevan liso y con la fotografía clavada a la ventana. Con el velo de la marina
  el fondo salía apagado y difuminado.
- `piezas.sombraTexto`: la sombra del texto, negra en los cinco que la usan. Antes era la
  blanca de la marina, escrita a pelo en cinco sitios de la vista.
- `piezas.haloTitular` / `haloTitularFiltro`: blanco en la marina, negro y desenfocado en la
  partitura, `'none'` en los cinco que escriben con sombra.
- `piezas.veloTexto`: el velo oscuro difuminado que «Encanto Marino» pone bajo la barra de
  arriba y bajo la cita.
- `piel.veloInferior`: el degradado del pie de «Mascarada» y «Bosque Encantado».
- `piezas.discoItinerario` / `discoBorde`: el disco del icono del cronograma. Era blanco al
  85 % fijo; un icono dorado sobre negro salía dentro de una moneda blanca.
- `piezas.itinerarioSeparador`: `'linea'` (marina y partitura), `'ornamento'` (Mascarada y
  Bosque) o `'ninguno'` (los tres de gala).
- `piezas.relojDebajo`: la pieza de la cuenta atrás va encima del «Faltan» en dos diseños y
  **debajo** en cuatro.
- `piezas.fechaFiletes` y `piezas.fechaOrnamento`: la tarjeta de la fecha se enmarca con dos
  filetes (marina y partitura), con el ornamento del diseño, o con nada.
- `piezas.firma`: la firma del cierre iba con la tinta clara del diseño; va con su oro.
- `piel.ornamento` manda también en los avisos sueltos, en el formulario y en el cierre: el
  filete de la marina estaba fijo en los tres.

**«Mascarada»** — máscara colgando sobre el retrato (fuera), máscara sobre la cuenta atrás
(fuera), arco a `+40` en vez de `-30`, marco del arco de rosa a oro y sin desenfoque, cita
dentro de su panel, **ornamento propio** (`AbanicoOrnamental`, 200×30 con sus volutas y su
ramillete: el `DividerOrnamental` de 126×24 es el de la marina), disco del cronograma
morado, `saturate(1.1)` en el fondo, y la tarjeta de regalos entera.

**«Bosque Encantado»** — el farol colgando sobre el retrato y el retrato repetido (fuera),
recepción **centrada** (pieza arriba, hora al pie), reloj debajo del «Faltan», cierre = faro
a 110, y **cuatro iconos de línea distintos** en el cronograma donde había cuatro veces el
mismo farol.

**«Noche Estrellada» / «Gala Real» / «Encanto Musical»** — cita en panel serif itálico
18/2.1 (salía en DM Sans 13 mayúsculas), la pieza de 260 **fuera** del panel, fecha desnuda,
reloj debajo, disco del color del diseño y sin línea bajo el rótulo. Además: Noche Estrellada
tenía **el ramo y la luna cruzados** —el ramo va entre la cita y los padres, la luna cierra—
y una tiara guinda de otro diseño en la vestimenta, que ahora son sus dos siluetas de línea;
Gala Real repetía su fotografía dentro del arco; Encanto Musical recupera la sombra doble de
su nombre y su recepción centrada.

**«Encanto Marino»** — halo negro, velos bajo barra y cita, los dos filetes de la tarjeta de
la fecha (no existían), `lilaFuerte` de `#8c6a21` a `#b8901f` —el oro del diseño, no uno más
oscuro que no eligió nadie— y los colores de la tarjeta de regalos, que estaban invertidos:
el rótulo de los sobres en marfil y su nota en oro, justo al revés que la maqueta.

**«Bajo el Mar»** y **«Palacio Griego»** — comparados; sin cambios salvo los filetes de la
fecha en la marina. Isabelle no comparte esqueleto y estaba bien.

## El código de la mesa de regalos

Era **marfil sobre blanco** en seis de los siete: `MarcoQr` recibía `fg={P.violetaHondo}`, y
en esos diseños ese color es el marfil del texto. Un código se lee por contraste, y ninguno
de esos lo tenía. Ahora es `piezas.qrTinta`, casi negro, con el valor que da cada maqueta
—`#1a1208` sobre el oro, `#2A1140` sobre el morado—, y `piezas.qrAro` para el aro de color
que le ponen dos diseños. `MarcoQr` acepta `aro`: con él, papel de 3 px y anillo; sin él,
papel de 8 y sombra.

## Reglas nuevas que conviene no perder

- **La invitación de referencia manda sobre el `.jsx`.** El `.jsx` dice que «Mascarada» no
  pinta ni burbujas ni partículas —solo lo hacen la marina y la partitura—; lo que el
  usuario enseña sí las tiene. Se quedan.
- **Un valor por defecto en la vista es un color escondido.** Los `?? P.loQueSea` de la
  vista son la piel de la marina heredada por los otros seis. Cuando algo «se ve raro» en un
  diseño y bien en Sofía, ahí está la causa.
- **Comparar por tramos, no por la primera pantalla.** Todo lo gordo de esta sesión estaba
  entre los 1 000 y los 4 000 píxeles de scroll.

## Estado

`pnpm typecheck`, `pnpm lint` y las unitarias de temas (102, incluidas las 41 de XV) en
verde. **No se corrieron las e2e** ni `pnpm build`: es un cambio de piel y el usuario pidió
no gastar en eso. Antes de fusionar conviene pasar `tests/e2e/modelos.spec.ts`, que es la
que vigila que ningún tema se salga de la columna a 1440 px.

Ficheros nuevos: `themes/xv/AbanicoOrnamental.tsx`, `themes/xv/IconosLineaXv.tsx`,
`themes/kit/MarcoQr.tsx` (ya existía; aquí solo gana `aro`).

## Lo que queda de los XV

- **Los tres de gala no son el esqueleto compartido del todo.** En la maqueta no tienen
  retrato, ni tarjeta de invitado, ni mesa de regalos con QR; nosotros se los pintamos
  porque el contenido de muestra los trae. Es una decisión pendiente: o se les quita la
  sección, o se acepta que aquí llevan más que en la maqueta.
- **«Bosque Encantado» abre distinto**: su maqueta no tiene la barra «· MIS QUINCE · 2026»
  ni el «XV / AÑOS», sino un rótulo pequeño, la lámina y el nombre. Sigue con la cabecera
  compartida.
- **La cita de «Bosque Encantado» va dentro de una corona botánica** (`BotanicalWreath` de
  la maqueta) que no está portada.
- Los otros ocho diseños —las bodas— no se miraron en esta sesión.
