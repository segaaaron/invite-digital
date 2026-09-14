import { describe, expect, it } from 'vitest'
import { mergeContent, parseInvitationContent } from './invitation-content'

describe('parseInvitationContent', () => {
  it('acepta un objeto vacío', () => {
    expect(parseInvitationContent({})).toEqual({})
  })

  it('no revienta con basura dentro', () => {
    // `blocks` es un jsonb: alguien pudo escribir cualquier cosa por SQL, y una migración
    // futura puede dejar un bloque a medias. Una invitación que revienta entera porque un
    // bloque está mal es peor que una invitación sin ese bloque.
    expect(parseInvitationContent(null)).toEqual({})
    expect(parseInvitationContent('texto')).toEqual({})
    expect(parseInvitationContent(42)).toEqual({})
    expect(parseInvitationContent([])).toEqual({})
    expect(parseInvitationContent({ itinerary: 'no es una lista' })).toEqual({})
    expect(parseInvitationContent({ hero: 'tampoco' })).toEqual({})
  })

  it('conserva los campos de texto que reconoce y descarta los que no', () => {
    const salida = parseInvitationContent({
      hero: { eyebrow: 'SAVE THE DATE', nameA: 'Camila', nameB: 'Mateo', inventado: 'fuera' },
    })
    expect(salida.hero).toEqual({ eyebrow: 'SAVE THE DATE', nameA: 'Camila', nameB: 'Mateo' })
  })

  it('recorta los espacios y descarta lo que queda vacío', () => {
    expect(parseInvitationContent({ quote: { text: '   ' } }).quote).toBeUndefined()
    expect(parseInvitationContent({ quote: { text: '  Que nunca dejes de soñar  ' } }).quote).toEqual({
      text: 'Que nunca dejes de soñar',
    })
  })

  it('descarta las filas mal formadas de una lista y conserva las buenas', () => {
    const salida = parseInvitationContent({
      itinerary: [
        { time: '18:00', label: 'Recepción' },
        { label: 'sin hora' },
        42,
        null,
        { time: '21:00', label: 'Cena', imageId: 'abc' },
      ],
    })
    expect(salida.itinerary).toEqual([
      { time: '18:00', label: 'Recepción' },
      { time: '21:00', label: 'Cena', imageId: 'abc' },
    ])
  })

  it('descarta la lista entera si no queda ninguna fila buena', () => {
    // Una lista vacía y una lista ausente son lo mismo para el diseño: no se pinta. Dejar
    // `[]` obligaría a cada tema a distinguir dos casos que se ven igual.
    expect(parseInvitationContent({ itinerary: [{ label: 'sin hora' }] }).itinerary).toBeUndefined()
  })

  it('corta la galería en seis', () => {
    const doce = Array.from({ length: 12 }, (_, i) => ({ imageId: `id-${i}`, label: `${i}` }))
    expect(parseInvitationContent({ gallery: doce }).gallery).toHaveLength(6)
  })

  it('acepta una casilla de galería con rótulo y sin foto todavía', () => {
    // Estos diseños pintan la galería como huecos con su pie desde el primer día; las
    // fotos las sube el atelier después. Con la imagen obligatoria, la sección entera
    // desaparecería hasta la primera subida y el diseño se quedaría con un salto en medio.
    expect(parseInvitationContent({ gallery: [{ label: 'Italia' }] }).gallery).toEqual([{ label: 'Italia' }])
  })

  it('descarta una casilla de galería sin rótulo', () => {
    expect(parseInvitationContent({ gallery: [{ imageId: 'abc' }] }).gallery).toBeUndefined()
  })

  it('corta el itinerario en doce', () => {
    const veinte = Array.from({ length: 20 }, (_, i) => ({ time: `${i}:00`, label: `${i}` }))
    expect(parseInvitationContent({ itinerary: veinte })).toHaveProperty('itinerary.length', 12)
  })

  it('lee los anfitriones con su lista de nombres', () => {
    expect(
      parseInvitationContent({ hosts: { label: 'Junto a mis padres', names: ['Juan Julio Pereira', '  ', 'Linzi Torrico'] } }),
    ).toEqual({ hosts: { label: 'Junto a mis padres', names: ['Juan Julio Pereira', 'Linzi Torrico'] } })
  })

  it('descarta los anfitriones sin ningún nombre', () => {
    expect(parseInvitationContent({ hosts: { label: 'Junto a mis padres', names: [] } }).hosts).toBeUndefined()
  })

  it('acepta la fecha y hora de la cuenta atrás solo si es legible', () => {
    // `events.event_date` es un día del calendario a propósito. La cuenta atrás necesita
    // la hora, y vive aquí porque es contenido de la invitación.
    expect(parseInvitationContent({ schedule: { startsAt: '2026-09-12T19:00:00' } }).schedule).toEqual({
      startsAt: '2026-09-12T19:00:00',
    })
    expect(parseInvitationContent({ schedule: { startsAt: 'el sábado' } }).schedule).toBeUndefined()
  })

  it('recorta un texto desmedido en vez de guardarlo entero', () => {
    // Nada impide pegar una novela en un textarea. El corte protege el diseño, que reserva
    // un sitio concreto para esa frase.
    const largo = 'a'.repeat(5_000)
    expect(parseInvitationContent({ quote: { text: largo } }).quote?.text.length).toBeLessThanOrEqual(600)
  })
})

describe('la música de la invitación', () => {
  it('guarda qué audio del evento suena, además del título y el artista', () => {
    expect(
      parseInvitationContent({
        music: { track: 'At Last', artist: 'Etta James', audioMediaId: '11111111-2222-3333-4444-555555555555' },
      }).music,
    ).toEqual({ track: 'At Last', artist: 'Etta James', audioMediaId: '11111111-2222-3333-4444-555555555555' })
  })

  it('el título y el artista siguen valiendo sin audio, que es como están las dieciséis', () => {
    // Los diseños llevan su canción escrita desde el principio y ninguno suena todavía.
    // Quitar el audio no puede vaciar el bloque ni borrar lo que ya se pintaba.
    expect(parseInvitationContent({ music: { track: 'Tiempo de Vals' } }).music).toEqual({ track: 'Tiempo de Vals' })
  })

  it('descarta un identificador vacío en vez de guardarlo', () => {
    // Es como se quita la música: se deja el selector en «sin música» y sale `undefined`,
    // no una cadena vacía que la vista tomaría por una dirección.
    expect(parseInvitationContent({ music: { track: 'At Last', audioMediaId: '   ' } }).music).toEqual({
      track: 'At Last',
    })
  })
})

describe('mergeContent', () => {
  it('rellena lo vacío y no pisa lo escrito', () => {
    // La prueba que protege una boda de verdad: cambiar de diseño no puede llevarse por
    // delante el itinerario que el atelier ya cargó.
    const delDiseno = {
      quote: { text: 'De muestra' },
      music: { track: 'At Last', artist: 'Etta James' },
    }
    const delAtelier = { music: { track: 'Perfect', artist: 'Ed Sheeran' } }

    expect(mergeContent(delDiseno, delAtelier)).toEqual({
      quote: { text: 'De muestra' },
      music: { track: 'Perfect', artist: 'Ed Sheeran' },
    })
  })

  it('el bloque es la unidad, no el campo', () => {
    // Mezclar la canción del atelier con el artista de la maqueta produce una línea que no
    // escribió nadie: «Perfect, de Etta James».
    expect(
      mergeContent({ music: { track: 'At Last', artist: 'Etta James' } }, { music: { track: 'Perfect' } }),
    ).toEqual({ music: { track: 'Perfect' } })
  })

  it('deja intacto lo que el diseño no trae', () => {
    expect(mergeContent({}, { quote: { text: 'Del atelier' } })).toEqual({ quote: { text: 'Del atelier' } })
  })

  it('sin nada del atelier devuelve el del diseño', () => {
    expect(mergeContent({ quote: { text: 'De muestra' } }, {})).toEqual({ quote: { text: 'De muestra' } })
  })
})

describe('la línea secundaria del itinerario', () => {
  it('la conserva cuando viene', () => {
    // Varios diseños emparejan la hora con un encabezado y un detalle debajo. Sin este
    // campo habría que meter las dos cosas en el mismo texto y perder el salto.
    expect(
      parseInvitationContent({ itinerary: [{ time: 'SC.02', label: 'INT. CAPILLA. NOCHE.', note: 'Ceremonia · 19:00' }] })
        .itinerary,
    ).toEqual([{ time: 'SC.02', label: 'INT. CAPILLA. NOCHE.', note: 'Ceremonia · 19:00' }])
  })

  it('no la inventa cuando no viene', () => {
    expect(parseInvitationContent({ itinerary: [{ time: '18:00', label: 'Recepción' }] }).itinerary).toEqual([
      { time: '18:00', label: 'Recepción' },
    ])
  })
})

describe('los avisos sueltos', () => {
  it('conserva los que traen título', () => {
    // «Solo adultos», «Lluvia de sobres». Es una lista y no un campo por aviso porque cada
    // boda tiene los suyos y no se pueden enumerar.
    expect(
      parseInvitationContent({
        notes: [{ title: 'Solo adultos', text: 'Evento para adultos y adolescentes.' }, { title: 'Lluvia de sobres' }],
      }).notes,
    ).toEqual([{ title: 'Solo adultos', text: 'Evento para adultos y adolescentes.' }, { title: 'Lluvia de sobres' }])
  })

  it('descarta un aviso sin título', () => {
    // Un cuerpo sin encabezado es un párrafo suelto en medio del diseño.
    expect(parseInvitationContent({ notes: [{ text: 'sin título' }] }).notes).toBeUndefined()
  })

  it('corta en cuatro', () => {
    const ocho = Array.from({ length: 8 }, (_, i) => ({ title: `Aviso ${i}` }))
    expect(parseInvitationContent({ notes: ocho }).notes).toHaveLength(4)
  })
})
