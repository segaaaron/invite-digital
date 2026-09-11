import type { CSSProperties, ReactNode } from 'react'

/**
 * Lo que distingue a un diseño de XV de otro.
 *
 * **Siete de los ocho comparten composición** —cabecera con «MIS QUINCE», titular XV /
 * AÑOS / nombre, dedicatoria en panel, retrato en arco, padres, fecha destacada, cuenta
 * atrás, saludo al invitado, recepción, mapa, cronograma de cuatro hitos, música,
 * vestimenta, avisos y cierre con firma— y lo que cambia es la piel: bajo el mar en
 * pasteles, partitura dorada sobre negro, mascarada morada, bosque verde, noche
 * estrellada, gala guinda, disco plateado.
 *
 * En la maqueta también son el mismo diseño repintado. Copiarlo siete veces serían cuatro
 * mil líneas donde un arreglo hay que hacerlo siete veces y se hace una.
 *
 * Todo lo que cambia entre diseños está aquí. Todo lo que cambia entre eventos está en
 * `event_content`. Lo que queda en la vista es la composición.
 */
export type PielXv = {
  /** El degradado o color de fondo del artículo entero. */
  readonly fondoBase: string
  /** El velo que se pone sobre la fotografía para que el texto se lea. */
  readonly velo: string
  /**
   * El degradado que «Mascarada» y «Bosque Encantado» apoyan en el pie de la ventana, sobre
   * el velo: es lo que apaga la fotografía justo donde va el cierre.
   */
  readonly veloInferior?: string
  /** La capa de fondo: la fotografía a sangre de este diseño. */
  readonly fondo: ReactNode
  /**
   * Las partículas que flotan sobre el diseño.
   *
   * No son las mismas en todos: «Encanto Marino» suelta **notas musicales doradas**, no las
   * estrellas de la marina, y son catorce, no dieciocho. Sin esto, una invitación de saxo y
   * partitura salía con las estrellitas lilas del fondo del mar.
   */
  readonly particulas?: { readonly char: string; readonly color: string; readonly count: number }

  /**
   * El encabezado propio, para el diseño que no usa el compartido.
   *
   * Los siete abren igual —la barra «· MIS QUINCE · / 2026», el «XV» de 92 y «AÑOS» de 26
   * sobre el nombre— menos **«Jardín Encantado»**: su maqueta
   * (`invites-1.jsx:1338-1345`) no pinta ni la barra ni el monograma. Escribe «MIS QUINCE
   * AÑOS» en un renglón pequeño, cuelga debajo su lámina de borde y remata con el nombre.
   * Sin esta pieza heredaba las tres del esqueleto, así que la invitación abría con un
   * «XV» gigante que ese diseño no tiene y con un año que su maqueta no escribe.
   *
   * Quien no la declare sigue con el encabezado compartido, que es lo correcto para los
   * otros seis.
   */
  readonly encabezado?: (datos: {
    readonly eyebrow: string
    readonly serial: string
    readonly name: string
  }) => ReactNode

  /**
   * El marco que envuelve la cita, para el diseño que no la deja suelta ni en un panel.
   *
   * «Jardín Encantado» la mete **dentro de una corona de hojas y luces**
   * (`invites-1.jsx:1349`), que es la pieza que le da nombre al diseño; sin esto heredaba
   * la tarjeta de cristal del esqueleto y la corona no se pintaba en ninguna parte.
   *
   * Recibe la cita ya compuesta y devuelve lo que se pinta en su lugar. Quien no lo
   * declare sigue con el panel o con la cita suelta, según `cita.panel`.
   */
  readonly citaMarco?: (cita: ReactNode) => ReactNode

  /**
   * Si el diseño pinta la tarjeta de regalos —«Detalles que Abrazan», con el sobre y el
   * código—. **Se pide**: solo la traen los cuatro de la familia marina
   * (`invites-1.jsx:526, 769, 1200, 1487`).
   *
   * Se pintaba siempre, así que «Noche Estrellada», «Gala Real» y «Encanto Musical»
   * enseñaban una tarjeta que su maqueta no tiene, y encima con el rótulo del diccionario
   * —«MESA DE REGALOS», en mayúsculas— escrito en la cursiva Great Vibes, que es letra de
   * caligrafía y no de rótulo.
   */
  readonly regalos?: boolean

  /**
   * La línea vertical que parte el itinerario en dos. La llevan todos menos **«Gala Real»**
   * (`invites-1.jsx:2075`, que abre la rejilla sin ella).
   */
  readonly itinerarioDivisoria?: boolean

  /**
   * Si la última fila del itinerario ocupa las dos columnas cuando queda impar. Solo lo
   * hace «Gala Real», con `gridColumn: "1 / -1"` en la quinta (`invites-1.jsx:2083`): sin
   * eso, «Cierre» cae suelto en la columna izquierda en vez de centrado.
   */
  readonly itinerarioUltimaCentrada?: boolean
  /**
   * Las burbujas de vidrio, **solo para «Bajo el Mar»**.
   *
   * Se piden con `true`; quien no lo declare no las pinta. Estuvo al revés —encendidas por
   * defecto y apagadas por quien no las quisiera— y el resultado fue que cinco diseños
   * soltaban burbujas de fondo del mar en un bosque, un salón de gala y una máscara
   * veneciana. En la maqueta aparecen una sola vez, en `QuinceInvite`
   * (`invites-1.jsx:351-352`).
   */
  readonly burbujasPremium?: boolean
  /**
   * Si la fotografía de fondo va **fija a la ventana** en vez de desplazarse.
   *
   * «Encanto Marino» la clava con `position: fixed` y sin desenfoque, para que la partitura
   * dorada no se apague bajo el velo.
   */
  readonly fondoFijo?: boolean
  /** Las burbujas, que solo tiene el de mar. */
  readonly burbujas: ReactNode
  /**
   * La portada a pantalla completa, ya construida con sus datos.
   *
   * Recibe también las líneas del diccionario —el convite y la llamada a entrar— porque
   * cada diseño las coloca de otra manera: dos renglones sueltos en «Mascarada», una sola
   * línea al pie en «Gala Real». Pintarlas fuera obligaría a que todas las portadas
   * tuvieran la misma forma, que es lo que las dejó siendo la misma.
   */
  readonly portada: (datos: {
    eyebrow: string
    name: string
    title: string
    openLabel: string
    /** «Te invito» y «a celebrar mi fiesta». */
    line1: string
    line2: string
    /** «INGRESA A MI INVITACIÓN». */
    enter: string
  }) => ReactNode
  /**
   * El color de **cada pieza**, cuando este diseño no lo reparte como «Bajo el Mar».
   *
   * Los siete XV comparten composición y **no comparten el reparto de color**: en la
   * maqueta, la fecha de «Mascarada» va en oro y la hora de su cronograma en marfil, y en
   * «Bajo el Mar» es justo al revés. El esqueleto compartido llevaba los nombres de Sofía,
   * así que seis diseños salían con los colores cruzados. Lo que no se declare aquí cae en
   * la paleta, que es lo que hace «Bajo el Mar».
   */
  readonly piezas?: {
    /** «· MIS QUINCE ·» y el año, arriba del todo. */
    readonly serial?: string
    /** El «XV» grande de la cabecera. */
    readonly monograma?: string
    /** El degradado recortado sobre el «XV», cuando el diseño lo pinta en metal. */
    readonly monogramaDegradado?: string
    /** «AÑOS». */
    readonly anios?: string
    /** El nombre de la quinceañera en la cabecera. */
    readonly nombre?: string
    /** La cita de portada: tamaño, peso y color. */
    readonly cita?: {
      readonly size?: number
      readonly weight?: number
      readonly color?: string
      /**
       * Si la cita va **dentro de un panel** del diseño en vez de suelta sobre el fondo.
       *
       * «Mascarada» la enmarca —es texto claro sobre una fotografía morada— y por eso no
       * lleva ni la opacidad ni la sombra blanca de la marina, que son de un fondo claro.
       */
      readonly panel?: boolean
      /** La tipografía: la sans de la marina o el serif itálico de los tres diseños de gala. */
      readonly fuente?: string
      readonly cursiva?: boolean
      /** Si va en mayúsculas. «Noche Estrellada» y sus hermanas la escriben tal cual. */
      readonly mayusculas?: boolean
      /** El ancho y el relleno del panel, que no son los mismos en Mascarada y en las de gala. */
      readonly maxAncho?: string
      readonly relleno?: string
      readonly espaciado?: string
      readonly interlineado?: number
      readonly opacidad?: number
      /** La sombra del texto: blanca en la marina, negra en los diseños oscuros. */
      readonly sombra?: string
    }
    /** El rótulo de los anfitriones, que no todos pintan en caligrafía grande. */
    readonly anfitriones?: { readonly font?: string; readonly size?: number; readonly weight?: number; readonly color?: string }
    readonly anfitrionesNombres?: string
    /** La fecha grande, el separador y las casillas de la cuenta atrás. */
    readonly fecha?: string
    /** «HRS», «DÍAS», «Reservamos», «Lugar para ti». */
    readonly rotuloTenue?: string
    /** «Faltan». */
    readonly faltan?: string
    /** El titular de cada tarjeta: «Recepción Social», «Cronograma», «Solo Adultos»… */
    readonly tituloSeccion?: string
    readonly lugarNombre?: string
    readonly lugarDireccion?: string
    readonly lugarHora?: string
    readonly lugarHoraSize?: number
    readonly lugarHoraPeso?: number
    /** El titular de la tarjeta de recepción, que un diseño pinta dos puntos más grande. */
    readonly tituloRecepcionSize?: number
    /** El acento del plano: el punto, el nombre y las coordenadas. */
    readonly mapa?: string
    readonly itinerarioRotulo?: string
    readonly itinerarioRotuloSize?: number
    readonly itinerarioHora?: string
    readonly vestimentaNota?: string
    readonly vestimentaDetalle?: string
    readonly musicaAcento?: string
    readonly musicaPista?: string
    readonly musicaArtista?: string
    readonly regalosIntro?: string
    readonly sobresRotulo?: string
    readonly sobresNota?: string
    /** «Me encantaría contar contigo. Confírmame antes del…». */
    readonly plazo?: string
    readonly itinerarioHoraSize?: number
    /** El titular del formulario, que un diseño pinta un tono más apagado. */
    readonly tituloFormulario?: string
    /** La tinta sobre el botón de confirmar, cuando no es el papel del diseño. */
    readonly botonTinta?: string
    /** «Tu presencia hará este día más especial». */
    readonly invitadoTitulo?: string
    /**
     * La tinta del código de la mesa de regalos.
     *
     * En la maqueta es **casi negra** en los cuatro diseños que lo pintan —#1a1208 sobre el
     * oro, #2A1140 sobre el morado—, porque un código se lee por contraste: escrito con el
     * marfil del diseño se queda en un dibujo beige sobre blanco que ningún escáner leería.
     * Lo que no se declare cae en `violetaHondo`, que es lo que hace «Bajo el Mar».
     */
    readonly qrTinta?: string
    /**
     * El trazo del sobre de línea de la tarjeta de regalos.
     *
     * En «Bajo el Mar» y «Encanto Marino» es el acento del diseño; en «Mascarada» y
     * «Bosque Encantado» la maqueta lo dibuja con el **borde** de sus paneles, un tono más
     * apagado que su oro. Sin esto salían los cuatro con el acento.
     */
    readonly sobreAcento?: string
    /**
     * La sombra bajo el texto de la tarjeta de regalos.
     *
     * Los diseños de fondo oscuro la llevan negra en la maqueta —el texto va sobre una
     * fotografía—; los claros no llevan ninguna. Lo que no se declare va sin sombra.
     */
    readonly sombraTexto?: string
    /**
     * La sombra del nombre de la quinceañera, cuando no es la del resto del texto.
     *
     * «Encanto Musical» le pone además un resplandor blanco: es plata sobre una bola de
     * espejos, y con la sombra a secas el nombre se apagaba.
     */
    readonly sombraNombre?: string
    /**
     * El halo detrás del titular «XV / AÑOS / nombre».
     *
     * En «Bajo el Mar» es un óvalo blanco —el fondo es claro— y en «Encanto Marino» uno
     * **negro y desenfocado**, que es lo que despega el oro de la partitura. Los cuatro
     * diseños que escriben con sombra negra no lo llevan: `'none'` lo apaga.
     */
    readonly haloTitular?: string
    readonly haloTitularFiltro?: string
    /**
     * El velo oscuro difuminado que «Encanto Marino» pone detrás de la barra de arriba y de
     * la cita, para que el texto no se pierda entre las notas doradas del fondo.
     */
    readonly veloTexto?: string
    /**
     * Si la pieza de la cuenta atrás va **debajo** del «Faltan» en vez de encima.
     *
     * La marina y la partitura la ponen encima —el vestido, la clave de sol—; «Noche
     * Estrellada», «Gala Real» y «Encanto Musical» ponen su reloj debajo del rótulo.
     */
    readonly relojDebajo?: boolean
    /**
     * Los dos filetes que enmarcan la tarjeta de la fecha por arriba y por abajo.
     *
     * Los llevan «Bajo el Mar» y «Encanto Marino»; los demás enmarcan con su ornamento o no
     * enmarcan. Estaban sin portar: la tarjeta salía sin marco en los dos.
     */
    readonly fechaFiletes?: boolean
    /**
     * El disco sobre el que va cada icono del cronograma.
     *
     * En la marina y en la partitura es blanco al 85 %; en los demás es un vidrio del color
     * del diseño —morado en «Mascarada», oro al 10 % en las de gala, plata en la de disco—.
     * Con el blanco fijo, un icono dorado sobre negro salía dentro de una moneda blanca.
     */
    readonly discoItinerario?: string
    readonly discoBorde?: string
    /**
     * Qué separa el rótulo del cronograma de su hora: la línea de la marina, el ornamento
     * del diseño, o nada.
     */
    readonly itinerarioSeparador?: 'linea' | 'ornamento' | 'ninguno'
    /**
     * Si la tarjeta de la recepción va **centrada**, con la pieza arriba y la hora al pie.
     *
     * Es la composición de «Bosque Encantado»; las demás la ponen en fila, con el título a
     * la izquierda y la pieza a la derecha.
     */
    readonly recepcionCentrada?: boolean
    /**
     * Si la tarjeta de la fecha lleva el ornamento del diseño arriba y abajo.
     *
     * «Noche Estrellada», «Gala Real» y «Encanto Musical» la dejan desnuda en su maqueta.
     */
    readonly fechaOrnamento?: boolean
    /** La firma del cierre, cuando no va con la tinta fuerte del diseño. */
    readonly firma?: string
    /**
     * El aro de color alrededor del código, cuando el diseño lo enmarca en su acento en vez
     * de en el papel blanco: oro en «Encanto Marino», lila en «Bajo el Mar».
     */
    readonly qrAro?: string
  }
  readonly paleta: {
    readonly tinta: string
    readonly orquidea: string
    readonly uva: string
    /**
     * El morado más hondo con el que este diseño escribe la cita y el código de vestimenta.
     *
     * Opcional: solo «Bajo el Mar» lo distingue de `uva` en la maqueta, y los otros seis
     * caen en `uva` en vez de inventarles un tono que nadie eligió.
     */
    readonly uvaHonda?: string
    readonly amatista: string
    readonly violetaHondo: string
    readonly violeta: string
    readonly malva: string
    readonly bruma: string
    readonly lila: string
    readonly lilaFuerte: string
    readonly blanco: string
    /** El vidrio esmerilado del diseño, que es lo que las ranuras usan de fondo. */
    readonly vidrio: string
    readonly vidrioFuerte: string
    readonly bordeVidrio: string
    /**
     * La sombra de las tarjetas del diseño. Es la que lleva el itinerario, que en la
     * maqueta se pinta con el mismo panel que los demás bloques; `sombraFuerte` es para lo
     * que la maqueta sí levanta más.
     */
    readonly sombra: string
    readonly sombraFuerte: string
  }
  /** El cristal esmerilado sobre el que se apoya cada bloque. */
  readonly cristal: CSSProperties
  /**
   * La pieza que va entre la cita y el retrato: la corona marina, el saxo dorado.
   *
   * **Opcional**: «Mascarada» no pone ninguna en su maqueta —la máscara es del fondo y de
   * la portada—, y pintarla dejaba una máscara enorme colgando sobre el arco del retrato.
   */
  readonly corona?: string
  /**
   * La fotografía de la quinceañera, si el diseño trae una.
   *
   * **Opcional**: «Encanto Marino», «Noche Estrellada» y «Encanto Musical» no la tienen en
   * la maqueta, y ponerles ahí un fondo del diseño metía el castillo submarino dentro del
   * marco del retrato. Sin ella se pinta el marcador, que es lo que hace la maqueta hasta
   * que el atelier sube la suya.
   */
  readonly retrato?: string
  /**
   * La pieza que acompaña a la cuenta atrás: el vestido en uno, la clave de sol en el otro.
   *
   * **Opcional**: «Mascarada» no pone ninguna en su maqueta, y pintarla dejaba una segunda
   * máscara enorme encima del «Faltan».
   */
  readonly reloj?: string
  readonly castillo: string
  readonly vestimenta: string
  /**
   * El código de vestimenta **dibujado**, para el diseño que no trae imagen.
   *
   * «Noche Estrellada» lo pinta con dos siluetas de línea; la tiara guinda que se le puso
   * de sustituta era de «Gala Real» y desentonaba sobre su azul.
   */
  readonly vestimentaNodo?: ReactNode
  /** La imagen del cierre: la concha en uno, la guitarra en el otro. */
  readonly cierre: string
  /** El icono del cronograma para una clave del itinerario. */
  readonly icono: (clave: string | undefined) => string
  /**
   * El icono del cronograma **dibujado**, para los diseños que no traen imágenes.
   *
   * «Noche Estrellada» y «Bosque Encantado» lo pintan con trazos en su maqueta; sin esto,
   * la piel repetía la misma fotografía en las cuatro filas.
   */
  readonly iconoNodo?: (clave: string | undefined) => ReactNode
  /**
   * Cuánto mide cada icono del cronograma, por su clave.
   *
   * En la maqueta **no miden todos igual**: la invitación 48, la corona 55, la fiesta 50 y
   * la despedida 60, porque los dibujos tienen distinto aire alrededor y a un mismo tamaño
   * la corona se veía diminuta y el coche, gigante.
   */
  /**
   * El tamaño de cada pieza de arte, cuando este diseño no la pinta como «Bajo el Mar».
   *
   * En la maqueta cada uno tiene el suyo: el ramo de «Noche Estrellada» mide 260 y la
   * corona marina el 78 % del ancho; el castillo de «Gala Real» va a 90 y el marino a 48;
   * el traje de «Encanto Musical» a 200 y el de «Gala Real» a 90.
   */
  readonly arte?: {
    readonly coronaWidth?: number | string
    readonly coronaFiltro?: string
    readonly relojWidth?: number
    readonly castilloWidth?: number
    readonly castilloFiltro?: string
    readonly vestimentaWidth?: number | string
    readonly cierreWidth?: number | string
    /** El degradado del marco del retrato, cuando el diseño no lo pinta en rosa. */
    readonly marcoRetrato?: string
    /** El desenfoque del marco, que solo lleva el arco rosa de la marina. */
    readonly marcoRetratoFiltro?: string
  }
  readonly iconoTam?: (clave: string | undefined) => number
  /** El filtro que la maqueta aplica a algún icono para teñirlo del morado del diseño. */
  readonly iconoFiltro?: (clave: string | undefined) => string | undefined
  /**
   * Si los iconos del cronograma son fotografías redondas en vez de siluetas recortadas.
   * Las de gala y las de disco lo son, y hay que recortarlas en círculo o salen cuadradas
   * dentro del disco.
   */
  readonly iconoRedondo?: boolean
  /** El filete ornamental que algunos diseños ponen encima y debajo de la fecha. */
  readonly ornamento?: ReactNode
  /**
   * Lo que separa el aviso de los sobres del código, dentro de la tarjeta de regalos.
   *
   * No es el mismo en los cuatro: «Bajo el Mar» y «Encanto Marino» ponen el filete
   * degradado, «Mascarada» su filete ornamental y «Bosque Encantado» la lámina del borde.
   * Quien no lo declare se queda con el filete degradado, que es lo que hace la marina.
   */
  readonly separadorRegalos?: ReactNode
  /**
   * Lo que el diseño pinta **a sangre, antes de la barra de arriba**: el retrato de la
   * quinceañera en Bosque Encantado y en Gala Real, la bola de espejos en Encanto Musical.
   *
   * No todos lo llevan —Bajo el Mar abre con el título— y por eso es opcional: quien no lo
   * declare empieza por la barra, como hasta ahora.
   */
  readonly apertura?: ReactNode
  /**
   * Cómo llama **este** diseño a sus secciones.
   *
   * No son traducciones —para eso está el diccionario—, son la voz del diseño: cuatro de
   * los ocho XV dicen «Cronograma» y «Detalles que Abrazan» donde los otros dicen
   * «Itinerario» y «Mesa de regalos». Lo que no se declare cae al diccionario, que es lo
   * correcto para un diseño que no tenga voz propia.
   */
  readonly rotulos?: {
    readonly itinerary?: string
    readonly gifts?: string
    readonly guestbook?: string
    readonly dressCode?: string
  }
}
