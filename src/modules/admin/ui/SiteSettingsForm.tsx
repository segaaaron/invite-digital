'use client'

import { useActionState, useEffect, useState, type ReactNode } from 'react'
import { PanelCard } from '@/modules/shell/ui/cards'
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon } from '@/shared/design/ui/icons'
import { FIELD_CLASS, LABEL_CLASS, PanelAlert, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { enlaceWhatsapp, formatoWhatsapp } from '@/shared/whatsapp'
import { restoreSiteVersionAction, saveSiteSettingsAction, type SiteActionState } from '../actions'
import type { Bilingue, SiteSettings } from '../domain/site-settings'

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

const SECCIONES = [
  ['contacto', 'Contacto'],
  ['mensajes', 'Mensajes'],
  ['ubicacion', 'Ubicación'],
  ['redes', 'Redes'],
  ['pruebas', 'Pruebas sociales'],
  ['testimonios', 'Testimonios'],
  ['legal', 'Legal'],
  ['buscadores', 'Buscadores'],
  ['historial', 'Historial'],
] as const

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
export function SiteSettingsForm({ inicial, versiones }: { inicial: SiteSettings; versiones: readonly VersionView[] }) {
  const [datos, setDatos] = useState<SiteSettings>(inicial)
  const [idioma, setIdioma] = useState<Idioma>('es')
  const [estado, guardar, guardando] = useActionState(saveSiteSettingsAction, INICIAL)
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

  const tarjeta = (ancla: string, titulo: string, hijos: ReactNode, pie?: ReactNode) => (
    <section
      className={`scroll-mt-6 rounded-[18px] ${errorBloque?.ancla === ancla ? 'ring-2 ring-danger/50 ring-offset-2 ring-offset-bg' : ''}`}
      id={ancla}
    >
      <PanelCard title={titulo}>
        <div className="flex flex-col gap-4">
          {errorBloque?.ancla === ancla && estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}
          {hijos}
        </div>
        {pie}
      </PanelCard>
    </section>
  )

  const probar = enlaceWhatsapp(datos.whatsapp, datos.mensajes.general[idioma])

  return (
    <div className="flex flex-col gap-4.5 pb-24">
      {/* Índice de secciones y conmutador de idioma. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Secciones de La web" className="flex flex-wrap gap-1.5">
          {SECCIONES.map(([ancla, nombre]) => (
            <a
              className="rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-3 py-1.5 font-mono text-[9px] tracking-[0.22em] text-ink-soft uppercase hover:border-ink hover:text-ink"
              href={`#${ancla}`}
              key={ancla}
            >
              {nombre}
            </a>
          ))}
        </nav>
        <div aria-label="Idioma de los textos" className="inline-flex rounded-[var(--radius-pill)] border border-line-panel-strong bg-bg-raised p-1" role="group">
          {(['es', 'en'] as const).map((i) => (
            <button
              aria-pressed={idioma === i}
              className={`cursor-pointer rounded-[var(--radius-pill)] px-3.5 py-1.5 font-mono text-[10px] tracking-[0.25em] uppercase ${idioma === i ? 'bg-ink text-white' : 'text-ink-soft'}`}
              key={i}
              onClick={() => setIdioma(i)}
              type="button"
            >
              {i === 'es' ? 'Español' : 'Inglés'}
            </button>
          ))}
        </div>
      </div>

      {estado.status === 'error' ? (
        <PanelAlert tone="error">
          {errorBloque ? <strong className="font-medium">{errorBloque.titulo}: </strong> : null}
          {estado.message}
        </PanelAlert>
      ) : null}

      <div className="grid items-start gap-4.5 min-[1200px]:grid-cols-[minmax(0,1fr)_360px]">
        <form action={guardar} className="flex min-w-0 flex-col gap-4.5" id="form-web">
          <input name="datos" type="hidden" value={actual} />

          {tarjeta(
            'contacto',
            'Contacto',
            <>
              <Campo ayuda="Con el código de país. Un celular de Bolivia sin prefijo se completa con +591." etiqueta="WhatsApp del negocio">
                <input className={FIELD_CLASS} inputMode="tel" onChange={(e) => cambiar('whatsapp', e.target.value)} placeholder="+591 700 12345" value={datos.whatsapp} />
              </Campo>
              <div className="flex flex-wrap items-center gap-3">
                {probar === null ? (
                  <PanelButton disabled>Probar en WhatsApp</PanelButton>
                ) : (
                  <PanelButton external href={probar}>
                    Probar en WhatsApp
                  </PanelButton>
                )}
                <span className="text-[12px] text-ink-mute">
                  {probar === null
                    ? 'Sin número, los botones de contacto llevan al formulario de la web.'
                    : 'Ábrelo desde tu teléfono antes de guardar: es el enlace que pulsará el cliente.'}
                </span>
              </div>
              <Campo ayuda="Se enseña junto al WhatsApp. Un enlace que nadie contesta a tiempo resta confianza." etiqueta={`Horario de respuesta (${idioma === 'es' ? 'español' : 'inglés'})`}>
                <input className={FIELD_CLASS} onChange={(e) => cambiar('horario', bil(datos.horario, e.target.value))} placeholder="Respondemos de lunes a sábado, de 9 a 19 h" value={datos.horario[idioma]} />
              </Campo>
            </>,
          )}

          {tarjeta(
            'mensajes',
            'Mensajes de WhatsApp',
            <>
              <p className="text-[12px] leading-[1.6] text-ink-mute">
                El texto que ya viene escrito al abrir WhatsApp. Corto y natural, como lo escribiría un cliente.
              </p>
              <Campo etiqueta="Consulta general (contacto de la web)">
                <textarea className={`${FIELD_CLASS} min-h-[72px]`} onChange={(e) => cambiar('mensajes', { ...datos.mensajes, general: bil(datos.mensajes.general, e.target.value) })} value={datos.mensajes.general[idioma]} />
              </Campo>
              <Campo ayuda="{plan} y {precio} se sustituyen por el plan y su precio." etiqueta="Agendar el plan más alto">
                <textarea className={`${FIELD_CLASS} min-h-[72px]`} onChange={(e) => cambiar('mensajes', { ...datos.mensajes, plan: bil(datos.mensajes.plan, e.target.value) })} value={datos.mensajes.plan[idioma]} />
              </Campo>
              <Campo etiqueta="Soporte (ayuda del panel)">
                <textarea className={`${FIELD_CLASS} min-h-[72px]`} onChange={(e) => cambiar('mensajes', { ...datos.mensajes, soporte: bil(datos.mensajes.soporte, e.target.value) })} value={datos.mensajes.soporte[idioma]} />
              </Campo>
            </>,
          )}

          {tarjeta(
            'ubicacion',
            'Ubicación',
            <>
              <p className="text-[12px] leading-[1.6] text-ink-mute">
                Google compara estos datos con tu ficha y tus redes: escríbelos exactamente igual que allí.
              </p>
              <Campo ayuda="Opcional. Déjala vacía si no atiendes en un local." etiqueta="Dirección">
                <input className={FIELD_CLASS} onChange={(e) => cambiar('direccion', e.target.value)} placeholder="Av. América 123" value={datos.direccion} />
              </Campo>
              <div className="grid gap-4 min-[560px]:grid-cols-2">
                <Campo etiqueta="Ciudad">
                  <input className={FIELD_CLASS} onChange={(e) => cambiar('ciudad', e.target.value)} value={datos.ciudad} />
                </Campo>
                <Campo etiqueta="País">
                  <input className={FIELD_CLASS} onChange={(e) => cambiar('pais', e.target.value)} value={datos.pais} />
                </Campo>
              </div>
              <Campo etiqueta={`Cobertura (${idioma === 'es' ? 'español' : 'inglés'})`}>
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
              <p className="text-[12px] text-ink-mute">Vacías no aparecen. Salen en el pie y Google las usa para confirmar que el negocio es el mismo.</p>
            </>,
          )}

          {tarjeta(
            'pruebas',
            'Pruebas sociales',
            <>
              <PanelAlert tone="ok">
                Publica solo cifras y marcas que puedas respaldar. Una cifra inflada o una marca que no trabajó contigo resta más confianza de la que suma.
              </PanelAlert>
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink">
                <input checked={datos.cifras.visibles} onChange={(e) => cambiar('cifras', { ...datos.cifras, visibles: e.target.checked })} type="checkbox" />
                Publicar la franja de cifras en la portada
              </label>
              <div className="grid gap-3 min-[560px]:grid-cols-2">
                {datos.cifras.items.map((c, i) => (
                  <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2" key={i}>
                    <input
                      aria-label={`Cifra ${i + 1}`}
                      className={`${FIELD_CLASS} font-display text-[18px]`}
                      onChange={(e) => {
                        const items = [...datos.cifras.items] as [typeof c, typeof c, typeof c, typeof c]
                        items[i] = { ...c, valor: e.target.value }
                        cambiar('cifras', { ...datos.cifras, items })
                      }}
                      value={c.valor}
                    />
                    <input
                      aria-label={`Etiqueta de la cifra ${i + 1}`}
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
              <Campo ayuda="Una por línea. Vacío, la banda no aparece." etiqueta="Marcas que confían en ti">
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
              {datos.testimonios.length === 0 ? <p className="text-[13px] text-ink-mute">Sin testimonios, la sección no aparece en la portada.</p> : null}
              {datos.testimonios.map((t, i) => {
                const actualizar = (cambio: Partial<typeof t>) =>
                  cambiar(
                    'testimonios',
                    datos.testimonios.map((x, j) => (j === i ? { ...x, ...cambio } : x)),
                  )
                return (
                  <div className="flex flex-col gap-3 rounded-[14px] border border-line-panel bg-white p-4" key={i}>
                    <div className="flex items-center justify-between gap-3">
                      <Pill tone={t.confirmado ? 'ok' : 'pending'}>{t.confirmado ? 'Publicado' : 'Sin confirmar'}</Pill>
                      <PanelButton onClick={() => cambiar('testimonios', datos.testimonios.filter((_, j) => j !== i))} variant="danger">
                        Quitar
                      </PanelButton>
                    </div>
                    <div className="grid gap-3 min-[560px]:grid-cols-2">
                      <input aria-label="Autor" className={FIELD_CLASS} onChange={(e) => actualizar({ autor: e.target.value })} placeholder="Nombre" value={t.autor} />
                      <input aria-label="Rol" className={FIELD_CLASS} onChange={(e) => actualizar({ rol: bil(t.rol, e.target.value) })} placeholder="Wedding planner · Cochabamba" value={t.rol[idioma]} />
                    </div>
                    <textarea aria-label="Cita" className={`${FIELD_CLASS} min-h-[80px]`} onChange={(e) => actualizar({ cita: bil(t.cita, e.target.value) })} placeholder="Lo que dijo, con sus palabras" value={t.cita[idioma]} />
                    <input aria-label="Foto" className={FIELD_CLASS} onChange={(e) => actualizar({ foto: e.target.value })} placeholder="/site/testimonios/nombre.avif (opcional)" value={t.foto} />
                    <label className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-[1.5] text-ink-soft">
                      <input checked={t.confirmado} className="mt-0.5" onChange={(e) => actualizar({ confirmado: e.target.checked })} type="checkbox" />
                      Confirmo que es un cliente real, que lo dijo con estas palabras y que me dio permiso para publicarlo.
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
                + Añadir testimonio
              </PanelButton>
            </>,
          )}

          {tarjeta(
            'legal',
            'Textos legales',
            <>
              <p className="text-[12px] leading-[1.6] text-ink-mute">
                Una línea que empieza por <code className="font-mono">## </code> es un título; los párrafos van separados por una línea en blanco. El texto de partida es un borrador:
                revísalo antes de publicarlo. Publicada, la política se enlaza en el pie y bajo cada formulario que pide datos.
              </p>
              {(
                [
                  ['privacidad', 'Política de privacidad'],
                  ['terminos', 'Términos del servicio'],
                ] as const
              ).map(([clave, nombre]) => (
                <div className="flex flex-col gap-2.5" key={clave}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[14px] text-ink">{nombre}</span>
                    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-soft">
                      <input
                        checked={datos.legal[clave].publicada}
                        onChange={(e) => cambiar('legal', { ...datos.legal, [clave]: { ...datos.legal[clave], publicada: e.target.checked } })}
                        type="checkbox"
                      />
                      Publicada
                    </label>
                  </div>
                  <textarea
                    aria-label={`${nombre} (${idioma})`}
                    className={`${FIELD_CLASS} min-h-[220px] font-mono text-[12.5px] leading-[1.7]`}
                    onChange={(e) => cambiar('legal', { ...datos.legal, [clave]: { ...datos.legal[clave], [idioma]: e.target.value } })}
                    value={datos.legal[clave][idioma]}
                  />
                </div>
              ))}
            </>,
          )}

          {tarjeta(
            'buscadores',
            'Buscadores',
            <>
              <p className="text-[12px] leading-[1.6] text-ink-mute">Cómo aparece la web en Google. Vacío usa el texto de siempre.</p>
              {(
                [
                  ['inicio', 'Portada'],
                  ['colecciones', 'Colecciones'],
                ] as const
              ).map(([clave, nombre]) => {
                const s = datos.seo[clave]
                const poner = (cambio: Partial<typeof s>) => cambiar('seo', { ...datos.seo, [clave]: { ...s, ...cambio } })
                return (
                  <div className="flex flex-col gap-2.5" key={clave}>
                    <span className="text-[14px] text-ink">{nombre}</span>
                    <Campo contador={`${s.titulo[idioma].length}/70`} etiqueta="Título">
                      <input className={FIELD_CLASS} onChange={(e) => poner({ titulo: bil(s.titulo, e.target.value) })} value={s.titulo[idioma]} />
                    </Campo>
                    <Campo contador={`${s.descripcion[idioma].length}/170`} etiqueta="Descripción">
                      <textarea className={`${FIELD_CLASS} min-h-[72px]`} onChange={(e) => poner({ descripcion: bil(s.descripcion, e.target.value) })} value={s.descripcion[idioma]} />
                    </Campo>
                  </div>
                )
              })}
            </>,
          )}
        </form>

        {/* La vista previa: lo que verá quien entra en la web, con lo que está escrito ahora. */}
        <aside className="flex flex-col gap-4.5 min-[1200px]:sticky min-[1200px]:top-6">
          <PanelCard title="Así se ve">
            <div className="flex flex-col gap-4">
              <div className="rounded-[14px] border border-line-panel bg-white p-4">
                <p className={LABEL_CLASS}>Contacto</p>
                {datos.whatsapp.trim() === '' ? (
                  <p className="mt-2 text-[13px] text-ink-mute">Sin WhatsApp: se ve solo el formulario.</p>
                ) : (
                  <>
                    <p className="mt-2 flex items-center gap-2 text-[14px] text-ink">
                      <WhatsAppIcon className="text-gold-deep" /> WhatsApp {formatoWhatsapp(datos.whatsapp)}
                    </p>
                    {datos.horario[idioma] ? <p className="mt-1 pl-6 text-[12px] text-ink-mute">{datos.horario[idioma]}</p> : null}
                  </>
                )}
              </div>

              <div className="rounded-[14px] border border-line-panel bg-white p-4">
                <p className={LABEL_CLASS}>Pie de la web</p>
                <p className="mt-2 font-display text-[17px] text-gold-deep">Luxury Atelier</p>
                <p className="mt-1 text-[10px] tracking-[0.18em] text-ink-mute uppercase">
                  {[datos.direccion, datos.ciudad, datos.pais].filter(Boolean).join(', ')}
                  {datos.cobertura[idioma] ? ` · ${datos.cobertura[idioma]}` : ''}
                </p>
                <div className="mt-2 flex items-center gap-2 text-gold-deep">
                  {datos.redes.instagram ? <InstagramIcon /> : null}
                  {datos.redes.facebook ? <FacebookIcon /> : null}
                  {datos.redes.tiktok ? <TikTokIcon /> : null}
                  <span className="text-[10px] tracking-[0.18em] text-ink-mute uppercase">
                    {[datos.legal.privacidad.publicada ? 'Privacidad' : '', datos.legal.terminos.publicada ? 'Términos' : ''].filter(Boolean).join(' · ')}
                  </span>
                </div>
              </div>

              <div className="rounded-[14px] border border-line-panel bg-white p-4">
                <p className={LABEL_CLASS}>Portada</p>
                {datos.cifras.visibles ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {datos.cifras.items.map((c, i) => (
                      <div key={i}>
                        <p className="font-display text-[22px] leading-none text-gold-deep">{c.valor || '—'}</p>
                        <p className="mt-1 text-[9px] tracking-[0.15em] text-ink-mute uppercase">{c[idioma] || '—'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[13px] text-ink-mute">Franja de cifras oculta.</p>
                )}
                <p className="mt-3 text-[12px] text-ink-soft">
                  {datos.testimonios.filter((t) => t.confirmado).length} testimonio(s) publicado(s) ·{' '}
                  {datos.marcas.filter((m) => m.trim() !== '').length} marca(s)
                </p>
              </div>
            </div>
          </PanelCard>

          <section className="scroll-mt-6" id="historial">
            <PanelCard title="Historial">
              {versiones.length === 0 ? (
                <p className="text-[13px] text-ink-mute">Todavía no se ha guardado ningún cambio.</p>
              ) : (
                <ul className="flex flex-col">
                  {versiones.map((v, i) => (
                    <VersionRow actual={i === 0} key={v.id} version={v} />
                  ))}
                </ul>
              )}
            </PanelCard>
          </section>
        </aside>
      </div>

      {/* La barra de guardado, fija abajo: el formulario es largo y el botón tiene que estar
          a mano esté donde esté, junto al aviso de que hay cambios sin guardar. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line-panel bg-bg-raised/95 px-4.5 py-3 backdrop-blur min-[860px]:left-[240px]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
          <span aria-live="polite" className="text-[13px] text-ink-soft">
            {guardando ? 'Guardando…' : sucio ? 'Tienes cambios sin guardar.' : estado.status === 'success' ? estado.message : 'Todo guardado.'}
          </span>
          <span className="flex gap-2">
            <PanelButton disabled={!sucio || guardando} onClick={() => setDatos(JSON.parse(guardado.json) as SiteSettings)}>
              Descartar
            </PanelButton>
            <PanelButton disabled={!sucio || guardando} form="form-web" type="submit" variant="primary">
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </PanelButton>
          </span>
        </div>
      </div>
    </div>
  )
}

function Campo({ etiqueta, ayuda, contador, children }: { etiqueta: string; ayuda?: string; contador?: string; children: ReactNode }) {
  // El rótulo envuelve al control: así casa por su nombre sin inventar ids para cada campo
  // de una lista que crece y encoge.
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className={`${LABEL_CLASS} flex justify-between gap-2`}>
        {etiqueta}
        {contador ? <span className="tracking-normal">{contador}</span> : null}
      </span>
      {children}
      {ayuda ? <span className="text-[11px] leading-[1.5] text-ink-mute">{ayuda}</span> : null}
    </label>
  )
}

function VersionRow({ version, actual }: { version: VersionView; actual: boolean }) {
  const [estado, restaurar, restaurando] = useActionState(restoreSiteVersionAction, INICIAL)
  const bloques = [...new Set(version.campos.map((c) => BLOQUES[c]?.titulo ?? c))]
  return (
    <li className="flex flex-col gap-2 border-t border-line-panel py-3 first:border-none">
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="text-[13px] text-ink">{version.fecha}</span>
          <span className="truncate text-[11px] text-ink-mute">{version.actorEmail}</span>
        </span>
        {actual ? (
          <Pill tone="ok">Actual</Pill>
        ) : (
          <form action={restaurar}>
            <input name="versionId" type="hidden" value={version.id} />
            <PanelButton disabled={restaurando} type="submit">
              {restaurando ? 'Restaurando…' : 'Restaurar'}
            </PanelButton>
          </form>
        )}
      </div>
      <span className="text-[12px] text-ink-soft">{bloques.length === 0 ? 'Restauración' : bloques.join(' · ')}</span>
      {estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}
    </li>
  )
}
