export interface NavDictionary {
  /** Las dos fiestas son las entradas principales: cada una lleva a su propia página. */
  weddings: string
  quinceaneras: string
  collections: string
  pricing: string
  contact: string
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
  tools: { title: string; body: string }[]
}

export interface HeroDictionary {
  eyebrow: string
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
  /** El plan más caro no se elige de un clic: se agenda una llamada. */
  bookCall: string
  /** La tabla que compara los planes. Sus filas salen de los límites de la base. */
  comparison: PlanComparisonDictionary
}

export interface PlanComparisonDictionary {
  title: string
  /** Los extras sueltos a la venta, debajo de la tabla. */
  extrasTitle: string
  /** Cabecera de la primera columna. */
  feature: string
  si: string
  no: string
  sinLimite: string
  /** «Hasta {n}». */
  hasta: string
  /** «{n} días». */
  dias: string
  filas: {
    grupos: string
    fotos: string
    fotosInvitados: string
    contrasena: string
    csv: string
    mesas: string
    regalos: string
    puerta: string
    porteros: string
    planners: string
    tareas: string
    plannerCompleto: string
    plannerTotal: string
    enLinea: string
    modelo: string
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
}

export interface InvitationDictionary {
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
  status: Record<'pending_payment' | 'proof_submitted' | 'approved' | 'rejected', string>
  decisionNote: string
  proofsHeading: string
  keepRef: string
}

export interface Dictionary {
  nav: NavDictionary
  fiestas: FiestasDictionary
  hero: HeroDictionary
  experience: ExperienceDictionary
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
  contact: ContactDictionary
  seo: SeoDictionary
  footer: FooterDictionary
  legal: LegalDictionary
}
