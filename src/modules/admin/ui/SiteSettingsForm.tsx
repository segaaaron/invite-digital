'use client'

import { useActionState, useEffect, useState, type ReactNode } from 'react'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { FIELD_CLASS, LABEL_CLASS, PanelAlert, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { enlaceWhatsapp, formatoWhatsapp } from '@/shared/whatsapp'
import { restoreSiteVersionAction, saveSiteSettingsAction, type SiteActionState } from '@/app/_acciones/admin/web-actions'
import type { Bilingue, SiteSettings } from '../domain/site-settings'
import { SubmitButton } from '@/shared/design/ui/panel/estados'
import { LegalText } from '@/shared/design/ui/LegalText'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { traducir } from '@/shared/i18n/en-ingles'
import { useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: SiteActionState = { status: 'idle' }

type Idioma = 'es' | 'en'

export type VersionView = {
  readonly id: string
  readonly fecha: string
  readonly actorEmail: string
  readonly campos: readonly string[]
}

/** El nombre de cada bloque en pantalla, para las secciones, los errores y el historial. */
const BLOQUES: Record<string, { titulo: string; ancla: string }> = {
  whatsapp: { titulo: 'Contacto', ancla: 'contacto' },
  horario: { titulo: 'Contacto', ancla: 'contacto' },
  mensajes: { titulo: 'Mensajes de WhatsApp', ancla: 'mensajes' },
  direccion: { titulo: 'Ubicación', ancla: 'ubicacion' },
  ciudad: { titulo: 'Ubicación', ancla: 'ubicacion' },
  pais: { titulo: 'Ubicación', ancla: 'ubicacion' },
  cobertura: { titulo: 'Ubicación', ancla: 'ubicacion' },
  redes: { titulo: 'Redes sociales', ancla: 'redes' },
  cifras: { titulo: 'Cifras de la portada', ancla: 'pruebas' },
  marcas: { titulo: 'Marcas que confían', ancla: 'pruebas' },
  testimonios: { titulo: 'Testimonios', ancla: 'testimonios' },
  legal: { titulo: 'Textos legales', ancla: 'legal' },
  seo: { titulo: 'Buscadores', ancla: 'buscadores' },
}

const bloqueDe = (campo: string | undefined) => (campo === undefined ? undefined : BLOQUES[campo.split('.')[0] ?? ''])

/**
 * «La web»: todo lo que la web pública enseña del negocio, con vista previa en vivo.
 *
 * - **Un solo guardado** con barra fija que avisa de cambios sin guardar: los datos del
 *   negocio se cambian juntos —un número y su horario, una ciudad y su cobertura— y diez
 *   botones «Guardar» obligaban a recordar cuál se pulsó.
 * - **Los campos bilingües se editan de un idioma a la vez**, con un conmutador arriba: dos
 *   columnas de cada texto duplicaban el largo de la pantalla.
 * - **El error se marca en su bloque** y la pantalla baja hasta él.
 * - El formulario viaja como un JSON de un campo oculto: los controles son controlados, así
 *   que React no vacía nada al terminar la acción.
 */
/** Lo que Google enseña de cada página si «Buscadores» está vacío. */
export type SeoPorDefecto = Record<'inicio' | 'colecciones' | 'bodas' | 'xv', { titulo: Bilingue; descripcion: Bilingue }>

export function SiteSettingsForm({ inicial, versiones, seoPorDefecto }: { inicial: SiteSettings; versiones: readonly VersionView[]; seoPorDefecto: SeoPorDefecto }) {
  const t = useT()
  // La versión sobre la que se edita: el servidor rechaza el guardado si ya no es la última.
  const base = versiones[0]?.id ?? ''
  const [datos, setDatos] = useState<SiteSettings>(inicial)
  const [idioma, setIdioma] = useState<Idioma>('es')
  const [estado, guardar, guardando] = useActionState(sinCaerse(saveSiteSettingsAction), INICIAL)
  // Lo último guardado. Tras un guardado correcto, lo que se envió pasa a serlo y la barra
  // deja de avisar; se ajusta durante el render, que es como React pide derivar de una acción.
  const [guardado, setGuardado] = useState({ json: JSON.stringify(inicial), estado })
  if (guardado.estado !== estado) {
    setGuardado({ json: estado.status === 'success' ? JSON.stringify(datos) : guardado.json, estado })
  }
  const errorBloque = estado.status === 'error' ? bloqueDe(estado.campo) : undefined

  useEffect(() => {
    if (errorBloque) document.getElementById(errorBloque.ancla)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [errorBloque])

  const actual = JSON.stringify(datos)
  const sucio = actual !== guardado.json

  const cambiar = <K extends keyof SiteSettings>(clave: K, valor: SiteSettings[K]) => setDatos((d) => ({ ...d, [clave]: valor }))
  const bil = (b: Bilingue, v: string): Bilingue => ({ ...b, [idioma]: v })

  /** Lo que dice cada bloque cerrado, en una línea (maqueta E46): se lee la web sin abrir nada. */
  const redes = (['instagram', 'facebook', 'tiktok'] as const).filter((r) => (datos.redes[r] ?? '').trim() !== '')
  const RESUMEN: Record<string, string> = {
    contacto: datos.whatsapp.trim() === '' ? t('Sin WhatsApp: se ve solo el formulario', 'No WhatsApp: only the form shows') : `WhatsApp ${formatoWhatsapp(datos.whatsapp)}${datos.horario[idioma] ? `, ${datos.horario[idioma]}` : ''}`,
    mensajes: t('Lo que se abre escrito al pulsar WhatsApp', 'What opens pre-written when tapping WhatsApp'),
    ubicacion: [datos.ciudad, datos.pais].filter(Boolean).join(', ') || t('Sin ubicación', 'No location'),
    redes: redes.length === 0 ? t('Sin redes', 'No social networks') : redes.map((r) => ({ instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' })[r]).join(t(' y ', ' and ')),
    pruebas: datos.cifras.visibles ? t('Cifras de la portada a la vista', 'Home figures visible') : t('Cifras ocultas hasta que sean reales', 'Figures hidden until they are real'),
    testimonios: t(`${datos.testimonios.filter((x) => x.confirmado).length} publicado(s)`, `${datos.testimonios.filter((x) => x.confirmado).length} published`),
    legal: [datos.legal.terminos.publicada ? t('Términos', 'Terms') : '', datos.legal.privacidad.publicada ? t('Privacidad', 'Privacy') : ''].filter(Boolean).join(t(' y ', ' and ')) || t('Sin publicar', 'Unpublished'),
    buscadores: t('Título y descripción para América', 'Title and description for the Americas'),
  }

  const tarjeta = (ancla: string, titulo: string, hijos: ReactNode, pie?: ReactNode) => (
    // Una fila de la maqueta: el bloque y su resumen, y se despliega para editarlo.
    <details className="group scroll-mt-28 border-b border-line-panel last:border-b-0" id={ancla} open={errorBloque?.ancla === ancla ? true : undefined}>
      <summary className="flex min-h-[68px] cursor-pointer list-none items-center gap-4 px-1 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{traducir(titulo, t)}</span>
          <span className="block truncate text-[13.5px] text-ink-mute">{RESUMEN[ancla] ?? ''}</span>
        </span>
        <svg aria-hidden className="size-4.5 shrink-0 text-ink-mute transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" viewBox="0 0 24 24">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </summary>
      <div className={`flex flex-col gap-4 px-1 pt-1 pb-6 ${errorBloque?.ancla === ancla ? 'rounded-[12px] ring-2 ring-danger/40' : ''}`}>
        {errorBloque?.ancla === ancla && estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}
        {hijos}
        {pie}
      </div>
    </details>
  )

  const probar = enlaceWhatsapp(datos.whatsapp, datos.mensajes.general[idioma])

  return (
    <div className="flex flex-col gap-4.5 pb-24">
      {/* El idioma de los textos, arriba: manda sobre todos los campos bilingües de abajo. */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div aria-label={t('Idioma de los textos', 'Language of the texts')} className="inline-flex rounded-[var(--radius-pill)] border border-line-panel-strong bg-bg-raised p-1" role="group">
          {(['es', 'en'] as const).map((i) => (
            <button
              aria-pressed={idioma === i}
              className={`cursor-pointer rounded-[var(--radius-pill)] px-3.5 py-1.5 font-mono text-[12px] tracking-[0.25em] uppercase max-[859px]:min-h-11 ${idioma === i ? 'bg-ink text-white' : 'text-ink-soft'}`}
              key={i}
              onClick={() => setIdioma(i)}
              type="button"
            >
              {i === 'es' ? t('Español', 'Spanish') : t('Inglés', 'English')}
            </button>
          ))}
        </div>
      </div>

      {estado.status === 'error' ? (
        <PanelAlert tone="error">
          {errorBloque ? <strong className="font-medium">{traducir(errorBloque.titulo, t)}: </strong> : null}
          {estado.message}
          {estado.conflicto ? (
            <button className="ml-2 cursor-pointer font-medium underline" onClick={() => window.location.reload()} type="button">
              {t('Recargar', 'Reload')}
            </button>
          ) : null}
        </PanelAlert>
      ) : null}

      {/* El índice de la maqueta (E46) a la izquierda y las versiones a la derecha. */}
      <div className="flex flex-wrap items-start gap-7">
        <section aria-labelledby="lo-que-dice-la-web" className="min-w-0 flex-[2_1_480px]">
          <h2 className="mb-2 font-display text-[24px] font-medium" id="lo-que-dice-la-web">
            {t('Lo que dice la web', 'What the website says')}
          </h2>
        <form action={guardar} className="flex min-w-0 flex-col border-t border-line-panel" id="form-web">
          <input name="datos" type="hidden" value={actual} />
          <input name="base" type="hidden" value={base} />

          {tarjeta(
            'contacto',
            'Contacto',
            <>
              <Campo ayuda={t('Con el código de país. Un celular de Bolivia sin prefijo se completa con +591.', 'With the country code. A Bolivian mobile without prefix is completed with +591.')} etiqueta={t('WhatsApp del negocio', 'Business WhatsApp')} ancho="medio">
                <input className={FIELD_CLASS} inputMode="tel" onChange={(e) => cambiar('whatsapp', e.target.value)} placeholder="+591 700 12345" value={datos.whatsapp} />
              </Campo>
              <div className="flex flex-wrap items-center gap-3">
                {probar === null ? (
                  <PanelButton disabled>{t('Probar en WhatsApp', 'Try on WhatsApp')}</PanelButton>
                ) : (
                  <PanelButton external href={probar}>
                    {t('Probar en WhatsApp', 'Try on WhatsApp')}
                  </PanelButton>
                )}
                <span className="text-[12px] text-ink-mute">
                  {probar === null
                    ? t('Sin número, los botones de contacto llevan al formulario de la web.', 'Without a number, the contact buttons lead to the website form.')
                    : t('Ábrelo desde tu teléfono antes de guardar: es el enlace que pulsará el cliente.', 'Open it from your phone before saving: it is the link the client will tap.')}
                </span>
              </div>
              <Campo ayuda={t('Se enseña junto al WhatsApp. Un enlace que nadie contesta a tiempo resta confianza.', 'Shown next to the WhatsApp. A link nobody answers in time loses trust.')} etiqueta={t(`Horario de respuesta (${idioma === 'es' ? 'español' : 'inglés'})`, `Reply hours (${idioma === 'es' ? 'Spanish' : 'English'})`)} ancho="medio">
                <input className={FIELD_CLASS} onChange={(e) => cambiar('horario', bil(datos.horario, e.target.value))} placeholder={t('Respondemos de lunes a sábado, de 9 a 19 h', 'We reply Monday to Saturday, 9 am to 7 pm')} value={datos.horario[idioma]} />
              </Campo>
            </>,
          )}

          {tarjeta(
            'mensajes',
            'Mensajes de WhatsApp',
            <>
              <p className="text-[12px] leading-[1.6] text-ink-mute">
                {t('El texto que ya viene escrito al abrir WhatsApp. Corto y natural, como lo escribiría un cliente.', 'The text already written when WhatsApp opens. Short and natural, as a client would write it.')}
              </p>
              <Campo etiqueta={t('Consulta general (contacto de la web)', 'General inquiry (website contact)')}>
                <textarea className={`${FIELD_CLASS} min-h-[72px]`} onChange={(e) => cambiar('mensajes', { ...datos.mensajes, general: bil(datos.mensajes.general, e.target.value) })} value={datos.mensajes.general[idioma]} />
              </Campo>
              <Campo ayuda={t('{plan} y {precio} se sustituyen por el plan y su precio.', '{plan} and {precio} are replaced by the plan and its price.')} etiqueta={t('Agendar el plan más alto', 'Book the top plan')}>
                <textarea className={`${FIELD_CLASS} min-h-[72px]`} onChange={(e) => cambiar('mensajes', { ...datos.mensajes, plan: bil(datos.mensajes.plan, e.target.value) })} value={datos.mensajes.plan[idioma]} />
              </Campo>
              <Campo etiqueta={t('Soporte (ayuda del panel)', 'Support (panel help)')}>
                <textarea className={`${FIELD_CLASS} min-h-[72px]`} onChange={(e) => cambiar('mensajes', { ...datos.mensajes, soporte: bil(datos.mensajes.soporte, e.target.value) })} value={datos.mensajes.soporte[idioma]} />
              </Campo>
            </>,
          )}

          {tarjeta(
            'ubicacion',
            'Ubicación',
            <>
              <p className="text-[12px] leading-[1.6] text-ink-mute">
                {t('No se publican en la web ni para Google: Luxury Atelier no dice desde dónde trabaja. La cobertura sí sale en el pie.', 'They are not published on the website or for Google: Luxury Atelier does not say where it works from. The coverage does appear in the footer.')}
              </p>
              <Campo ayuda={t('Opcional. Déjala vacía si no atiendes en un local.', 'Optional. Leave it empty if you do not serve clients at a venue.')} etiqueta={t('Dirección', 'Address')} ancho="medio">
                <input className={FIELD_CLASS} onChange={(e) => cambiar('direccion', e.target.value)} placeholder="Av. América 123" value={datos.direccion} />
              </Campo>
              <div className="grid gap-4 min-[560px]:grid-cols-2">
                <Campo ancho="corto" etiqueta={t('Ciudad', 'City')}>
                  <input className={FIELD_CLASS} onChange={(e) => cambiar('ciudad', e.target.value)} value={datos.ciudad} />
                </Campo>
                <Campo ancho="corto" etiqueta={t('País', 'Country')}>
                  <input className={FIELD_CLASS} onChange={(e) => cambiar('pais', e.target.value)} value={datos.pais} />
                </Campo>
              </div>
              <Campo etiqueta={t(`Cobertura (${idioma === 'es' ? 'español' : 'inglés'})`, `Coverage (${idioma === 'es' ? 'Spanish' : 'English'})`)}>
                <input className={FIELD_CLASS} onChange={(e) => cambiar('cobertura', bil(datos.cobertura, e.target.value))} value={datos.cobertura[idioma]} />
              </Campo>
            </>,
          )}

          {tarjeta(
            'redes',
            'Redes sociales',
            <>
              {(
                [
                  ['instagram', 'Instagram', 'https://www.instagram.com/tu-perfil'],
                  ['facebook', 'Facebook', 'https://www.facebook.com/tu-pagina'],
                  ['tiktok', 'TikTok', 'https://www.tiktok.com/@tu-perfil'],
                ] as const
              ).map(([clave, nombre, ejemplo]) => (
                <Campo etiqueta={nombre} key={clave}>
                  <input
                    className={FIELD_CLASS}
                    inputMode="url"
                    onChange={(e) => cambiar('redes', { ...datos.redes, [clave]: e.target.value })}
                    placeholder={ejemplo}
                    value={datos.redes[clave]}
                  />
                </Campo>
              ))}
              <Campo etiqueta={t('Correo de contacto', 'Contact email')}>
                <input
                  className={FIELD_CLASS}
                  inputMode="email"
                  onChange={(e) => cambiar('redes', { ...datos.redes, correo: e.target.value })}
                  placeholder={t('hola@tudominio.com', 'hello@yourdomain.com')}
                  type="email"
                  value={datos.redes.correo}
                />
              </Campo>
              <p className="text-[12px] text-ink-mute">{t('Vacíos no aparecen. Salen en el pie de la web; las redes, además, Google las usa para confirmar que el negocio es el mismo.', 'Empty ones do not appear. They show in the website footer; Google also uses the networks to confirm it is the same business.')}</p>
            </>,
          )}

          {tarjeta(
            'pruebas',
            'Pruebas sociales',
            <>
              <PanelAlert tone="ok">
                {t('Publica solo cifras y marcas que puedas respaldar. Una cifra inflada o una marca que no trabajó contigo resta más confianza de la que suma.', 'Publish only figures and brands you can back up. An inflated figure or a brand that did not work with you loses more trust than it gains.')}
              </PanelAlert>
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink max-[859px]:min-h-11">
                <input checked={datos.cifras.visibles} onChange={(e) => cambiar('cifras', { ...datos.cifras, visibles: e.target.checked })} type="checkbox" />
                {t('Publicar la franja de cifras en la portada', 'Publish the figures band on the home page')}
              </label>
              <div className="grid gap-3 min-[560px]:grid-cols-2">
                {datos.cifras.items.map((c, i) => (
                  <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2" key={i}>
                    <input
                      aria-label={t(`Cifra ${i + 1}`, `Figure ${i + 1}`)}
                      className={`${FIELD_CLASS} font-display text-[18px]`}
                      onChange={(e) => {
                        const items = [...datos.cifras.items] as [typeof c, typeof c, typeof c, typeof c]
                        items[i] = { ...c, valor: e.target.value }
                        cambiar('cifras', { ...datos.cifras, items })
                      }}
                      value={c.valor}
                    />
                    <input
                      aria-label={t(`Etiqueta de la cifra ${i + 1}`, `Label of figure ${i + 1}`)}
                      className={FIELD_CLASS}
                      onChange={(e) => {
                        const items = [...datos.cifras.items] as [typeof c, typeof c, typeof c, typeof c]
                        items[i] = { ...c, [idioma]: e.target.value }
                        cambiar('cifras', { ...datos.cifras, items })
                      }}
                      value={c[idioma]}
                    />
                  </div>
                ))}
              </div>
              <Campo ayuda={t('Una por línea. Vacío, la banda no aparece.', 'One per line. Empty, the band does not appear.')} etiqueta={t('Marcas que confían en ti', 'Brands that trust you')}>
                <textarea
                  className={`${FIELD_CLASS} min-h-[88px]`}
                  onChange={(e) => cambiar('marcas', e.target.value.split('\n'))}
                  value={datos.marcas.join('\n')}
                />
              </Campo>
            </>,
          )}

          {tarjeta(
            'testimonios',
            'Testimonios',
            <>
              {datos.testimonios.length === 0 ? <p className="text-[13px] text-ink-mute">{t('Sin testimonios, la sección no aparece en la portada.', 'Without testimonials, the section does not appear on the home page.')}</p> : null}
              {datos.testimonios.map((tm, i) => {
                const actualizar = (cambio: Partial<typeof tm>) =>
                  cambiar(
                    'testimonios',
                    datos.testimonios.map((x, j) => (j === i ? { ...x, ...cambio } : x)),
                  )
                return (
                  <div className="flex flex-col gap-3 rounded-[14px] border border-line-panel bg-white p-4" key={i}>
                    <div className="flex items-center justify-between gap-3">
                      <Pill tone={tm.confirmado ? 'ok' : 'pending'}>{tm.confirmado ? t('Publicado', 'Published') : t('Sin confirmar', 'Unconfirmed')}</Pill>
                      <PanelButton onClick={() => cambiar('testimonios', datos.testimonios.filter((_, j) => j !== i))} variant="danger">
                        {t('Quitar', 'Remove')}
                      </PanelButton>
                    </div>
                    <div className="grid gap-3 min-[560px]:grid-cols-2">
                      <input aria-label={t('Autor', 'Author')} className={FIELD_CLASS} onChange={(e) => actualizar({ autor: e.target.value })} placeholder={t('Nombre', 'Name')} value={tm.autor} />
                      <input aria-label={t('Rol', 'Role')} className={FIELD_CLASS} onChange={(e) => actualizar({ rol: bil(tm.rol, e.target.value) })} placeholder={t('Wedding planner · Cochabamba', 'Wedding planner · Cochabamba')} value={tm.rol[idioma]} />
                    </div>
                    <textarea aria-label={t('Cita', 'Quote')} className={`${FIELD_CLASS} min-h-[80px]`} onChange={(e) => actualizar({ cita: bil(tm.cita, e.target.value) })} placeholder={t('Lo que dijo, con sus palabras', 'What they said, in their words')} value={tm.cita[idioma]} />
                    <input aria-label={t('Foto', 'Photo')} className={FIELD_CLASS} onChange={(e) => actualizar({ foto: e.target.value })} placeholder={t('/site/testimonios/nombre.avif (opcional)', '/site/testimonios/name.avif (optional)')} value={tm.foto} />
                    <label className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-[1.5] text-ink-soft max-[859px]:min-h-11 max-[859px]:items-center">
                      <input checked={tm.confirmado} className="mt-0.5" onChange={(e) => actualizar({ confirmado: e.target.checked })} type="checkbox" />
                      {t('Confirmo que es un cliente real, que lo dijo con estas palabras y que me dio permiso para publicarlo.', 'I confirm this is a real client, who said it in these words and gave me permission to publish it.')}
                    </label>
                  </div>
                )
              })}
              <PanelButton
                disabled={datos.testimonios.length >= 6}
                onClick={() =>
                  cambiar('testimonios', [...datos.testimonios, { autor: '', rol: { es: '', en: '' }, cita: { es: '', en: '' }, foto: '', confirmado: false }])
                }
              >
                {t('+ Añadir testimonio', '+ Add testimonial')}
              </PanelButton>
            </>,
          )}

          {tarjeta(
            'legal',
            'Textos legales',
            <>
              <p className="max-w-[70ch] text-[13px] leading-[1.6] text-ink-soft">
                {t(
                  'Las dos páginas que la ley pide cuando recoges datos de clientes e invitados. Publicadas, se enlazan en el pie de la web y bajo cada formulario. El texto de partida es un borrador: léelo antes de publicarlo.',
                  'The two pages the law requires when you collect client and guest data. Once published, they are linked in the website footer and under each form. The starting text is a draft: read it before publishing.',
                )}
              </p>
              {(
                [
                  ['privacidad', t('Política de privacidad', 'Privacy policy'), 'privacidad'],
                  ['terminos', t('Términos del servicio', 'Terms of service'), 'terminos'],
                ] as const
              ).map(([clave, nombre, ruta]) => (
                <DocumentoLegal
                  idioma={idioma}
                  key={clave}
                  nombre={nombre}
                  onPublicar={(publicada) => cambiar('legal', { ...datos.legal, [clave]: { ...datos.legal[clave], publicada } })}
                  onTexto={(texto) => cambiar('legal', { ...datos.legal, [clave]: { ...datos.legal[clave], [idioma]: texto } })}
                  publicada={datos.legal[clave].publicada}
                  ruta={`/${idioma}/${ruta}`}
                  texto={datos.legal[clave][idioma]}
                />
              ))}
            </>,
          )}

          {tarjeta(
            'buscadores',
            'Buscadores',
            <>
              <p className="max-w-[70ch] text-[13px] leading-[1.6] text-ink-soft">
                {t(
                  'Es lo que sale en Google cuando alguien busca la web: el título en azul y el texto de debajo. Cada página ya trae uno escrito; cámbialo solo si quieres probar otro. Si lo vacías, vuelve el de siempre.',
                  'It is what Google shows when someone searches for the website: the blue title and the text below. Each page already has one written; change it only if you want to try another. If you empty it, the usual one comes back.',
                )}
              </p>
              {(
                [
                  ['inicio', t('Portada', 'Home'), ''],
                  ['colecciones', t('Colecciones', 'Collections'), '/colecciones'],
                  ['bodas', t('Bodas', 'Weddings'), '/bodas'],
                  ['xv', t('XV años', 'Quinceañeras'), '/xv-anos'],
                ] as const
              ).map(([clave, nombre, ruta]) => {
                const s = datos.seo[clave]
                const defecto = seoPorDefecto[clave]
                const poner = (cambio: Partial<typeof s>) => cambiar('seo', { ...datos.seo, [clave]: { ...s, ...cambio } })
                const titulo = s.titulo[idioma] || defecto.titulo[idioma]
                const descripcion = s.descripcion[idioma] || defecto.descripcion[idioma]
                const propio = s.titulo[idioma] !== '' || s.descripcion[idioma] !== ''
                return (
                  <details className="group rounded-[14px] border border-line-panel bg-white" key={clave} open={errorBloque?.ancla === 'buscadores'}>
                    <summary className="flex cursor-pointer list-none flex-col gap-3 p-4">
                      {/* Que se parta en dos líneas antes que salirse: a 360 px nombre, píldora y «Cambiar» no caben. */}
                      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                        <span className="text-[13.5px] text-ink">{nombre}</span>
                        <span className="flex flex-wrap items-center gap-2">
                          <Pill tone={propio ? 'ok' : 'pending'}>{propio ? t('Texto propio', 'Own text') : t('Texto de siempre', 'Usual text')}</Pill>
                          <span className="text-[12px] text-ink-mute group-open:hidden">{t('Cambiar', 'Change')}</span>
                          <span className="hidden text-[12px] text-ink-mute group-open:inline">{t('Cerrar', 'Close')}</span>
                        </span>
                      </span>
                      {/* Así lo enseña Google: nombre del sitio, dirección, título y descripción. */}
                      <span aria-hidden className="flex flex-col gap-0.5 rounded-[10px] bg-bg-top/50 px-3.5 py-3">
                        <span className="text-[12px] text-ink-mute">luxuryatelier.net › {idioma}{ruta}</span>
                        <span className="line-clamp-1 text-[16px] leading-snug text-link">{titulo}</span>
                        <span className="line-clamp-2 text-[12.5px] leading-[1.5] text-ink-soft">{descripcion}</span>
                      </span>
                    </summary>
                    <div className="flex flex-col gap-3 border-t border-line-panel p-4">
                      <Campo
                        ayuda={s.titulo[idioma].length > 60 ? t('Google corta los títulos de más de unos 60 caracteres.', 'Google cuts titles longer than about 60 characters.') : undefined}
                        contador={`${s.titulo[idioma].length}/70`}
                        etiqueta={t('Título', 'Title')}
                      >
                        <input className={FIELD_CLASS} onChange={(e) => poner({ titulo: bil(s.titulo, e.target.value) })} placeholder={defecto.titulo[idioma]} value={s.titulo[idioma]} />
                      </Campo>
                      <Campo contador={`${s.descripcion[idioma].length}/170`} etiqueta={t('Descripción', 'Description')}>
                        <textarea
                          className={`${FIELD_CLASS} min-h-[72px]`}
                          onChange={(e) => poner({ descripcion: bil(s.descripcion, e.target.value) })}
                          placeholder={defecto.descripcion[idioma]}
                          value={s.descripcion[idioma]}
                        />
                      </Campo>
                    </div>
                  </details>
                )
              })}
            </>,
          )}
        </form>
        </section>

        <aside className="min-w-0 flex-[1_1_280px]">
          <section className="scroll-mt-28" id="historial">
            <PanelCard title={t('Versiones', 'Versions')}>
              {versiones.length === 0 ? (
                <p className="text-[13px] text-ink-mute">{t('Todavía no se ha guardado ningún cambio.', 'No change has been saved yet.')}</p>
              ) : (
                // Con su propio desplazamiento: cada guardado deja una versión, y a los pocos días la lista
                // medía dos mil píxeles contra los quinientos de la columna de al lado (30 oct).
                <ul className="flex max-h-[460px] flex-col overflow-y-auto overscroll-contain">
                  {versiones.map((v, i) => (
                    <VersionRow actual={i === 0} base={base} key={v.id} version={v} />
                  ))}
                </ul>
              )}
            </PanelCard>
          </section>
        </aside>
      </div>

      {/* La barra de guardado, fija abajo: el formulario es largo y el botón tiene que estar
          a mano esté donde esté, junto al aviso de que hay cambios sin guardar. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t max-[767px]:bottom-[calc(64px+env(safe-area-inset-bottom))] border-line-panel bg-bg-raised/95 px-4.5 py-3 backdrop-blur min-[768px]:left-[92px] min-[1280px]:left-[268px]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
          <span aria-live="polite" className="text-[13px] text-ink-soft">
            {guardando ? t('Guardando…', 'Saving…') : sucio ? t('Tienes cambios sin guardar.', 'You have unsaved changes.') : estado.status === 'success' ? estado.message : t('Todo guardado.', 'All saved.')}
          </span>
          <span className="flex gap-2">
            <PanelButton disabled={!sucio || guardando} onClick={() => setDatos(JSON.parse(guardado.json) as SiteSettings)}>
              {t('Descartar', 'Discard')}
            </PanelButton>
            <SubmitButton disabled={!sucio || guardando} form="form-web" variant="primary" pending={guardando} pendingLabel={t('Guardando…', 'Saving…')}>{t('Guardar cambios', 'Save changes')}</SubmitButton>
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * El ancho dice cuánto se espera escribir: un teléfono no necesita mil píxeles, y una línea de
 * texto larga se lee peor pasados los 65 caracteres. Es lo que recomienda Baymard para los
 * campos de longitud conocida.
 */
const ANCHO = { corto: 'max-w-[260px]', medio: 'max-w-[420px]', largo: 'max-w-[640px]' } as const

function Campo({
  etiqueta,
  ayuda,
  contador,
  ancho = 'largo',
  children,
}: {
  etiqueta: string
  ayuda?: string | undefined
  contador?: string
  ancho?: keyof typeof ANCHO
  children: ReactNode
}) {
  // El rótulo envuelve al control: así casa por su nombre sin inventar ids para cada campo
  // de una lista que crece y encoge.
  return (
    <label className={`flex min-w-0 flex-col gap-2 ${ANCHO[ancho]}`}>
      <span className={`${LABEL_CLASS} flex justify-between gap-2`}>
        {etiqueta}
        {contador ? <span className="tracking-normal">{contador}</span> : null}
      </span>
      {children}
      {ayuda ? <span className="text-[12px] leading-[1.5] text-ink-mute">{ayuda}</span> : null}
    </label>
  )
}

function VersionRow({ version, actual, base }: { version: VersionView; actual: boolean; base: string }) {
  const t = useT()
  const [estado, restaurar, restaurando] = useActionState(sinCaerse(restoreSiteVersionAction), INICIAL)
  const bloques = [...new Set(version.campos.map((c) => traducir(BLOQUES[c]?.titulo ?? c, t)))]
  const queCambio = bloques.length > 0 ? bloques.join(' · ') : version.actorEmail === 'Valores iniciales' ? t('Punto de partida', 'Starting point') : t('Restauración', 'Restore')
  return (
    <li className="flex flex-col gap-2 border-t border-line-panel py-3 first:border-none">
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          {/* Qué se tocó, junto a la fecha: iba en una línea suelta bajo el botón y se leía como el
              encabezado de la versión siguiente (30 oct). */}
          <span className="text-[13px] text-ink">
            {version.fecha} · {queCambio}
          </span>
          <span className="truncate text-[12px] text-ink-mute">{version.actorEmail}</span>
        </span>
        {actual ? (
          <Pill tone="ok">{t('Actual', 'Current')}</Pill>
        ) : (
          <form action={restaurar}>
            <input name="versionId" type="hidden" value={version.id} />
            <input name="base" type="hidden" value={base} />
            <SubmitButton variant="default" pending={restaurando} pendingLabel={t('Restaurando…', 'Restoring…')}>{t('Restaurar', 'Restore')}</SubmitButton>
          </form>
        )}
      </div>
      {estado.status === 'error' ? (
        <PanelAlert tone="error">
          {estado.message}
          {estado.conflicto ? (
            <button className="ml-2 cursor-pointer font-medium underline" onClick={() => window.location.reload()} type="button">
              {t('Recargar', 'Reload')}
            </button>
          ) : null}
        </PanelAlert>
      ) : null}
    </li>
  )
}

/**
 * Un documento legal: si está publicado, dónde se ve, y el texto con su vista previa. Escribir
 * `## ` a mano sin ver el resultado obligaba a publicar para comprobarlo.
 */
function DocumentoLegal({
  nombre,
  ruta,
  idioma,
  texto,
  publicada,
  onTexto,
  onPublicar,
}: {
  nombre: string
  ruta: string
  idioma: Idioma
  texto: string
  publicada: boolean
  onTexto: (texto: string) => void
  onPublicar: (publicada: boolean) => void
}) {
  const t = useT()
  const [vista, setVista] = useState<'editar' | 'previa'>('editar')
  return (
    <div className="flex flex-col rounded-[14px] border border-line-panel bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-panel px-4 py-3">
        <span className="flex items-center gap-2.5">
          <span className="text-[14px] text-ink">{nombre}</span>
          <Pill tone={publicada ? 'ok' : 'pending'}>{publicada ? t('Publicada', 'Published') : t('Borrador', 'Draft')}</Pill>
          {publicada ? (
            <a className="text-[12px] text-gold-deep underline-offset-4 hover:underline" href={ruta} rel="noopener noreferrer" target="_blank">
              {t('Ver en la web', 'See on the website')}
            </a>
          ) : null}
        </span>
        <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-ink-soft max-[859px]:min-h-11">
          {t('Publicar en la web', 'Publish on the website')}
          <span className="relative inline-flex h-6 w-11">
            <input checked={publicada} className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0" onChange={(e) => onPublicar(e.target.checked)} role="switch" type="checkbox" />
            <span aria-hidden className="h-6 w-11 rounded-full bg-line-panel-strong transition-colors peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold" />
            <span aria-hidden className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 motion-reduce:transition-none" />
          </span>
        </label>
      </div>
      <div className="flex gap-1 px-4 pt-3" role="tablist">
        {(
          [
            ['editar', t('Editar', 'Edit')],
            ['previa', t('Vista previa', 'Preview')],
          ] as const
        ).map(([clave, rotulo]) => (
          <button
            aria-selected={vista === clave}
            className={`rounded-[var(--radius-pill)] px-3.5 py-1.5 text-[12px] transition-colors max-[859px]:min-h-11 ${vista === clave ? 'bg-ink text-white' : 'text-ink-soft hover:bg-bg-top'}`}
            key={clave}
            onClick={() => setVista(clave)}
            role="tab"
            type="button"
          >
            {rotulo}
          </button>
        ))}
      </div>
      <div className="p-4">
        {vista === 'editar' ? (
          <>
            <textarea
              aria-label={`${nombre} (${idioma})`}
              className={`${FIELD_CLASS} min-h-[260px] text-[13.5px] leading-[1.7]`}
              onChange={(e) => onTexto(e.target.value)}
              value={texto}
            />
            <p className="mt-2 text-[12px] text-ink-mute">
              {t('Una línea que empieza por', 'A line starting with')} <code className="font-codigo">## </code>{' '}
              {t('es un título. Deja una línea en blanco entre párrafos.', 'is a heading. Leave a blank line between paragraphs.')}
            </p>
          </>
        ) : (
          <div className="max-h-[420px] overflow-y-auto rounded-[12px] bg-bg-top/50 px-5 py-4">
            {texto.trim() === '' ? <p className="text-[13px] text-ink-mute">{t('Sin texto todavía.', 'No text yet.')}</p> : <LegalText texto={texto} />}
          </div>
        )}
      </div>
    </div>
  )
}
