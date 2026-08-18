import type { Dictionary } from '../dictionary'

export const en = {
  nav: { collections: 'Collections', experience: '3D Experience', pricing: 'Investment', contact: "Let's talk" },
  hero: {
    eyebrow: 'Quiet luxury · Digital atelier',
    titleLine1: 'DIGITAL',
    titleLine2: 'INVITATIONS',
    titleAccent: 'haute couture',
    body: 'Envelopes that open in 3D, wax seals that break at your touch, and an immersive scene for every celebration. We design the piece, build it, and deliver it on its own domain within 72 hours.',
    ctaPrimary: 'Create your invitation',
    ctaSecondary: 'See the live demo',
    trustLabel: 'Planners who trust us',
  },
  stats: {
    events: 'Events delivered',
    delivery: 'Average delivery time',
    rsvp: 'RSVP confirmation rate',
    countries: 'Countries reached',
  },
  experience: {
    eyebrow: 'The experience',
    title: 'Three acts, one single piece',
    acts: [
      { label: 'Act I', title: 'Virtual unboxing', body: 'The envelope arrives sealed. Your guest slides it open, the wax seal gives way, and the card emerges with the physics of real paper.' },
      { label: 'Act II', title: 'Immersive details', body: 'Gold foil that catches the light as the cursor moves, cotton-paper textures, and hand-composed typography for every name.' },
      { label: 'Act III', title: 'A live interactive demo', body: 'A gallery in motion, a map, a countdown, and RSVP with instant confirmation straight to the couple’s WhatsApp.' },
    ],
  },
  mobile: {
    eyebrow: 'In their pocket',
    title: 'This is how it arrives on their phone',
    body: 'A single link, sent over WhatsApp. It opens full screen, with no app to download, and behaves the same way on iPhone, Android, or tablet.',
    bullets: ['Loads in under two seconds', 'A QR code for the welcome table', 'A confirmation button straight to the chat'],
  },
  collections: { eyebrow: 'Collections', title: 'A scene for every celebration', hint: 'Drag it, or use the arrows' },
  comparison: {
    eyebrow: 'Comparison',
    title: 'The LUXE difference',
    hint: 'Drag the seal to compare',
    traditionalLabel: 'Traditional',
    luxe: ['A 3D envelope with animated opening and wax seal', 'Your own domain, free of third-party branding', 'RSVP with a live dashboard and reminders', 'Music, an immersive gallery, and a countdown', 'A design composed by hand at the atelier'],
    traditional: ['A static image sent over chat', 'A template carrying the platform’s logo', 'Confirmations tallied by hand', 'No gallery, no music, no map', 'The same design shared with a thousand other events'],
  },
  pricing: { eyebrow: 'Investment', title: 'Plans & pricing', mostChosen: 'Most chosen' },
  models: { eyebrow: 'Models', title: 'Invitations tailored to you', subtitle: 'Eight signature designs · with QR code, opening animation, and online confirmation', qr: 'QR code', open: 'Open', seeAll: 'See every model' },
  testimonials: {
    eyebrow: 'Testimonials',
    title: 'What the people who lived it are saying',
    items: [
      {
        quote: 'We sent the link on a Tuesday and by Friday we already had ninety percent of the confirmations. No bride in Bolivia had seen anything like it.',
        author: 'Daniela Ortiz',
        role: 'Wedding planner · Cochabamba',
      },
      {
        quote: 'The wax seal breaking open on a phone screen was the most talked-about moment of my daughter’s entire quinceañera.',
        author: 'Rodrigo Ibáñez',
        role: 'Father of the quinceañera · Santa Cruz',
      },
      {
        quote: 'We moved the ceremony time two days out and the link we’d already sent updated instantly. Not a single last-minute call.',
        author: 'Camila Vargas',
        role: 'Corporate events organizer · La Paz',
      },
    ],
  },
  faq: {
    eyebrow: 'Frequently asked questions',
    title: 'Everything people tend to ask us',
    items: [
      { question: 'How long does delivery take?', answer: 'Between 72 hours and 7 days, depending on the plan. Haute Couture includes an earlier concept phase.' },
      { question: 'Does the guest need to install anything?', answer: 'No. The invitation opens right in the browser from a WhatsApp link — no apps, no downloads.' },
      { question: 'Can I send a different link to each guest?', answer: 'Yes. Every guest receives a link bearing their own name and their own individual confirmation.' },
      { question: 'Does it work without a stable connection?', answer: 'The invitation weighs under 2 MB and loads in stages, so it holds up on slow networks.' },
      { question: 'What if I need to change the date or the venue?', answer: 'The details update live: the link already sent will show the new information.' },
    ],
  },
  contact: {
    eyebrow: 'A quiet-luxury atelier',
    title: 'Begin your journey',
    body: 'Tell us the date and the venue. Within 24 hours you’ll receive a proposal with a sketch and a navigable demo of your invitation.',
    submit: 'Request a consultation',
    successTitle: 'Request received',
    successBody: 'We’ll write to you within 24 hours with the sketch and the navigable demo.',
    again: 'Send another',
    fields: { name: 'Name', contact: 'WhatsApp or email', category: 'Event type', date: 'Event date', message: 'Tell us about your event' },
  },
  footer: { rights: 'All rights reserved', coverage: 'Cochabamba, Bolivia · Delivering nationwide' },
} satisfies Dictionary
