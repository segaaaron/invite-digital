# Traspaso — las portadas apagadas, las ranuras marfiles y las fotos del invitado

**29 de agosto de 2026** · rama `main`, tres commits, de `d018b05` a `c2938aa`

## La lección de esta sesión

**Lo que la vista previa no pinta, nadie lo compara.** El escaparate
—`/modelos/es/<clave>`— es donde se cotejó la fidelidad de los dieciséis en la sesión
anterior, y ahí dos cosas no salían: **la portada de apertura**, apagada con `preview` desde
el primer tema, y **las cuatro ranuras** —RSVP, mesa de regalos, libro de firmas y pase—,
que van inertes con un aviso.

Detrás de esos dos huecos llevaba escondido desde el principio:

- diez imágenes del arte que no se veían nunca;
- seis portadas que no se parecían a su modelo;
- ocho diseños pintando tipografías que no declaraban;
- y el formulario de RSVP entrando **marfil y dorado** dentro de una invitación guinda.

El método de la sesión anterior —texto renderizado y capturas lado a lado— es el bueno, y
seguía sin ver nada de esto. Lo que faltaba era **mirar una invitación de verdad**: sembrar
la demo, abrir `/i/<token>` y desplazarse hasta abajo. Es lo primero que hay que hacer la
próxima vez, antes que el escaparate.

## Lo que se encontró y se arregló

### 1 · Las portadas estaban apagadas en el escaparate

`{preview === true ? null : <Portada/>}`, en los dieciséis. Al encenderla salieron:

- **«Editorial»** dibujaba un óvalo encima del que ya trae la fotografía, y le faltaban el
  rótulo «NUESTRA BODA», las iniciales y el orden de las piezas.
- **«Palacio Griego»** no escribía ni «15 AÑOS» ni el nombre.
- **Las cinco de XV con fotografía eran una sola pieza genérica.** En la maqueta son cinco
  componentes distintos: la máscara preside en «Mascarada» y el faro cierra en «Bosque
  Encantado»; «Noche Estrellada» escribe el nombre **dentro** del sobre, al 84 % de su
  altura; «Gala Real» va al 18 % por cada lado porque el marco ocupa los bordes; «Encanto
  Musical» no lleva emblema y baja el texto al 83 % porque arriba está la cara de la
  quinceañera. Ahora `CoverShell` guarda lo único que comparten —el botón, la fotografía y
  sus velos— y cada diseño compone lo suyo.
- **«Encanto Marino» y «Encanto Musical»** perdían «INGRESA A MI INVITACIÓN», y la chapa
  salía sin el nombre.
- **El telón y el billete** no llevaban su chapa con borde, y repetían «toca en cualquier
  lugar», que es del sobre.
- **«Bodas de Oro»** abría por sobre; la maqueta abre por telón.
- **Siete llamadas decían «ABRIR INVITACIÓN»**; la maqueta dice «¡NOS CASAMOS!», «UNIÓN
  CIVIL», «NOW · SHOWING», «50 AÑOS DE AMOR», «DESTINATION · TULUM». Solo «Étoile» abre con
  la genérica.

Y un fallo que el apagón tapaba: **ocho diseños pintaban tipografías que no declaraban en
sus `fonts`**. La variable CSS no existe, el navegador cae a la de respaldo y el diseño se
ve con otra letra, sin un solo error y con el typecheck en verde.

### 2 · Las ranuras entraban marfiles

El RSVP, la mesa de regalos, la respuesta del libro de firmas y el pase son nuestros
—llevan una Server Action, una reserva que decide la base, un QR— y por eso viven en su
módulo y se colocan en ranuras. Estaban escritos con los colores de la web pública.

**La solución no son dieciséis formularios**: el `<article>` del tema redefine los tokens de
color con su paleta, y esas cuatro piezas —que ya se escriben contra esos tokens— heredan la
del diseño **sin tocar una sola de sus clases**.

Dos cosas que salieron de ahí:

- `--color-on-gold`, porque el botón de confirmar era `text-bg-raised` sobre `bg-gold` y con
  el token redefinido a un vidrio translúcido quedaba escrito en tinta invisible.
- **«Destino» invierte**: su degradado va de azul de mar a arena y las ranuras caen ya sobre
  la arena, así que ahí la tarjeta es blanca al 92 % y la tinta, mar profundo. Es lo que
  hace la maqueta en ese mismo bloque.

### 3 · La animación

- **El confeti al confirmar** existía en la maqueta y aquí no pasaba nada.
- **Cuatro fotogramas diferían**: los tres `drift` no giraban y llevaban la opacidad al 0,6
  en vez del 0,7; `twinkle` no escalaba; `wedGlowPulse` estaba **invertido**, con un
  escalado que la maqueta no tiene.
- **Cinco `@keyframes` no los disparaba nadie**: venían de diseños que este proyecto no
  porta.
- Las duraciones y las curvas de **todas** las animaciones compartidas se cotejaron una a
  una con la maqueta y coinciden.

### 4 · «SUBIR MIS FOTOS»

Era lo único que la sesión anterior dejó fuera a propósito. Ahora hay pantalla
—`/i/[token]/fotos`, aparte como el pase—, acción y almacén: `event_media` con la
procedencia dentro (`uploaded_by_group_id`, `set null`), tope por grupo en el servidor,
límite de tasa por IP y el candado de la contraseña del evento.

## Las guardias nuevas

| Prueba | Qué impide |
|---|---|
| `themes/fonts.test.ts` | Que un diseño pinte una familia que no declara |
| `themes/kit/slot-skin.test.ts` | Que un diseño no le preste su paleta a las ranuras |
| `themes/kit/keyframes.test.ts` | Que se acumulen animaciones que nadie dispara |
| `bodas/boda.view.test.tsx` | Que la portada vuelva a apagarse en la vista previa |

Las cuatro se verificaron rompiéndolas a mano.

## Un tropiezo que ya estaba escrito

Las fixtures de invitación eran un módulo con un cliente de Postgres dentro. Al añadir la
suite de las fotos, su `afterAll` cerró el pool que la suite del RSVP estaba usando: «write
CONNECTION_ENDED» en una prueba que no toca la base. Estaba en `CLAUDE.md` desde los
invitados por persona. Ahora es una fábrica, y cada suite abre la suya.

## Qué queda

1. **La animación de la maqueta está cotejada; el audio del reproductor sigue fuera** por
   decisión del usuario: la maqueta lo pinta y no suena.
2. **Del ciclo anterior siguen fuera**, también por decisión: **XV Años V2** y las demás
   categorías, y el **editor visual**.
3. **Para desplegar faltan los datos del usuario**, no código: WhatsApp, dominio, correo,
   contraseña de Postgres y los datos de transferencia con su QR en `/panel/admin/pagos`.
   `pnpm preflight` corta mientras estén vacíos.
4. **`responsive.spec.ts` («las vistas del administrador») se pasa de los 30 s contra
   `next dev`**: son veinticinco navegaciones con `networkidle` y ahí cada ruta compila al
   pedirla. No es un fallo: sola pasa, y contra la imagen pasa siempre. Si vuelve a salir en
   rojo en una pasada `E2E_DEV=1`, es esto.

## Comprobado

- **1885 unitarias**, typecheck, lint, `verify:boundaries`, `verify:tenancy`.
- **212 e2e contra la imagen**, cero fallos.
- `pnpm build` en verde, y las dieciséis portadas del catálogo regeneradas —nueve
  cambiaron: las que enseñaban una ranura dentro del recorte—.
