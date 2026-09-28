import { escapar, type CorreoCompuesto } from './client-access-email'
import { firmaHtml, firmaTexto } from './firma'

/**
 * **Los correos de acompañamiento** que el mantenimiento diario manda a los anfitriones: lo que
 * haría un planner. Cada uno dice una sola cosa y lleva un solo enlace.
 */
export type TipoDeAcompanamiento = 'hito-escribir' | 'hito-repartir' | 'rsvp-bajo' | 'encuesta' | 'aniversario'

export function acompanamientoEmail(input: {
  tipo: TipoDeAcompanamiento
  evento: string
  /** «sáb 14 feb 2027». */
  fecha: string
  /** Días hasta el evento (negativos, después). */
  dias: number
  grupos: number
  respondidos: number
  /** El panel del evento, donde se hace lo que el correo pide. */
  enlacePanel: string
  /** La encuesta, solo para `encuesta`. */
  enlaceOpinion: string | null
  /**
   * Su código de recomendación, en la encuesta y el aniversario: quien pida con él recibe el
   * descuento. Es la forma de que un cliente contento traiga al siguiente sin que nadie lo pida a mano.
   */
  referido?: { readonly codigo: string; readonly descuento: number; readonly enlace: string } | null
  siteUrl: string
}): CorreoCompuesto {
  const { asunto, boton } = contenido(input)
  const lineas = [...contenido(input).lineas, ...lineaDeReferido(input)]
  const enlace = input.tipo === 'encuesta' && input.enlaceOpinion !== null ? input.enlaceOpinion : input.enlacePanel
  const text = [...lineas, '', `${boton}: ${enlace}`, '', firmaTexto(input.siteUrl)].join('\n')
  const html = [
    ...lineas.map((l) => `<p>${escapar(l)}</p>`),
    `<p><a href="${escapar(enlace)}">${escapar(boton)}</a></p>`,
    firmaHtml(input.siteUrl),
  ].join('')
  return { subject: asunto, text, html }
}

function lineaDeReferido(i: Parameters<typeof acompanamientoEmail>[0]): string[] {
  if (i.referido == null || (i.tipo !== 'encuesta' && i.tipo !== 'aniversario')) return []
  const regalo = i.referido.descuento > 0 ? ` y tendrá un ${i.referido.descuento} % de descuento` : ''
  return [`Si alguien cercano prepara su fiesta, pásale tu código ${i.referido.codigo}: que lo escriba al hacer su pedido${regalo}. O mándale este enlace, que ya lo lleva puesto: ${i.referido.enlace}`]
}

function contenido(i: Parameters<typeof acompanamientoEmail>[0]): { asunto: string; lineas: string[]; boton: string } {
  const faltan = i.dias === 1 ? 'falta 1 día' : `faltan ${i.dias} días`
  switch (i.tipo) {
    case 'hito-escribir':
      return {
        asunto: `${i.evento}: es buen momento para escribir tu invitación`,
        lineas: [
          `Para tu evento del ${i.fecha} ${faltan}.`,
          'Es el momento de dejar lista tu invitación —nombres, fecha, lugar y los detalles— para empezar a repartirla con tiempo: tus invitados necesitan unas semanas para organizarse.',
          'Si quieres, te ayudamos a terminarla.',
        ],
        boton: 'Escribir mi invitación',
      }
    case 'hito-repartir':
      return {
        asunto: `${i.evento}: toca repartir las invitaciones`,
        lineas: [
          `Tu invitación ya está escrita y ${faltan} para el ${i.fecha}.`,
          i.grupos === 0
            ? 'Todavía no cargaste a tus invitados. Cárgalos y envíales su enlace por WhatsApp desde el panel: cada uno recibe el suyo.'
            : 'Aún falta enviar la mayoría de los enlaces. Desde el panel se mandan por WhatsApp de uno en uno, cada invitado con el suyo.',
        ],
        boton: 'Enviar mis invitaciones',
      }
    case 'rsvp-bajo':
      return {
        asunto: `${i.evento}: faltan confirmaciones`,
        lineas: [
          `Respondieron ${i.respondidos} de tus ${i.grupos} invitaciones y el cierre de las confirmaciones es en pocos días.`,
          'Un recordatorio amable por WhatsApp suele bastar: desde el panel ves a quién le falta responder y le escribes con un toque.',
        ],
        boton: 'Ver a quién recordar',
      }
    case 'encuesta':
      return {
        asunto: `¿Cómo te fue en ${i.evento}?`,
        lineas: ['Esperamos que la fiesta haya sido tal como la soñaste.', 'Nos ayudaría mucho saber cómo te fue con tu invitación: son dos preguntas y un minuto.'],
        boton: 'Dejar mi opinión',
      }
    case 'aniversario':
      return {
        asunto: `Hoy hace un año de ${i.evento}`,
        lineas: [
          `Hace un año celebraste ${i.evento}. ¡Feliz aniversario!`,
          'Si tienes otra fecha por delante —un bautizo, unos XV, una graduación—, nos encantará acompañarte otra vez.',
        ],
        boton: 'Ver los diseños',
      }
  }
}

/**
 * Las gracias a quien recomendó: alguien pagó su pedido con su código. Sin premio prometido —eso
 * lo decide el atelier y lo dice él—; solo que se sepa que su recomendación llegó.
 */
export function graciasPorRecomendarEmail(input: { evento: string; quien: string; siteUrl: string }): CorreoCompuesto {
  const lineas = [
    `${input.quien} confió en nosotros para su fiesta gracias a tu recomendación de ${input.evento}.`,
    '¡Gracias por pasar la voz! Es lo que más valoramos.',
  ]
  return {
    subject: `Tu recomendación llegó: gracias`,
    text: [...lineas, '', firmaTexto(input.siteUrl)].join('\n'),
    html: [...lineas.map((l) => `<p>${escapar(l)}</p>`), firmaHtml(input.siteUrl)].join(''),
  }
}
