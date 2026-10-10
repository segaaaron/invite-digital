export interface NavDictionary {
  /** Las dos fiestas son las entradas principales: cada una lleva a su propia página. */
  weddings: string
  quinceaneras: string
  collections: string
  pricing: string
  contact: string
  /** El botón que abre y cierra el menú en el teléfono. */
  menu: string
  closeMenu: string
}

/** Una fiesta en la web: su página propia y su tarjeta en la portada. */
export interface FiestaPageDictionary {
  eyebrow: string
  title: string
  lede: string
  modelsTitle: string
  modelsSubtitle: string
  cta: string
  /** La tarjeta de la portada que lleva a esta página. */
  cardTitle: string
  cardBody: string
  seoTitle: string
  seoDescription: string
  /** El bloque para las planners profesionales: entran gratis cuando el anfitrión las suma. */
  plannerEyebrow: string
  plannerTitle: string
  plannerBody: string
}

export interface FiestasDictionary {
  chooserEyebrow: string
  chooserTitle: string
  chooserCta: string
  boda: FiestaPageDictionary
  xv: FiestaPageDictionary
  /** Lo que la plataforma ya hace, igual para las dos fiestas. Nada que no exista. */
  toolsEyebrow: string
  toolsTitle: string
  /** «¿Qué plan trae cada herramienta? Compáralos» (portada, lleva a la tabla). */
  toolsPlanes: string
  tools: { title: string; body: string }[]
}

export interface HeroDictionary {
  eyebrow: string
  /** El cuerpo cuando la diseñamos nosotros (algún plan por encargo). */
  bodyEncargo: string
  /** El rótulo de la tarjeta de muestra que sustituye al sobre de la portada. */
  envelopeLabel: string
  titleLine1: string
  titleLine2: string
  titleAccent: string
  body: string
  ctaPrimary: string
  ctaSecondary: string
  trustLabel: string
  posterAlt: string
}

export interface ExperienceAct {
  label: string
  title: string
  body: string
  /** Texto alternativo de la fotografía del acto. La imagen sale de la maqueta. */
  imageAlt: string
}

/** «Quiénes somos» (9 oct): quién es la marca, sin lugar ni fotos (vende a toda América). */
export interface AboutDictionary {
  eyebrow: string
  title: string
  paragraphs: readonly string[]
  pillars: readonly { title: string; body: string }[]
  signature: string
}

export interface ExperienceDictionary {
  eyebrow: string
  title: string
  acts: readonly [ExperienceAct, ExperienceAct, ExperienceAct]
}

export interface MobileShot {
  tag: string
  caption: string
  alt: string
}

export interface MobileDictionary {
  eyebrow: string
  title: string
  body: string
  bullets: readonly [string, string, string]
  /** Las fotografías con su pie: una o dos, según cuántas haya del catálogo que se vende. */
  shots: readonly MobileShot[]
}

export interface CollectionScene {
  tag: string
  name: string
  alt: string
}

export interface CollectionsDictionary {
  eyebrow: string
  title: string
  hint: string
  previous: string
  next: string
  backToHome: string
  /** El botón que trae la siguiente tanda de ocho modelos. */
  loadMore: string
  errorMessage: string
  /** «Ir a la escena {n}: {nombre}», el nombre accesible de cada punto del carrusel. */
  goToScene: string
  /** Las nueve escenas de la maqueta, en su orden. */
  scenes: readonly CollectionScene[]
}

export interface ComparisonDictionary {
  eyebrow: string
  title: string
  hint: string
  /** Nombre accesible del control que descubre un lado u otro. */
  sliderLabel: string
  imageAlt: string
  traditionalLabel: string
  /** El botón y el pie del teléfono de muestra del lado de Luxury Atelier. */
  phoneCta: string
  phoneCaption: string
  luxe: readonly [string, string, string, string, string]
  traditional: readonly [string, string, string, string, string]
}

export interface FaqItem {
  question: string
  answer: string
}

export interface FaqDictionary {
  eyebrow: string
  title: string
  items: readonly [FaqItem, FaqItem, FaqItem, FaqItem, FaqItem]
  /** Las del diseño por encargo: van primero si algún plan es por encargo (y sustituyen a la de la entrega). */
  encargoItems: readonly FaqItem[]
}

/** «Cómo funciona» del diseño por encargo: reservas, la diseñamos, pagas el saldo y la compartes. */
export interface HowItWorksDictionary {
  eyebrow: string
  title: string
  steps: readonly [FaqStep, FaqStep, FaqStep]
}
export interface FaqStep {
  title: string
  body: string
}

export interface TestimonialsDictionary {
  eyebrow: string
  title: string
}

export interface PricingDictionary {
  eyebrow: string
  title: string
  mostChosen: string
  /** «Elegir Atelier →». El nombre del plan entra donde dice {plan}. */
  choose: string
  /** «Reserva con {monto} · el resto cuando tu invitación esté lista». */
  reserve: string
  /** El precio en dólares que fija el admin: «USD {monto}». */
  usd: string
  /** «/ evento», junto al precio. */
  perEvent: string
  /** «Todo lo de {plan}, más:», sobre las funciones de Gala e Imperial. */
  inherits: string
  /** El selector de moneda: «Bolivianos», «Dólares» y la nota del cambio. */
  currency: { bob: string; usd: string; label: string; note: string }
  /** La caja de la reserva (V4): titular con {monto}, el texto, los tres pasos y el botón. */
  reserveBox: { title: string; body: string; steps: readonly [string, string, string]; cta: string }
  /** «Nivel de personalización»: una escalera de tres peldaños, con el antes/después de Gala. */
  ladder: {
    title: string
    titleAccent: string
    sub: string
    rungs: readonly [{ title: string; body: string }, { title: string; body: string }, { title: string; body: string }]
    before: string
    after: string
    beforeAlt: string
    afterAlt: string
    example: string
  }
  /** La tabla que compara los planes. Sus filas salen de los límites de la base. */
  comparison: PlanComparisonDictionary
}

export interface PlanComparisonDictionary {
  title: string
  /** Diseño por encargo: «Rondas de corrección», «Entrega», «{n} días», «Tú la escribes». */
  rondas: string
  entrega: string
  entregaDias: string
  autoservicio: string
  /** Los extras sueltos a la venta, debajo de la tabla. */
  extrasTitle: string
  /** Qué hace cada adicional, por su efecto (9 oct: «Sumar a tu planner» o «Día D» no se entendían). */
  extrasDescripcion: Record<'cambio_modelo' | 'fotos_invitados' | 'mas_grupos' | 'mas_dias' | 'mas_porteros' | 'sumar_planner' | 'dia_d' | 'asistente' | 'servicio' | 'mas_rondas', string>
  /** Cabecera de la primera columna. */
  feature: string
  si: string
  no: string
  sinLimite: string
  /** «Hasta {n}». */
  hasta: string
  /** «{n} días». */
  dias: string
  /** «{n} meses». */
  meses: string
  /** «Cada plan incluye todo lo del plan anterior.» */
  sub: string
  /** La nota de las rondas bajo la tabla y el recuadro del álbum compartido. */
  nota: string
  albumTitle: string
  albumBody: string
  /** Las filas del documento de cambios, en su orden. */
  filas: {
    basicos: string
    grupos: string
    confirmacion: string
    lista: string
    pases: string
    calendario: string
    textos: string
    fotos: string
    formas: string
    libro: string
    colores: string
    tipografias: string
    secciones: string
    panel: string
    mesaQr: string
    album: string
    detalles: string
    luxury: string
    /** Lo del panel, plan por plan (9 oct: «la tabla no dice qué plan lo incluye»). */
    tareas: string
    mesas: string
    regalos: string
    puerta: string
    porteros: string
    plannerCompleto: string
    plannerTotal: string
    enLinea: string
  }
  modelo: { ninguno: string; antes_de_repartir: string; siempre: string }
}

export interface ModelsDictionary {
  eyebrow: string
  title: string
  subtitle: string
  qr: string
  open: string
}

export interface ContactFieldsDictionary {
  name: string
  lastName: string
  email: string
  phone: string
  category: string
  categoryAny: string
  date: string
  message: string
  optional: string
}

/** One message per `LeadErrorKind` the Server Action can return, plus the rate limit. */
export interface ContactErrorsDictionary {
  invalid_name: string
  missing_contact: string
  invalid_email: string
  past_event_date: string
  invalid_event_date: string
  invalid_payload: string
  storage_failure: string
  too_many_requests: string
}

export interface ContactDictionary {
  eyebrow: string
  title: string
  /** La palabra que va en cursiva dorada al final del título. */
  titleAccent: string
  body: string
  submit: string
  successTitle: string
  successBody: string
  again: string
  sending: string
  whatsappLabel: string
  /** Texto alternativo de la fotografía del taller que la maqueta pone junto al formulario. */
  atelierAlt: string
  whatsappMessage: string
  emailLabel: string
  fields: ContactFieldsDictionary
  errors: ContactErrorsDictionary
}

/** Search-result copy: it never appears on the page, only in <title> and <meta>. */
export interface SeoDictionary {
  homeTitle: string
  homeDescription: string
  collectionsTitle: string
  collectionsDescription: string
  breadcrumbHome: string
  /** La página de un modelo: `{nombre}` y `{fiesta}` («boda», «XV años»). */
  modelTitle: string
  modelDescription: string
  fiestaDeModelo: Record<'boda' | 'xv' | 'cumple', string>
}

export interface FooterDictionary {
  rights: string
  privacy: string
  terms: string
  /** El rótulo accesible de los iconos de redes: «Luxury Atelier en Instagram». */
  onNetwork: string
  /** «Desarrollado por»: el crédito al estudio que hizo la web. */
  builtBy: string
  /** El rótulo accesible del botón flotante de WhatsApp. */
  whatsappFloat: string
}

/** Las páginas legales y el aviso bajo los formularios que piden datos. */
export interface LegalDictionary {
  privacyTitle: string
  termsTitle: string
  /** «Al enviar, tratamos tus datos según nuestra» + enlace. */
  notice: string
  noticeLink: string
}

export type RsvpMessageKey =
  | 'invitation_not_found'
  | 'invitation_revoked'
  | 'rsvp_closed'
  | 'already_answered'
  | 'too_many_seats'
  | 'invalid_payload'
  | 'storage_failure'
  | 'rate_limited'

/**
 * Los rótulos fijos de los dieciséis diseños de invitación.
 *
 * Van aparte de `InvitationDictionary` porque no son del formulario de RSVP: son las
 * palabras que el propio diseño pinta —«Faltan», «Itinerario», «Código de vestimenta»— y
 * las comparten los dieciséis. Lo que cambia de un evento a otro vive en `event_content`;
 * esto es la carpintería.
 *
 * La invitación usa el idioma del **evento** (`events.locale`), no el del navegador.
 */
export interface ThemeDictionary {
  /** La portada, antes de abrir. */
  coverOpen: string
  coverHint: string
  /** El nombre accesible del botón de portada: quien usa lector de pantalla no ve el sobre. */
  coverAria: string
  /**
   * Las dos líneas del convite de las portadas de XV. Van partidas porque el diseño las
   * pinta en dos renglones con distinto interletrado, no porque quepan mal.
   */
  coverInviteLine1: string
  coverInviteLine2: string
  /** Las flechas del carrusel de fotografías de las Editorial. */
  galleryPrev: string
  galleryNext: string
  /** «Desliza ↓»: la llamada de las portadas que se recorren hacia abajo. */
  coverScroll: string
  /** «LLEGÓ EL GRAN DÍA» y «NOS CASAMOS»: las dos líneas de la portada de una boda. */
  coverBigDay: string
  coverWeMarry: string
  /** «INGRESA A MI INVITACIÓN»: la llamada de las portadas con fotografía de los XV. */
  coverEnter: string
  /** La misma llamada en boda, donde la invitación es de dos: «nuestra», no «mi». */
  coverEnterShared: string
  /**
   * «TOCA PARA ABRIR»: la llamada del cumpleaños, en la placa de su portada. La placa se
   * pinta **encima** del «te espero.» que el arte trae escrito, para no dejar dos frases
   * encimadas en el mismo sitio.
   */
  coverTap: string
  countdownPrefix: string
  countdownDays: string
  countdownHours: string
  countdownMins: string
  countdownSecs: string
  saveTheDate: string
  ourStory: string
  ceremony: string
  reception: string
  itinerary: string
  dressCode: string
  /**
   * El rótulo del reproductor. La maqueta lo escribe en inglés en los dieciséis, pero es
   * texto que el invitado lee, así que va **en el idioma del evento**: «LA CANCIÓN DE LA
   * NOCHE» en español y «SONG OF THE NIGHT» en inglés.
   */
  songOfTheNight: string
  /** «MI VALS»: el rótulo del reproductor de los XV (V4). */
  myWaltz: string
  /** Las pestañas de regalos de los XV (V4): «Transferencia QR» y su pie. */
  transferQr: string
  scanFromBank: string
  /** «Déjale un mensaje», el titular del libro de firmas de los XV (V4). */
  leaveHerMessage: string
  /** Tras confirmar (V4): «¿Quieres dejarle un mensaje a {nombre}?» y el botón que lleva al libro. */
  leaveMessageTo: string
  goToBook: string
  /** El álbum compartido de los XV (V4): rótulo, titular, cómo se usa y la etiqueta del plan. */
  albumKicker: string
  albumTitle: string
  albumHint: string
  albumBadge: string
  gifts: string
  guestbook: string
  /** Lo que dice un hueco de foto todavía sin imagen. */
  photoPlaceholder: string
  portraitPlaceholder: string
  /** El aviso de la vista previa del catálogo, donde nada se guarda. */
  previewNotice: string
  /** La cruz de salir de la vista previa: no hay cabecera que la enmarque. */
  previewClose: string
  /** «HORAS» entera: algunos diseños no abrevian la casilla de la cuenta atrás. */
  countdownHoursLong: string
  /** «MINUTOS» y «SEGUNDOS» enteros, para los diseños que no abrevian la cuenta atrás. */
  countdownMinsLong: string
  countdownSecsLong: string
  /** Los tres rótulos de los anfitriones, en el orden en que el diseño los pinta. */
  brideParents: string
  groomParents: string
  godparents: string
  /** El botón que lleva al mapa del lugar. */
  viewLocation: string
  /** El rótulo del bloque del lugar: «LUGAR». */
  venue: string
  /** «mi historia»: la de unos XV es de una sola persona, no de una pareja. */
  myStory: string
  /** «Hemos reservado para ti», encima del número de pases. */
  reservedForYou: string
  /** «Pases», debajo del número. */
  passes: string
  /** «Reservamos», encima del número, en los XV. */
  weSaved: string
  /** «Lugar para ti», debajo del número, en los XV. */
  seatForYou: string
  /** «Lugares para ti», con más de un lugar: «Reservamos 2 Lugar para ti» no concuerda. */
  seatsForYou: string
  /** «Tu presencia hará este día más especial», la línea que abre el saludo. */
  yourPresence: string
  /** «Escanea aquí», sobre el código del fondo de regalos. */
  scanHere: string
  /**
   * La línea que va bajo «Confirma tu asistencia», con la fecha límite dentro.
   *
   * `{fecha}` se sustituye con el plazo del evento ya formateado en su idioma. Va con
   * marcador y no partida en dos porque en inglés la fecha no cae en el mismo sitio.
   */
  rsvpDeadlineLine: string
  /** «antes del», que precede a la fecha límite en los diseños de boda. */
  rsvpBefore: string
  /** «Mis XV Años»: el rótulo del cierre de los quince. */
  myFifteen: string
  /** «AÑOS», bajo el «XV» de los quince. */
  years: string
  /** «HRS», tras una hora. */
  hoursShort: string
  /** Los títulos con voz propia de los XV: «Itinerario», «Cronograma», «Detalles que Abrazan». */
  itineraryTitle: string
  scheduleTitle: string
  giftsEmbrace: string
  /** «Mis Quince Años», el titular de «Encanto Musical». */
  myFifteenYears: string
  /** El nombre accesible de la paleta del código de vestimenta. */
  suggestedColors: string
  /** El botón del escaparate que lleva a pedir ese modelo. */
  chooseDesign: string
  /** La línea de la imagen para compartir cuando la invitación no tiene fecha. */
  shareImageTap: string
  designs: DesignDictionary
}

/**
 * Lo que cada diseño escribe con su propia voz —«NUESTRA BODA», «Detalles que Abrazan»,
 * «TU LUGAR ESTÁ GUARDADO»—, por la clave de su vista. `{n}` se sustituye con el número.
 */
export interface DesignDictionary {
  'cumple-beer': Record<'celebracion' | 'saludo' | 'confirma' | 'graciasVieneRotulo' | 'graciasViene' | 'graciasVieneTexto' | 'graciasNoRotulo' | 'graciasNo' | 'graciasNoTexto' | 'graciasVieneCierre' | 'graciasDondeRotulo' | 'graciasDondeAyuda' | 'graciasComoLlegar' | 'graciasNoCierre' | 'guestbook', string>
  'cumple-femme': Record<'entrar' | 'esHoy' | 'fecha' | 'hora' | 'lugar' | 'vestimenta' | 'nosVemos' | 'verMaps' | 'vienes' | 'graciasVieneRotulo' | 'graciasViene' | 'graciasVieneTexto' | 'graciasNoRotulo' | 'graciasNo' | 'graciasNoTexto' | 'guestbook', string>
  'boda': Record<'guestbook', string>
  'boda-bot': Record<'guestbook' | 'giftsTitle' | 'giftsNote', string>
  'aniv': Record<'cover' | 'coverEyebrow' | 'coverHeadline' | 'gifts' | 'guestbook', string>
  'boda-glamour': Record<'nuestraBoda' | 'faltan' | 'reservado' | 'pases' | 'padresNovia' | 'padresNovio' | 'padrinos' | 'verUbicacion' | 'itinerario' | 'historia' | 'soloAdultos' | 'confirma' | 'firmas' | 'regalos', string>
  'eng': Record<'apertura', string>
  'dest': Record<'itinerary' | 'apertura' | 'coverEyebrow' | 'coverHeadline' | 'saveTheFlight', string>
  'boda-boho': Record<'nuestraBoda' | 'faltan' | 'invitacion' | 'reservado' | 'pases' | 'padresNovia' | 'padresNovio' | 'padrinos' | 'verUbicacion' | 'itinerario' | 'nosotros' | 'vestimenta' | 'vestimentaCursiva' | 'regalos' | 'confirma' | 'confirmaCursiva' | 'firmas', string>
  'civil': Record<'gifts' | 'seal' | 'cover', string>
  'boda-navy': Record<'nuestraBoda' | 'invitacion' | 'reservado' | 'pases' | 'padresNovia' | 'padresNovio' | 'padrinos' | 'verUbicacion' | 'itinerario' | 'nosotros' | 'vestimenta' | 'vestimentaCursiva' | 'regalos' | 'confirma' | 'confirmaCursiva' | 'firmas', string>
  'boda-royal': Record<'nuestraBoda' | 'faltan' | 'invitacion' | 'reservado' | 'pases' | 'padresNovia' | 'padresNovio' | 'padrinos' | 'verUbicacion' | 'itinerario' | 'nosotros' | 'vestimenta' | 'vestimentaCursiva' | 'regalos' | 'confirma' | 'confirmaCursiva' | 'fotos' | 'firmas', string>
  'boda-serenidad': Record<'nuestraBoda' | 'faltan' | 'reservado' | 'pases' | 'padresNovia' | 'padresNovio' | 'padrinos' | 'verUbicacion' | 'itinerario' | 'nosotros' | 'vestimenta' | 'vestimentaCursiva' | 'regalos' | 'confirma' | 'confirmaCursiva' | 'fotos' | 'firmas', string>
  'esencia': Record<'pie' | 'mensaje' | 'ceremonia' | 'recepcion' | 'itinerario' | 'faltan' | 'vestimenta' | 'galeria' | 'regalos' | 'verUbicacion' | 'confirmaAntes' | 'firmas' | 'nosCasamos' | 'tocaParaAbrir' | 'paralaje' | 'padres' | 'calendario' | 'regalosTexto' | 'paseUno' | 'paseVarios', string>
  'boda-sello': Record<'faltan' | 'historia' | 'invitacion' | 'reservado' | 'pases' | 'padresNovia' | 'padresNovio' | 'padrinos' | 'verUbicacion' | 'itinerario' | 'vestimenta' | 'regalos' | 'confirma' | 'mensaje' | 'fotos', string>
  'boda-perla': Record<'nuestraBoda' | 'faltan' | 'invitacion' | 'reservado' | 'pases' | 'padresNovia' | 'padresNovio' | 'padrinos' | 'verUbicacion' | 'itinerario' | 'nosotros' | 'vestimenta' | 'vestimentaCursiva' | 'regalos' | 'confirma' | 'confirmaCursiva' | 'firmas', string>
  'xv-papillon': Record<'xvAnos' | 'padrinos' | 'misXv' | 'itinerario' | 'confirmar', string>
}

/** La página del «save the date» (`/guarda/<enlace>`). */
export interface SaveTheDateDictionary {
  eyebrow: string
  /** «Faltan {n} días». */
  faltan: string
  faltaUno: string
  hoy: string
  soon: string
  addCalendar: string
  /** La descripción de la vista previa en WhatsApp: «{fecha}. La invitación formal llega pronto.» */
  shareDescription: string
}

/** La página del enlace general (`/abierta/<enlace>`): nombre y acompañantes → su invitación. */
export interface OpenLinkDictionary {
  heading: string
  intro: string
  name: string
  companions: string
  companionsHint: string
  submit: string
  sending: string
  errors: Record<'cerrado' | 'lleno' | 'nombre' | 'acompanantes' | 'limite' | 'fallo', string>
}

export interface InvitationDictionary {
  /** El límite de error de la invitación: no se pudo abrir. */
  error: { title: string; body: string; cta: string }
  title: string
  /** El título del bloque cuando ya respondió que viene, y cuando dijo que no. */
  titleConfirmed: string
  titleDeclined: string
  /** La confirmación nombre por nombre de un grupo. */
  whoIsComing: string
  /** El atajo de la pareja, y su salida cuando solo va uno. */
  bothComing: string
  onlyOneComing: string
  /** «Acompañantes sin nombre ({n} cupos libres)». */
  extraGuests: string
  addOne: string
  removeOne: string
  nobodyComing: string
  answerOnce: string
  backToInvitation: string
  /** El botón de la invitación que lleva a esa pantalla. */
  confirmAttendance: string
  /** Lo que ve quien vuelve a abrir su enlace: se contesta una sola vez. */
  confirmedHeading: string
  /** «Invitación para», sobre el nombre del invitado en el RSVP. */
  invitationFor: string
  /** «{n} lugares reservados»; `seatsReservedOne` con uno. */
  seatsReserved: string
  seatsReservedOne: string
  /** «Vienen {n} de {total}». */
  confirmedCount: string
  confirmedNobody: string
  confirmedLocked: string
  seatsLabel: string
  /** «Nombre completo»: el enlace sabe el grupo, no quién de la familia contesta. */
  nameLabel: string
  namePlaceholder: string
  /** «¿Asistirás?», con sus dos respuestas. */
  goingLabel: string
  goingYes: string
  goingNo: string
  /** Los dos botones del RSVP de los diseños de boda: «ASISTIRÉ» y «NO PUEDO». */
  goingYesShort: string
  goingNoShort: string
  /** Los botones de «Femme Fatale» (`rsvp: 'fiesta'`). */
  goingYesParty: string
  goingNoParty: string
  submitParty: string
  /** «INVITADOS», sobre el contador de ese mismo formulario. */
  guestsLabel: string
  /** «ENVIAR RESPUESTA →», su botón de envío. */
  submitLong: string
  attendingLabel: string
  messageLabel: string
  messagePlaceholder: string
  /** «Deja unas palabras…», el marcador del formulario de las bodas. */
  guestbookPlaceholder: string
  /** «FIRMAR LIBRO», el botón de esa sección. */
  signBook: string
  /** El libro antes de confirmar: firmarlo guardaría una respuesta, y sin una no sabe cuántos vienen. */
  signAfterRsvp: string
  /** «Hecho por {marca}», el pie de cada invitación. */
  madeBy: string
  /** «FIRMAR EL LIBRO», el botón del libro de firmas de los XV (V4). */
  signTheBook: string
  submit: string
  sending: string
  /**
   * «¡Gracias, {nombre}!». Lleva marcador porque el diseño lo saluda por su nombre; sin
   * nombre escrito, la pantalla usa el genérico de `successTitleAnon`.
   */
  successTitle: string
  successTitleAnon: string
  successBody: string
  closed: string
  passTitle: string
  passHint: string
  /** «Código», sobre el código corto que la puerta escribe a mano si el QR no se lee. */
  passCode: string
  passAlt: string
  passOpen: string
  /** «Agregar a mi calendario» (el `.ics`) y su variante para Google Calendar, junto al pase. */
  calendarAdd: string
  calendarGoogle: string
  /** Antes de confirmar: el pase llega al decir que asiste. */
  passPending: string
  /** Al confirmar que asiste, dentro del formulario: el pase ya está, más abajo. */
  passReady: string
  /** Confirmó que no asiste: no hay pase. */
  passDeclined: string
  passBack: string
  passSaveHint: string
  passNoTable: string
  /** La pantalla donde el invitado sube sus fotografías de la boda. */
  photosTitle: string
  photosIntro: string
  photosPick: string
  photosSending: string
  photosMine: string
  photosEmpty: string
  photosBack: string
  photosLeft: string
  /** Lo que puede salir mal al subir, ya en la voz del invitado. */
  photoErrors: Record<GuestPhotoMessageKey, string>
  errors: Record<RsvpMessageKey, string>
  /** Las preguntas extra al confirmar (canción, menú, actos), si el anfitrión las eligió. */
  songLabel: string
  songPlaceholder: string
  menuLabel: string
  menuChoose: string
  actsLabel: string
}

/** Lo que puede salir mal cuando un invitado sube una fotografía. */
export type GuestPhotoMessageKey =
  | 'too_large'
  | 'unsupported_type'
  | 'storage_failure'
  | 'too_many'
  | 'no_file'
  | 'not_found'
  | 'not_included'
  | 'rate_limited'

/** Lo que la reserva de un regalo puede responderle al invitado. */
export type RegistryMessageKey =
  | 'already_claimed'
  | 'not_yours'
  | 'already_purchased'
  | 'not_found'
  | 'wrong_event'
  | 'storage_failure'
  | 'rate_limited'
  /** El plan del evento dejó de incluir la mesa de regalos: la lista está congelada. */
  | 'feature_not_included'

/**
 * La mesa de regalos que ve el invitado. Va aparte de `InvitationDictionary` porque es
 * un bloque completo con vida propia, no cuatro etiquetas sueltas del formulario de RSVP.
 */
export interface RegistryDictionary {
  title: string
  intro: string
  empty: string
  /**
   * El aviso de mesa congelada. Cuando el plan del evento deja de incluir la mesa de
   * regalos, la lista se sigue viendo pero no admite nada nuevo, y esto lo explica.
   */
  closed: string
  reserve: string
  reserving: string
  release: string
  releasing: string
  reservedByYou: string
  reservedByOther: string
  purchased: string
  viewInStore: string
  fundsTitle: string
  fundRaised: string
  fundGoal: string
  fundExceeded: string
  /** Las formas de regalar (`0072`): la lluvia de sobres y la transferencia con su QR. */
  sobresTitle: string
  /** La frase de los sobres cuando el cliente no escribió la suya. */
  sobresDefault: string
  transferTitle: string
  transferIntro: string
  bank: string
  holder: string
  account: string
  copy: string
  copied: string
  qrAlt: string
  qrHint: string
  downloadQr: string
  errors: Record<RegistryMessageKey, string>
}

/**
 * Lo único que el invitado ve del libro de firmas: la respuesta de los anfitriones a su
 * mensaje. Va por diccionario porque esa página habla el idioma del **evento**, no el
 * del navegador ni el del panel.
 */
export interface GuestbookDictionary {
  replyTitle: string
}

/**
 * El Plan B: pedir un plan y pagar por transferencia.
 *
 * Va por diccionario como el resto de la web pública. El **panel** de pedidos no: es
 * solo español, como todo el panel.
 */
export interface OrdersDictionary {
  orderTitle: string
  orderIntro: string
  trackTitle: string
  trackNotFound: string
  refLabel: string
  payHeading: string
  payIntro: string
  /** Cuando aún no hay datos de cobro cargados: se dice la verdad y se remite a WhatsApp. */
  payPending: string
  bank: string
  accountHolder: string
  accountNumber: string
  qrAlt: string
  proofHeading: string
  statusHeading: string
  /** «Qué sigue» (9 oct): los tres pasos tras pedir. `{horario}` sale de «La web». */
  nextHeading: string
  nextSteps: readonly [string, string, string]
  nextHours: string
  status: Record<'pending_payment' | 'proof_submitted' | 'approved' | 'rejected' | 'cancelled', string>
  /** El monto exacto que toca transferir ahora, encima de los datos de cobro. */
  amountDue: string
  /** Debajo del monto, cuando es el anticipo: el resto se paga después. */
  amountDueDeposit: string
  /** El título de la sección de pago cuando lo que queda es el saldo. */
  balanceHeading: string
  decisionNote: string
  proofsHeading: string
  keepRef: string
  /** El formulario del pedido y la subida del comprobante: sus rótulos, avisos y errores. */
  form: OrderFormDictionary
}

/** Los errores del pedido público, por su código: la acción devuelve la clave, no la frase. */
export type OrderErrorCode =
  | 'rateLimited'
  | 'failed'
  | 'name'
  | 'contact'
  | 'email'
  | 'eventDate'
  | 'plan'
  | 'notes'
  | 'referral'
  | 'terms'
  | 'invalid'
  | 'proofRateLimited'
  | 'proofMissing'
  | 'proofEmpty'
  | 'proofTooBig'
  | 'proofType'
  | 'proofRejected'
  | 'proofApproved'
  | 'proofFailed'

export interface OrderFormDictionary {
  plan: string
  design: string
  name: string
  contact: string
  /** El correo, aparte del WhatsApp: ahí le llega su acceso al panel. */
  email: string
  eventDate: string
  notes: string
  /** El código de quien le recomendó, opcional: con él, el descuento de recomendación. */
  referral: string
  submit: string
  submitting: string
  successTitle: string
  /** «Tu referencia es {ref}. Guárdala: …» — `{ref}` se pinta en negrita. */
  successText: string
  goPay: string
  /** «Seguir por WhatsApp», tras registrar el pedido. */
  followWhatsapp: string
  /** El mensaje que se abre en WhatsApp: `{ref}` y `{plan}`. */
  whatsappMessage: string
  proofLabel: string
  /** «Una foto o un PDF, hasta {mb} MB». */
  proofHint: string
  proofReceived: string
  proofSubmit: string
  proofSubmitting: string
  /** El pedido completo (9 oct): tipo de evento, modelo, adicionales, resumen de pago y términos. */
  eventType: string
  eventTypes: { boda: string; xv: string }
  model: string
  modelLater: string
  extrasTitle: string
  summaryTitle: string
  summaryExtras: string
  summaryTotal: string
  summaryToday: string
  summaryBalance: string
  summaryReferral: string
  /** «Acepto los {terminos}»: `{terminos}` es el enlace. */
  terms: string
  termsLink: string
  nonRefundable: string
  errors: Record<OrderErrorCode, string>
}

/** La opinión del cliente después de su evento (`/opinion/<enlace>`). */
export interface OpinionDictionary {
  kicker: string
  /** «¿Cómo te fue en {evento}?» */
  title: string
  intro: string
  rating: string
  /** Los cinco rótulos de las estrellas, de 1 a 5. */
  stars: readonly [string, string, string, string, string]
  comment: string
  commentPlaceholder: string
  allowPublish: string
  submit: string
  submitting: string
  thanksTitle: string
  thanksText: string
  answeredTitle: string
  answeredText: string
  errorRating: string
  errorFailed: string
  errorRateLimited: string
}

/** El 404 de la web pública: una dirección que no existe. */
export interface NotFoundDictionary {
  kicker: string
  title: string
  text: string
  home: string
  collections: string
}

export interface Dictionary {
  notFound: NotFoundDictionary
  opinion: OpinionDictionary
  nav: NavDictionary
  fiestas: FiestasDictionary
  hero: HeroDictionary
  experience: ExperienceDictionary
  about: AboutDictionary
  mobile: MobileDictionary
  collections: CollectionsDictionary
  comparison: ComparisonDictionary
  pricing: PricingDictionary
  models: ModelsDictionary
  invitation: InvitationDictionary
  themes: ThemeDictionary
  registry: RegistryDictionary
  guestbook: GuestbookDictionary
  orders: OrdersDictionary
  testimonials: TestimonialsDictionary
  faq: FaqDictionary
  howItWorks: HowItWorksDictionary
  openLink: OpenLinkDictionary
  saveTheDate: SaveTheDateDictionary
  contact: ContactDictionary
  seo: SeoDictionary
  footer: FooterDictionary
  legal: LegalDictionary
}
