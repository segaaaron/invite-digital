import { env } from '@/shared/config/env'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PlegableEnMovil } from '@/shared/design/ui/panel/PlegableEnMovil'
import { SegmentedTabs } from '@/shared/design/ui/panel/SegmentedTabs'
import { EyeIcon } from '@/shared/design/ui/icons'
import { admin, diseno as encargos, events, guests, orders, plans, rsvp } from '@/app/composition/container'
import { ResponsableYPlan } from '@/modules/admin/ui/ResponsableYPlan'
import { ResumenDelEvento } from '@/modules/admin/ui/ResumenDelEvento'
import { diasEntre, fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { saludDelEvento } from '@/modules/admin/domain/salud'
import { fiestaDeTema } from '@/modules/events'
import { diaDelEvento, faltaPara } from '@/shared/format/fecha'
import { SoporteDeBoda } from '@/modules/admin/ui/SoporteDeBoda'
import { ContentBlockForms } from '@/modules/events/ui/ContentBlockForms'
import { InvitacionEnVivo } from '@/modules/events/ui/InvitacionEnVivo'
import '@/modules/events/ui/themes/kit/keyframes.css'
import { DangerZone } from '@/modules/events/ui/DangerZone'
import { DoorStaff } from '@/modules/events/ui/DoorStaff'
import { EventClients } from '@/modules/events/ui/EventClients'
import { EventForm } from '@/modules/events/ui/EventForm'
import { PrivacyForm } from '@/modules/events/ui/PrivacyForm'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { fiestaDeCategoria } from '@/modules/events/domain/fiesta'
import { canManageStaff, gestionaElEvento, isAdmin, rolEnEquipo } from '@/modules/identity'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { NombreDelEvento } from '@/modules/events/ui/NombreDelEvento'
import { EncargoDelCliente } from '@/modules/events/ui/EncargoDelCliente'
import { PreguntasAlConfirmar } from '@/modules/rsvp/ui/PreguntasAlConfirmar'
import { SaveTheDateCard } from '@/modules/events/ui/SaveTheDateCard'
import { EstiloDelEventoCard } from '@/modules/events/ui/EstiloDelEventoCard'
import { acentosPara, CALIGRAFIAS, TITULARES } from '@/modules/events/domain/estilo'
import { hasFeature } from '@/modules/plans'
import { preguntasDelEncargo } from '@/modules/events'
import { FONT_VARIABLES } from '@/shared/design/font-manifest'
import { themeFonts } from '@/shared/design/fonts'
import { EncargoDelEquipo } from '@/modules/events/ui/EncargoDelEquipo'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr, isOk } from '@/shared/result'

/**
 * El título de la pestaña dice **qué evento** es: con varias fichas abiertas, «Configuración» en
 * todas no distinguía ninguna. Se lee con la misma guardia que la página: sin acceso, genérico.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const event = await events.getFor(actor, (await params).slug, { section: 'configuracion' })
  if (isErr(event)) return { title: 'Configuración' }
  return { title: isAdmin(actor) ? `${event.value.title} · Ficha` : `${event.value.title} · Mi invitación` }
}

export const dynamic = 'force-dynamic'

/**
 * La configuración del evento, vista propia como en la maqueta: los detalles a la
 * izquierda y la vista previa del enlace a la derecha.
 *
 * Estaba metida dentro del resumen y se alcanzaba por un ancla. La maqueta la trata como
 * una pantalla, y quien viene a cambiar la fecha no debería pasar por los contadores.
 */
export default async function ConfiguracionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ vista?: string; ver?: string }>
}) {
  const actor = await requireSession()
  const { slug } = await params
  // El admin escribe la invitación del cliente en `?vista=invitacion`: el editor solo, sin la ficha.
  const escribiendo = (await searchParams).vista === 'invitacion'
  // **En el celular y la tableta, «Editar | Ver cómo queda»** (7 de octubre): el teléfono de la vista previa no
  // cabe al lado del editor por debajo de 1280 px. En la URL, como todo el estado del panel: guardar remonta.
  const viendo = (await searchParams).ver === '1'

  /**
   * `'cliente'` fijo, **nunca `sectionForRole(actor.role)`**.
   *
   * La sección es una propiedad de **la página**, no de quien llama. Derivarla del actor
   * significa «seas lo que seas, esta es tu sección, adelante», y con eso el personal de
   * puerta —cuya sección es `checkin`— pasó a abrir esta pantalla: los datos del evento,
   * la contraseña de privacidad y el botón de borrar. Lo cazó `puerta.spec.ts`, no el
   * typecheck.
   *
   * Pidiéndola fija, cada quien entra por su propio motivo: el admin por ser admin, el
   * atelier por ser dueño, el cliente por su pertenencia, y la puerta rebota.
   */
  const event = await events.getFor(actor, slug, { section: 'configuracion' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  /**
   * Qué tarjetas son del atelier y no del cliente.
   *
   * `EventForm` lleva dentro el selector de **diseño**, el `slug` y el estado: cambiarlos
   * es cambiarle el modelo que se le vendió, romper los enlaces ya repartidos o devolver la
   * boda a borrador. `PrivacyForm` abre y cierra la invitación entera, y `DangerZone` la
   * borra.
   *
   * Esconderlas es cortesía; el corte de verdad son las guardas de sus acciones, que siguen
   * pidiendo `full`. Pero enseñar un botón que va a rebotar es peor que no enseñarlo.
   */
  // Dueño o admin: quien entra por pertenencia —anfitrión, co-anfitrión, planner— no.
  const esDelAtelier = gestionaElEvento(actor, event.value)
  const esAdmin = isAdmin(actor)
  // El diseño por encargo, si lo hay: el cliente ve sus pasos; el equipo, el estado y las rondas.
  const encargo = await encargos.leer(event.value.id)
  // Aprobar y pedir cambios gastan rondas: los decide quien compró (sección `equipo`), no su planner.
  const decideElEncargo =
    encargo !== null && (esDelAtelier || rolEnEquipo(await events.staff.de(actor, event.value.id)) === 'anfitrion')

  // El contenido rico que pinta el diseño, y **qué secciones pinta**: pedirle un
  // itinerario a un diseño que no lo tiene es pedir trabajo que no se ve.
  const tema = themeFor(event.value.themeKey)
  // Contenido y fotografías: el admin también los escribe (servicio hecho por nosotros, sección
  // `invitacion`, con registro). El cronograma no: es del planner del cliente.
  //
  // **Lo que aún no se ha escrito se ve con el ejemplo del modelo.** Es una vista previa: con
  // la fila vacía —como nacen los eventos— se quedaba en blanco y no se veía el diseño, y al
  // abrir una sección la invitación no saltaba a ella porque buscaba su texto y no había
  // ninguno. Lo que reparte a los invitados sigue siendo lo escrito, tal cual.
  // **El editor enseña lo escrito; la vista previa, lo escrito con el ejemplo debajo.** Son
  // dos lecturas y no una: rellenar los campos del formulario con la muestra haría que el
  // cliente publicara «El Bar de Miki» con solo pulsar Guardar sin mirar.
  const contenido = await events.contenidoEscrito(event.value.id)
  const contenidoDeLaVistaPrevia = await events.contenidoParaVistaPrevia(event.value.id, tema.defaultContent, event.value.eventDate)
  const conCronograma = !esAdmin && isOk(await plans.requireFeature(event.value.id, 'plannerCompleto'))

  // Lo que ya subió el atelier: las fotografías y, desde que la invitación puede sonar,
  // también el MP3. Va a las dos tarjetas: a la suya, para subirlo y verlo, y a la del
  // contenido, donde se elige desde el propio campo en vez de copiar un identificador de
  // una tarjeta y pegarlo en otra.
  const imagenes = (await events.media.list(event.value.id)).map((imagen) => ({
    id: imagen.id,
    originalName: imagen.originalName,
    byteSize: imagen.byteSize,
    // Qué es. Sin esto el campo de música ofrecería fotografías y los de imagen, la
    // canción: las dos cosas viven en la misma tabla.
    contentType: imagen.contentType,
    // De quién es: el atelier tiene que poder distinguir su retrato de la novia de las
    // treinta fotos que trajeron los invitados durante la fiesta, sobre todo cuando elige
    // cuál va en la portada.
    fromGuest: imagen.uploadedByGroupId !== null,
  }))

  const conContrasena = (await events.passwordHashOf(event.value.id)) !== null
  // Si el plan trae la contraseña. Una lectura fallida no la concede.
  const capacidad = await plans.allowanceFor(event.value.id)
  const contrasenaIncluida = !isErr(capacidad) && capacidad.value.eventPassword
  // El modelo lo cambia el plan; el admin, siempre. La misma regla la aplica `updateEventAction`.
  const diseno = await (async (): Promise<{ fijo: string } | undefined> => {
    if (actor.role === 'admin') return undefined
    if (isErr(capacidad)) return { fijo: 'No pudimos leer tu plan: el modelo se queda como está.' }
    if (capacidad.value.designChange === 'ninguno') return { fijo: 'Tu plan no incluye cambiar de modelo.' }
    if (capacidad.value.designChange === 'siempre') return undefined
    const grupos = await guests.list(event.value.id)
    if (isErr(grupos) || grupos.value.some((g) => g.invitationSentAt !== null)) {
      return { fijo: 'El modelo ya no cambia: ya salieron invitaciones. Cambiarlo ahora confundiría a quien ya la vio.' }
    }
    return undefined
  })()

  // El personal de puerta y el cliente los gestiona **solo el admin**: dar de alta crea
  // una cuenta y le manda credenciales. Para cualquier otro, las dos tarjetas no se
  // pintan — y esconderlas no es la protección, que vive en la acción.
  const puedeGestionarPersonal = canManageStaff(actor)
  const personal = puedeGestionarPersonal ? await events.staff.listWithEmail(event.value.id, 'puerta') : []
  const clientes = puedeGestionarPersonal ? await events.staff.listWithEmail(event.value.id, 'cliente') : []
  // Lo que solo cambia el admin: responsable, plan y restablecer el acceso del cliente. Vivían
  // plegados en la cartera, repetidos con lo de aquí; la ficha es el único sitio.
  const [usuarios, opcionesDePlan, anfitriones] = esAdmin
    ? await Promise.all([admin.users(), admin.planOptions(), events.staff.hostsOf([event.value.id])])
    : [null, [], null]
  const responsables = usuarios === null || isErr(usuarios) ? [] : usuarios.value.filter((u) => u.role === 'atelier' || u.role === 'admin')

  // **La ficha del admin**: el resumen arriba —fiesta, fecha, salud, cliente— y cada bloque con su
  // entrada en un índice fijo al lado. Era una columna de tarjetas donde guardar quedaba muy abajo.
  if (esAdmin && !escribiendo) {
    const hostsDelEvento = anfitriones?.get(event.value.id) ?? []
    // La fila del evento con sus cifras, la misma que usa la cartera: así la salud dice lo mismo aquí y allí.
    const todos = await admin.events()
    const fila = isErr(todos) ? undefined : todos.value.find((e) => e.id === event.value.id)
    const hoy = fechaEnBolivia(new Date())
    // En el celular y la tableta en vertical, las secciones largas de la ficha se pliegan: era una página de 5.700 px.
    const seccion = (titulo: string, contenido: ReactNode) => (
      <PlegableEnMovil titulo={titulo}>
        <PanelCard title={titulo}>{contenido}</PanelCard>
      </PlegableEnMovil>
    )
    const secciones = [
      { id: 'diseno', titulo: 'Diseño por encargo' },
      { id: 'invitacion', titulo: 'Invitación' },
      { id: 'datos', titulo: 'Datos y diseño' },
      { id: 'acceso', titulo: 'Acceso del cliente' },
      { id: 'plan', titulo: 'Plan y responsable' },
      ...(personal.length > 0 ? [{ id: 'puerta', titulo: 'Personal de puerta' }] : []),
      { id: 'riesgo', titulo: 'Zona de riesgo' },
    ]
    return (
      <>
        {/* En el celular el nombre ya va en la cabecera de la carcasa, con volver. */}
        <div className="max-[859px]:hidden">
          <PanelHeader kicker="Evento" title={event.value.title} />
        </div>
        <ResumenDelEvento
          anfitriones={hostsDelEvento}
          confirmaciones={fila === undefined ? null : { respondidos: fila.respondidos, grupos: fila.grupos }}
          cuando={faltaPara(diasEntre(hoy, event.value.eventDate))}
          eventId={event.value.id}
          fecha={diaDelEvento(event.value.eventDate)}
          fiesta={fiestaDeTema(event.value.themeKey)}
          planNombre={isErr(capacidad) ? null : (opcionesDePlan.find((p) => p.slug === capacidad.value.planSlug)?.nombre ?? null)}
          salud={fila === undefined ? null : saludDelEvento({ ...fila, fiesta: fiestaDeTema(fila.themeKey) }, hoy)}
          slug={event.value.slug}
          tema={themeFor(event.value.themeKey).key === event.value.themeKey ? tema.label : 'Un diseño retirado'}
        />
        <div className="grid items-start gap-6 min-[1100px]:grid-cols-[190px_minmax(0,1fr)]">
          <nav aria-label="Secciones de la ficha" className="hidden min-[1100px]:sticky min-[1100px]:top-24 min-[1100px]:block">
            <ul className="flex flex-col gap-0.5 border-l border-line-panel">
              {secciones.map((sec) => (
                <li key={sec.id}>
                  <a className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-[13px] text-ink-soft transition-colors hover:border-ink hover:text-ink" href={`#${sec.id}`}>
                    {sec.titulo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex min-w-0 flex-col gap-4.5">
            <section className="scroll-mt-24" id="diseno">
              <PanelCard title="Diseño por encargo">
                <EncargoDelEquipo
                  encargo={encargo}
                  escribir={`/panel/eventos/${event.value.slug}/configuracion?vista=invitacion`}
                  eventId={event.value.id}
                  hoy={hoy}
                  rondas={encargo === null ? [] : await encargos.rondas(event.value.id)}
                />
              </PanelCard>
            </section>
            <section className="scroll-mt-24" id="invitacion">
              <PanelCard title="Invitación">
                <div className="flex flex-col items-start gap-3">
                  <p className="text-[13px] text-ink-soft">
                    Escribe sus textos, fotos y canción como lo haría el cliente, sin entrar como él. Cada guardado queda en la auditoría.
                  </p>
                  <PanelButton href={`/panel/eventos/${event.value.slug}/configuracion?vista=invitacion`} variant="primary">
                    Escribir la invitación
                  </PanelButton>
                </div>
              </PanelCard>
            </section>
            <section className="scroll-mt-24" id="datos">
              {seccion(
                'Datos y diseño',
                <div className="flex flex-col gap-6">
                  <EventForm diseno={diseno} event={event.value} />
                  <PrivacyForm contrasenaIncluida={contrasenaIncluida} eventId={event.value.id} eventSlug={event.value.slug} hasPassword={conContrasena} />
                </div>,
              )}
            </section>
            <section className="scroll-mt-24" id="acceso">
              {seccion(
                'Acceso del cliente',
                <div className="flex flex-col gap-5">
                  <EventClients eventId={event.value.id} eventSlug={event.value.slug} members={clientes} />
                  <div className="border-t border-line-panel pt-4">
                    <SoporteDeBoda anfitriones={hostsDelEvento} eventId={event.value.id} />
                  </div>
                </div>,
              )}
            </section>
            <section className="scroll-mt-24" id="plan">
              {seccion(
                'Plan y responsable',
                <ResponsableYPlan
                  eventId={event.value.id}
                  eventSlug={event.value.slug}
                  ownerId={event.value.userId}
                  owners={responsables.map((u) => ({ id: u.id, email: u.email }))}
                  planSlug={isErr(capacidad) ? null : capacidad.value.planSlug}
                  plans={opcionesDePlan.map((p) => ({ slug: p.slug, nombre: p.nombre }))}
                />,
              )}
            </section>
            {personal.length > 0 ? (
              <section className="scroll-mt-24" id="puerta">
                {seccion('Personal de puerta', <DoorStaff eventId={event.value.id} eventSlug={event.value.slug} members={personal} />)}
              </section>
            ) : null}
            <section className="scroll-mt-24" id="riesgo">
              <PlegableEnMovil titulo="Zona de riesgo">
                <DangerZone eventId={event.value.id} eventSlug={event.value.slug} />
              </PlegableEnMovil>
            </section>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PanelHeader
        actions={
          <>
            {escribiendo ? <PanelButton href={`/panel/eventos/${event.value.slug}/configuracion`}>Volver a la ficha</PanelButton> : null}
            {/* Verla entera, como la abrirá un invitado: el botón principal de la pantalla, no solo el
                «Pantalla completa» pequeño junto al teléfono, que no se veía (7 de octubre). */}
            {contenido === null ? null : (
              <PanelButton href={`/panel/eventos/${event.value.slug}/vista-previa`} variant="primary">
                <EyeIcon className="size-4" /> Ver mi invitación
              </PanelButton>
            )}
          </>
        }
        kicker={escribiendo ? `Invitación de ${event.value.title}` : 'Evento'}
        meta="Completa cada sección y mira cómo queda en la vista previa. Se guarda sección por sección."
        title={escribiendo || !esDelAtelier ? 'Personalizar invitación' : 'Configuración del evento'}
      />

      {contenido === null ? null : (
        <div className="sticky top-[calc(env(safe-area-inset-top)+64px)] z-20 mb-4 flex justify-center min-[860px]:top-20 min-[1280px]:hidden">
          <SegmentedTabs
            current={viendo ? 'ver' : 'editar'}
            label="Editar o ver la invitación"
            segments={(() => {
              const base = `/panel/eventos/${event.value.slug}/configuracion${escribiendo ? '?vista=invitacion' : ''}`
              return [
                { key: 'editar', label: 'Editar', href: base },
                { key: 'ver', label: 'Ver cómo queda', href: `${base}${escribiendo ? '&' : '?'}ver=1` },
              ]
            })()}
          />
        </div>
      )}

      {/* El editor a la izquierda y la invitación a la derecha, dentro de un teléfono, que se
          vuelve a pintar al guardar cada bloque. El admin no ve el contenido: su ficha sigue en
          la rejilla de tarjetas de siempre. */}
      <div className={contenido === null ? 'grid items-start gap-4.5 min-[1100px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]' : 'grid items-start gap-4.5 min-[1280px]:grid-cols-[minmax(0,1fr)_400px]'}>
        {contenido === null ? null : (
        <div className={`flex min-w-0 flex-col gap-4.5 ${viendo ? 'max-[1279px]:hidden' : ''}`}>
        {encargo === null || esAdmin ? null : (
          <PanelCard title="Tu invitación, paso a paso">
            <EncargoDelCliente
              decide={decideElEncargo}
              encargo={encargo}
              eventId={event.value.id}
              extras={`/panel/eventos/${event.value.slug}/extras`}
              preguntas={
                isErr(capacidad)
                  ? []
                  : preguntasDelEncargo({ estilo: hasFeature(capacidad.value, 'estilo'), creadoParaTi: hasFeature(capacidad.value, 'plannerTotal') })
              }
              saldoPendiente={encargo.estado === 'aprobada' && (await orders.saldoPendienteDe(event.value.id))}
              vistaPrevia={`/panel/eventos/${event.value.slug}/vista-previa`}
            />
          </PanelCard>
        )}
        <PanelCard title={`Tu invitación · ${tema.label}`}>
          <ContentBlockForms
            fiesta={fiestaDeCategoria(tema.categorySlug)}
            temaKey={tema.key}
            {...(conCronograma ? { itinerarioDesde: `/panel/eventos/${event.value.slug}/planner/cronograma` } : {})}
            content={contenido}
            ejemplo={tema.defaultContent}
            eventId={event.value.id}
            eventSlug={event.value.slug}
            pinta={tema.pinta}
            media={imagenes}
            sections={tema.sections}
          />
        </PanelCard>
        {esDelAtelier ? null : (
          <PanelCard title="Nombre del evento">
            <NombreDelEvento eventId={event.value.id} title={event.value.title} />
          </PanelCard>
        )}
        {tema.estilo === undefined ? null : (
          <PanelCard title="Colores y letra">
            <EstiloDelEventoCard
              acentoDelDiseno={tema.estilo.acento?.principal ?? null}
              acentos={tema.estilo.acento === undefined ? [] : acentosPara(tema.estilo.acento)}
              caligrafias={tema.estilo.caligrafia === undefined ? [] : CALIGRAFIAS.filter((c) => c.clave !== tema.estilo?.caligrafia).map((c) => ({ ...c, clase: themeFonts[c.clave].variable, familia: `var(${FONT_VARIABLES[c.clave]})` }))}
              disponible={esAdmin || (!isErr(capacidad) && hasFeature(capacidad.value, 'estilo'))}
              estilo={await events.estilo.leer(event.value.id)}
              eventId={event.value.id}
              eventSlug={event.value.slug}
              mejorar={esDelAtelier ? { href: `/panel/eventos/${event.value.slug}/plan`, label: 'Ver planes' } : null}
              titulares={tema.estilo.titulares === undefined ? [] : TITULARES.filter((c) => c.clave !== tema.estilo?.titulares).map((c) => ({ ...c, clase: themeFonts[c.clave].variable, familia: `var(${FONT_VARIABLES[c.clave]})` }))}
            />
          </PanelCard>
        )}
        <PanelCard title="Save the date">
          <SaveTheDateCard
            disponible={esAdmin || (await events.saveTheDate.comprado(event.value.id))}
            eventId={event.value.id}
            eventSlug={event.value.slug}
            extras={`/panel/eventos/${event.value.slug}/extras`}
            url={await (async () => {
              const token = await events.saveTheDate.leer(event.value.id)
              return token === null ? null : `${env.SITE_URL.replace(/\/+$/, '')}/guarda/${token}`
            })()}
          />
        </PanelCard>
        {esAdmin ? null : (
          <PanelCard title="Preguntas al confirmar">
            <PreguntasAlConfirmar eventId={event.value.id} eventSlug={event.value.slug} preguntas={await rsvp.preguntas.leer(event.value.id)} />
          </PanelCard>
        )}
        </div>
        )}

        {contenido === null ? null : (
          <aside className={`min-[1280px]:sticky min-[1280px]:top-6 min-[1280px]:row-span-6 min-[1280px]:block ${viendo ? '' : 'hidden'}`}>
            <InvitacionEnVivo content={contenidoDeLaVistaPrevia ?? {}} estilo={await events.estilo.leer(event.value.id)} event={event.value} />
          </aside>
        )}

        {esDelAtelier && !escribiendo && !viendo ? (
          <PanelCard title="Detalles del evento">
            <div className="flex flex-col gap-6">
              <EventForm diseno={diseno} event={event.value} />
              <PrivacyForm contrasenaIncluida={contrasenaIncluida} eventId={event.value.id} eventSlug={event.value.slug} hasPassword={conContrasena} />
            </div>
          </PanelCard>
        ) : null}

        {/* Lo demás en una columna propia: en la rejilla, la tarjeta de al lado de «Detalles»
            —que es muy alta por el selector de diseños— se estiraba en blanco hasta su altura. */}
        <div className={`flex min-w-0 flex-col gap-4.5 ${viendo ? 'max-[1279px]:hidden' : ''}`}>
        {puedeGestionarPersonal && !escribiendo ? (
          <PanelCard title="Acceso del cliente">
            <div className="flex flex-col gap-5">
              <EventClients eventId={event.value.id} eventSlug={event.value.slug} members={clientes} />
              {esAdmin ? (
                <div className="border-t border-line-panel pt-4">
                  <SoporteDeBoda anfitriones={anfitriones?.get(event.value.id) ?? []} eventId={event.value.id} />
                </div>
              ) : null}
            </div>
          </PanelCard>
        ) : null}

        {esAdmin && !escribiendo ? (
          <PanelCard title="Plan y responsable">
            <ResponsableYPlan
              eventId={event.value.id}
              eventSlug={event.value.slug}
              ownerId={event.value.userId}
              owners={responsables.map((u) => ({ id: u.id, email: u.email }))}
              planSlug={isErr(capacidad) ? null : capacidad.value.planSlug}
              plans={opcionesDePlan.map((p) => ({ slug: p.slug, nombre: p.nombre }))}
            />
          </PanelCard>
        ) : null}

        {puedeGestionarPersonal && personal.length > 0 && !escribiendo ? (
          <PanelCard title="Personal de puerta">
            <DoorStaff eventId={event.value.id} eventSlug={event.value.slug} members={personal} />
          </PanelCard>
        ) : null}

        {/* Borrar va lo último: es lo irreversible, y estaba en medio de la ficha. */}
        {esDelAtelier && !escribiendo ? <DangerZone eventId={event.value.id} eventSlug={event.value.slug} /> : null}
        </div>

      </div>
    </>
  )
}
