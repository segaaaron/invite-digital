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
}

export interface StatsDictionary {
  events: string
  delivery: string
  rsvp: string
  countries: string
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
}

export interface ComparisonDictionary {
  eyebrow: string
  title: string
  hint: string
  luxe: readonly [string, string, string, string, string]
  traditional: readonly [string, string, string, string, string]
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
  contact: string
  category: string
  date: string
  message: string
}

export interface ContactDictionary {
  eyebrow: string
  title: string
  body: string
  submit: string
  successTitle: string
  successBody: string
  again: string
  fields: ContactFieldsDictionary
}

export interface FooterDictionary {
  rights: string
  coverage: string
}

export interface Dictionary {
  nav: NavDictionary
  hero: HeroDictionary
  stats: StatsDictionary
  experience: ExperienceDictionary
  mobile: MobileDictionary
  collections: CollectionsDictionary
  comparison: ComparisonDictionary
  pricing: PricingDictionary
  models: ModelsDictionary
  contact: ContactDictionary
  footer: FooterDictionary
}
