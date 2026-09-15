import { notFound } from 'next/navigation'
import { events, guests, plans } from '@/app/composition/container'
import { ClientSharePanel } from '@/modules/events/ui/ClientSharePanel'
import { ContentBlockForms } from '@/modules/events/ui/ContentBlockForms'
import { EventMediaPanel } from '@/modules/events/ui/EventMediaPanel'
import { DangerZone } from '@/modules/events/ui/DangerZone'
import { DoorStaff } from '@/modules/events/ui/DoorStaff'
import { EventClients } from '@/modules/events/ui/EventClients'
import { EventForm } from '@/modules/events/ui/EventForm'
import { PrivacyForm } from '@/modules/events/ui/PrivacyForm'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { canManageStaff } from '@/modules/identity/domain/access'
import { requireSession } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
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
  const event = await events.getFor(actor, slug, { section: 'cliente' })
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
  const esDelAtelier = actor.role === 'admin' || (actor.role === 'atelier' && event.value.userId === actor.userId)

  // El contenido rico que pinta el diseño, y **qué secciones pinta**: pedirle un
  // itinerario a un diseño que no lo tiene es pedir trabajo que no se ve.
  const tema = themeFor(event.value.themeKey)
  const contenido = await events.contentFor(event.value.id, tema.defaultContent)

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

  const share = await events.liveShare(event.value.id)
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

  return (
    <>
      <PanelHeader kicker="Cuenta" meta={event.value.title} title="Configuración del evento" />

      <div className="grid gap-4.5 min-[900px]:grid-cols-[1.25fr_1fr]">
        <PanelCard title={`Contenido de la invitación · ${tema.label}`}>
          {/* Ver la invitación **de esta boda**, sin repartir un enlace ni contar una
              visita ajena en la analítica. El escaparate enseña el diseño con el contenido
              de muestra; esto enseña lo que se acaba de escribir. */}
          <p className="mb-4">
            <PanelButton href={`/panel/eventos/${event.value.slug}/vista-previa`}>Ver esta invitación</PanelButton>
          </p>
          <ContentBlockForms
            content={contenido}
            eventId={event.value.id}
            eventSlug={event.value.slug}
            media={imagenes}
            sections={tema.sections}
          />
        </PanelCard>

        {/* «y música» en el título, y no solo en el texto de dentro: la tarjeta se llamaba
            «Fotografías de la invitación» y nadie iba a buscar ahí dónde subir el MP3. */}
        <PanelCard title="Fotografías y música">
          <EventMediaPanel
            eventId={event.value.id}
            eventSlug={event.value.slug}
            items={imagenes}
          />
        </PanelCard>

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
            <EventClients eventId={event.value.id} eventSlug={event.value.slug} members={clientes} />
          </PanelCard>
        ) : null}

        {puedeGestionarPersonal ? (
          <PanelCard title="Personal de puerta">
            <DoorStaff eventId={event.value.id} eventSlug={event.value.slug} members={personal} />
          </PanelCard>
        ) : null}

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
      </div>
    </>
  )
}
