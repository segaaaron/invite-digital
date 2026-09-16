import { notFound } from 'next/navigation'
import { admin, events, guests, plans } from '@/app/composition/container'
import { ResponsableYPlan } from '@/modules/admin/ui/ResponsableYPlan'
import { SoporteDeBoda } from '@/modules/admin/ui/SoporteDeBoda'
import { ClientSharePanel } from '@/modules/events/ui/ClientSharePanel'
import { ContentBlockForms } from '@/modules/events/ui/ContentBlockForms'
import { InvitacionEnVivo } from '@/modules/events/ui/InvitacionEnVivo'
import '@/modules/events/ui/themes/kit/keyframes.css'
import { DangerZone } from '@/modules/events/ui/DangerZone'
import { DoorStaff } from '@/modules/events/ui/DoorStaff'
import { EventClients } from '@/modules/events/ui/EventClients'
import { EventForm } from '@/modules/events/ui/EventForm'
import { PrivacyForm } from '@/modules/events/ui/PrivacyForm'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { anfitrionesDeCategoria } from '@/modules/events/ui/content-shapes'
import { canManageStaff, gestionaElEvento, isAdmin } from '@/modules/identity'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Configuración' }

export const dynamic = 'force-dynamic'

/**
 * La configuración del evento, vista propia como en la maqueta: los detalles a la
 * izquierda y la vista previa del enlace a la derecha.
 *
 * Estaba metida dentro del resumen y se alcanzaba por un ancla. La maqueta la trata como
 * una pantalla, y quien viene a cambiar la fecha no debería pasar por los contadores.
 */
export default async function ConfiguracionPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params

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

  // El contenido rico que pinta el diseño, y **qué secciones pinta**: pedirle un
  // itinerario a un diseño que no lo tiene es pedir trabajo que no se ve.
  const tema = themeFor(event.value.themeKey)
  // Contenido, fotografías y enlace compartido son del cliente: para el admin ni se leen.
  const contenido = esAdmin ? null : await events.contentFor(event.value.id, tema.defaultContent)

  // Lo que ya subió el atelier: las fotografías y, desde que la invitación puede sonar,
  // también el MP3. Va a las dos tarjetas: a la suya, para subirlo y verlo, y a la del
  // contenido, donde se elige desde el propio campo en vez de copiar un identificador de
  // una tarjeta y pegarlo en otra.
  const imagenes = (esAdmin ? [] : await events.media.list(event.value.id)).map((imagen) => ({
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

  const share = esAdmin ? null : await events.liveShare(event.value.id)
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

  return (
    <>
      <PanelHeader kicker="Evento" title={esAdmin ? 'Ficha del evento' : 'Configuración del evento'} />

      {/* El editor a la izquierda y la invitación a la derecha, dentro de un teléfono, que se
          vuelve a pintar al guardar cada bloque. El admin no ve el contenido: su ficha sigue en
          la rejilla de tarjetas de siempre. */}
      <div className={contenido === null ? 'grid gap-4.5 min-[900px]:grid-cols-[1.25fr_1fr]' : 'grid items-start gap-4.5 min-[1280px]:grid-cols-[minmax(0,1fr)_400px]'}>
        {contenido === null ? null : (
        <div className="flex min-w-0 flex-col gap-4.5">
        <PanelCard title={`Tu invitación · ${tema.label}`}>
          {/* En pantallas donde no cabe el teléfono al lado, se abre aparte. */}
          <p className="mb-4 min-[1280px]:hidden">
            <PanelButton href={`/panel/eventos/${event.value.slug}/vista-previa`}>Ver cómo queda</PanelButton>
          </p>
          <ContentBlockForms
            anfitriones={anfitrionesDeCategoria(tema.categorySlug)}
            content={contenido}
            ejemplo={tema.defaultContent}
            eventId={event.value.id}
            eventSlug={event.value.slug}
            pinta={tema.pinta}
            media={imagenes}
            sections={tema.sections}
          />
        </PanelCard>
        </div>
        )}

        {contenido === null ? null : (
          <aside className="hidden min-[1280px]:sticky min-[1280px]:top-6 min-[1280px]:row-span-6 min-[1280px]:block">
            <InvitacionEnVivo content={contenido} event={event.value} />
          </aside>
        )}

        {esDelAtelier ? (
          <PanelCard title="Detalles del evento">
            <div className="flex flex-col gap-6">
              <EventForm diseno={diseno} event={event.value} />
              <PrivacyForm contrasenaIncluida={contrasenaIncluida} eventId={event.value.id} eventSlug={event.value.slug} hasPassword={conContrasena} />
              <DangerZone eventId={event.value.id} eventSlug={event.value.slug} />
            </div>
          </PanelCard>
        ) : null}

        {puedeGestionarPersonal ? (
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

        {esAdmin ? (
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

        {puedeGestionarPersonal ? (
          <PanelCard title="Personal de puerta">
            <DoorStaff eventId={event.value.id} eventSlug={event.value.slug} members={personal} />
          </PanelCard>
        ) : null}

        {/* El enlace de solo lectura enseña invitados y confirmaciones: es del cliente. */}
        {share === null ? null : (
        <PanelCard title="Vista previa del enlace">
          <div className="flex flex-col gap-4">
            <p className="text-[12px] leading-[1.7] text-ink-soft">
              Así verán tus invitados la información básica del evento. El enlace de solo lectura es el que se comparte
              con el cliente; el de cada invitado se reparte desde la sección Invitados.
            </p>

            {/* La ficha de la maqueta: lo que el invitado ve antes de abrir nada. */}
            <div className="rounded-[14px] border border-line-panel bg-bg-raised p-5">
              <p className="font-display text-[22px] italic text-ink">{event.value.title}</p>
              <p className="mt-1.5 text-[12px] text-ink-soft">
                {new Date(`${event.value.eventDate}T00:00:00`).toLocaleDateString('es-BO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              {event.value.venue === null ? null : (
                <p className="mt-1 text-[12px] text-ink-soft">{event.value.venue}</p>
              )}
              <p className="mt-1.5 font-mono text-[11px] break-all text-ink-mute">{`/i/${event.value.slug}`}</p>
              <p className="mt-3">
                {conContrasena ? <Pill tone="pending">Protegida</Pill> : <Pill tone="ok">Pública</Pill>}
              </p>
            </div>
            <ClientSharePanel
              eventId={event.value.id}
              eventSlug={event.value.slug}
              live={
                isErr(share) || share.value === null
                  ? null
                  : { id: share.value.id, expiresAt: share.value.expiresAt.toISOString().slice(0, 10) }
              }
            />
          </div>
        </PanelCard>
        )}
      </div>
    </>
  )
}
