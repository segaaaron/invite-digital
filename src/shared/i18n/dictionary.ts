export interface NavDictionary {
  collections: string
  experience: string
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
  posterAlt: string
  envelopeOpen: string
  envelopeClose: string
}

export interface ExperienceAct {
  label: string
  title: string
  body: string
}

export interface ExperienceDictionary {
  eyebrow: string
  title: string
  acts: readonly [ExperienceAct, ExperienceAct, ExperienceAct]
}

export interface MobileDictionary {
  eyebrow: string
  title: string
  body: string
  bullets: readonly [string, string, string]
}

export interface CollectionsDictionary {
  eyebrow: string
  title: string
  hint: string
  previous: string
  next: string
  backToHome: string
  errorMessage: string
}

export interface ComparisonDictionary {
  eyebrow: string
  title: string
  hint: string
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
  body: string
  submit: string
  successTitle: string
  successBody: string
  again: string
  sending: string
  whatsappLabel: string
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

export interface InvitationDictionary {
  title: string
  seatsLabel: string
  attendingLabel: string
  messageLabel: string
  submit: string
  sending: string
  successTitle: string
  successBody: string
  change: string
  closed: string
  passTitle: string
  passHint: string
  passAlt: string
  errors: Record<RsvpMessageKey, string>
}

/** Lo que la reserva de un regalo puede responderle al invitado. */
export type RegistryMessageKey =
  | 'already_claimed'
  | 'not_yours'
  | 'already_purchased'
  | 'not_found'
  | 'wrong_event'
  | 'storage_failure'
  | 'rate_limited'

/**
 * La mesa de regalos que ve el invitado. Va aparte de `InvitationDictionary` porque es
 * un bloque completo con vida propia, no cuatro etiquetas sueltas del formulario de RSVP.
 */
export interface RegistryDictionary {
  title: string
  intro: string
  empty: string
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
  registry: RegistryDictionary
  guestbook: GuestbookDictionary
  testimonials: TestimonialsDictionary
  faq: FaqDictionary
  contact: ContactDictionary
  seo: SeoDictionary
  footer: FooterDictionary
}
