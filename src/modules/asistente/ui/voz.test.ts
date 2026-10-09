import { describe, expect, it } from 'vitest'
import { comoDictar, elegirVoz, esDespedida, frasesListas, idiomaDelTexto, paraLeer } from './voz'

// Las voces que traen de verdad macOS (Safari), Chrome y Edge.
const MAC = [
  { name: 'Jorge', lang: 'es-ES' },
  { name: 'Mónica', lang: 'es-ES' },
  { name: 'Juan', lang: 'es-MX' },
  { name: 'Paulina', lang: 'es-MX' },
  { name: 'Fred', lang: 'en-US' },
  { name: 'Daniel', lang: 'en-GB' },
  { name: 'Samantha', lang: 'en-US' },
]
const CHROME = [
  { name: 'Google español', lang: 'es-ES' },
  { name: 'Google español de Estados Unidos', lang: 'es-US' },
  { name: 'Google UK English Male', lang: 'en-GB' },
  { name: 'Google US English', lang: 'en-US' },
]
const EDGE = [
  { name: 'Microsoft Alvaro Online (Natural) - Spanish (Spain)', lang: 'es-ES' },
  { name: 'Microsoft Jorge Online (Natural) - Spanish (Mexico)', lang: 'es-MX' },
  { name: 'Microsoft Sofia Online (Natural) - Spanish (Bolivia)', lang: 'es-BO' },
  { name: 'Microsoft Dalia Online (Natural) - Spanish (Mexico)', lang: 'es-MX' },
  { name: 'Microsoft Guy Online (Natural) - English (United States)', lang: 'en-US' },
  { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US' },
]

describe('la voz de Luxury', () => {
  it('en español elige una mujer latinoamericana, no la de España ni un hombre', () => {
    expect(elegirVoz(MAC, 'es')?.name).toBe('Paulina')
    expect(elegirVoz(CHROME, 'es')?.name).toBe('Google español de Estados Unidos')
    expect(elegirVoz(EDGE, 'es')?.name).toBe('Microsoft Sofia Online (Natural) - Spanish (Bolivia)')
  })

  it('en inglés elige una mujer nativa', () => {
    expect(elegirVoz(MAC, 'en')?.name).toBe('Samantha')
    expect(elegirVoz(CHROME, 'en')?.name).toBe('Google US English')
    expect(elegirVoz(EDGE, 'en')?.name).toBe('Microsoft Aria Online (Natural) - English (United States)')
  })

  it('sin voces de ese idioma no inventa una', () => {
    expect(elegirVoz([{ name: 'Samantha', lang: 'en-US' }], 'es')).toBeUndefined()
  })

  it('la voz sigue el idioma de la respuesta', () => {
    expect(idiomaDelTexto('Listo, registré a Ramón en tu lista de invitados.', 'en')).toBe('es')
    expect(idiomaDelTexto('Done: I added Ramón to your guest list.', 'es')).toBe('en')
  })
})

describe('cómo se dicta en cada aparato', () => {
  const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
  const IPAD_ESCRITORIO = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15'
  const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'

  // WebKit no trae el reconocimiento de voz en las apps de la pantalla de inicio (bug 225298).
  it('en la app del iPhone (pantalla de inicio) dicta con el teclado', () => {
    expect(comoDictar({ ua: SAFARI_IPHONE, instalada: true, tactil: true, lang: 'es-BO', conReconocedor: true })).toEqual({ modo: 'teclado' })
    expect(comoDictar({ ua: IPAD_ESCRITORIO, instalada: true, tactil: true, lang: 'es-BO', conReconocedor: true })).toEqual({ modo: 'teclado' })
  })

  it('en Safari del iPhone usa un español que el dictado de Apple trae', () => {
    expect(comoDictar({ ua: SAFARI_IPHONE, instalada: false, tactil: true, lang: 'es-BO', conReconocedor: true })).toEqual({ modo: 'navegador', lang: 'es-MX' })
    expect(comoDictar({ ua: SAFARI_IPHONE, instalada: false, tactil: true, lang: 'es-CL', conReconocedor: true })).toEqual({ modo: 'navegador', lang: 'es-CL' })
    expect(comoDictar({ ua: SAFARI_IPHONE, instalada: false, tactil: true, lang: 'en-GB', conReconocedor: true })).toEqual({ modo: 'navegador', lang: 'en-GB' })
  })

  it('fuera de Apple, el idioma del aparato tal cual', () => {
    expect(comoDictar({ ua: ANDROID, instalada: true, tactil: true, lang: 'es-BO', conReconocedor: true })).toEqual({ modo: 'navegador', lang: 'es-BO' })
  })

  it('sin reconocedor: teclado en el celular, nada en la computadora', () => {
    expect(comoDictar({ ua: ANDROID, instalada: false, tactil: true, lang: 'es-BO', conReconocedor: false })).toEqual({ modo: 'teclado' })
    expect(comoDictar({ ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0', instalada: false, tactil: false, lang: 'es', conReconocedor: false })).toEqual({ modo: 'ninguno' })
  })
})

describe('leer mientras llega', () => {
  it('suelta las frases enteras y guarda la que está a medias', () => {
    expect(frasesListas('Listo, registré a Ramón. Le mando su invitac')).toEqual({ frases: ['Listo, registré a Ramón.'], resto: ' Le mando su invitac' })
    expect(frasesListas('¿Quién falta? Faltan tres!\nNada más')).toEqual({ frases: ['¿Quién falta?', 'Faltan tres!'], resto: '\nNada más' })
  })

  it('no corta en los decimales ni en las horas', () => {
    expect(frasesListas('Son Bs 1.500,50 en total. Y')).toEqual({ frases: ['Son Bs 1.500,50 en total.'], resto: ' Y' })
  })

  it('lo que se lee no lleva enlaces del panel ni marcas', () => {
    expect(paraLeer('Míralo en /panel/eventos/boda-ana/invitados, **ya** está.')).toBe('Míralo en Invitados, ya está.')
    expect(paraLeer('- Ana\n- Luis')).toBe('Ana. Luis')
  })
})

describe('esDespedida', () => {
  it('«listo», «gracias», «eso es todo» terminan la conversación', () => {
    for (const d of ['Listo', 'gracias.', 'Eso es todo', 'nada más, gracias', 'Adiós', 'chau', 'ya está', 'Thanks', "that's all"]) expect(esDespedida(d), d).toBe(true)
  })
  it('una pregunta con «gracias» dentro, no', () => {
    expect(esDespedida('Gracias, ¿y quién falta por responder?')).toBe(false)
    expect(esDespedida('Lista de invitados')).toBe(false)
  })
})
