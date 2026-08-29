export interface NavDictionary {
  collections: string
  experience: string
  /** «Casos» en la maqueta; ancla a la sección de la diferencia. */
  cases: string
  pricing: string
  contact: string
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
  /** La franja de cifras bajo el sobre. */
  metrics: readonly [HeroMetric, HeroMetric, HeroMetric, HeroMetric]
  posterAlt: string
  envelopeOpen: string
  envelopeClose: string
}

export interface HeroMetric {
  value: string
  label: string
  /** Nombre del icono; el dibujo vive en `shared/design/ui/icons`. */
  icon: 'mail' | 'clock' | 'check' | 'globe'
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
  /** Las dos fotografías de la maqueta, con su pie. */
  shots: readonly [MobileShot, MobileShot]
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

export interface TestimonialItem {
  quote: string
  author: string
  role: string
}

export interface TestimonialsDictionary {
  eyebrow: string
  title: string
  items: readonly [TestimonialItem]
}

export interface PricingDictionary {
  eyebrow: string
  title: string
  mostChosen: string
  /** «Elegir Atelier →». El nombre del plan entra donde dice {plan}. */
  choose: string
  /** El plan más caro no se elige de un clic: se agenda una llamada. */
  bookCall: string
}

export interface ModelsDictionary {
  eyebrow: string
  title: string
  subtitle: string
  qr: string
  open: string
  seeAll: string
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
  coverage: string
}

export type RsvpMessageKey =
  | 'invitation_not_found'
  | 'invitation_revoked'
  | 'rsvp_closed'
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
  /** «INGRESA A MI INVITACIÓN»: la llamada de las portadas con fotografía de los XV. */
  coverEnter: string
  /** La misma llamada en boda, donde la invitación es de dos: «nuestra», no «mi». */
  coverEnterShared: string
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
  /** «Mis XV Años»: el rótulo del cierre de los quince. */
  myFifteen: string
}

export interface InvitationDictionary {
  title: string
  seatsLabel: string
  /** «Nombre completo»: el enlace sabe el grupo, no quién de la familia contesta. */
  nameLabel: string
  namePlaceholder: string
  /** «¿Asistirás?», con sus dos respuestas. */
  goingLabel: string
  goingYes: string
  goingNo: string
  attendingLabel: string
  messageLabel: string
  messagePlaceholder: string
  submit: string
  sending: string
  /**
   * «¡Gracias, {nombre}!». Lleva marcador porque el diseño lo saluda por su nombre; sin
   * nombre escrito, la pantalla usa el genérico de `successTitleAnon`.
   */
  successTitle: string
  successTitleAnon: string
  successBody: string
  change: string
  closed: string
  passTitle: string
  passHint: string
  passAlt: string
  passOpen: string
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
}
