import { admin } from '@/app/composition/container'
import { ShowcaseMusicRow } from '@/modules/admin'
import { FIESTAS, fiestaDeCategoria, VOCABULARIO } from '@/modules/events'
import { themeDefinitions } from '@/modules/events/ui/themes/registry'
import { CATALOG_LISTOS, seAsigna } from '@/shared/design/theme-catalog'
import { Ayuda } from '@/shared/design/ui/panel/estados'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Modelos · Administración' }
export const dynamic = 'force-dynamic'

/**
 * La música de los modelos del escaparate.
 *
 * **No es la música de una boda.** Lo que suena en una invitación de verdad vive en
 * `event_media`, pertenece a ese evento y lo sube su atelier o su cliente desde
 * Configuración. Esto otro es la web pública: los dieciséis que cualquiera mira antes de
 * comprar, y de esos responde una sola persona.
 *
 * El clásico no sale: no se publica en el catálogo, es el respaldo de una clave
 * desconocida.
 */
export default async function AdminModelosPage() {
  await requireAdmin()

  const [musica, publicacion, canciones] = await Promise.all([admin.showcaseMusic(), admin.publication(), admin.showcaseSongs()])
  // Ni el clásico ni los retirados: un retirado no vuelve a la web desde aquí.
  const modelos = themeDefinitions().filter((tema) => seAsigna(tema.key))
  const fiestaDe = (clave: string) => fiestaDeCategoria(CATALOG_LISTOS.find((entrada) => entrada.key === clave)?.categorySlug ?? '')
  // Un grupo por fiesta, y solo los que tienen algún modelo: los cumpleaños son uno solo y
  // todavía sin publicar, así que el grupo aparece el día que existe.
  const grupos = FIESTAS.map((fiesta) => ({
    titulo: VOCABULARIO[fiesta].plural,
    temas: modelos.filter((tema) => fiestaDe(tema.key) === fiesta),
  })).filter((grupo) => grupo.temas.length > 0)

  return (
    <>
      <PanelHeader
        kicker="Administración"
        meta="Qué modelos vende la web y qué suena en cada uno"
        title="Modelos"
      />

      <PanelCard>
        <div className="mb-5 flex flex-col gap-2.5">
          <p className="text-[13px] leading-[1.7] text-ink-soft">Publica o retira cada modelo de la web y sube la canción que suena en su muestra.</p>
          <Ayuda>
            <p>
              Cada modelo pinta su reproductor desde el primer día; sin un archivo detrás, el botón mueve las barras y no
              suena. La canción que subas aquí suena en <span className="font-mono">/modelos</span>, no en las invitaciones
              de los clientes, que tienen la suya.
            </p>
            <p>
              Sube la canción entera, en MP3, M4A o WAV: se ajusta sola en un MP3 ligero y suena en bucle hasta que quien
              mira el modelo la pausa. Si la grabación tiene dueño, publicarla es responsabilidad del atelier.
            </p>
          </Ayuda>
        </div>

        {isErr(musica) || isErr(publicacion) ? (
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los modelos. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {grupos.map((grupo) => {
              const conMusica = grupo.temas.filter((tema) => (musica.value[tema.key] ?? '') !== '').length
              return (
                <section key={grupo.titulo}>
                  <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-line-panel pb-2">
                    <h2 className="font-display text-[24px] text-ink">{grupo.titulo}</h2>
                    <span className="font-mono text-[10px] tracking-[0.2em] text-ink-mute uppercase">
                      {conMusica} de {grupo.temas.length} con música
                    </span>
                  </div>
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
                    {grupo.temas.map((tema) => (
                      <ShowcaseMusicRow
                        key={tema.key}
                        coverSrc={`/templates/${tema.key}.avif`}
                        label={tema.label}
                        themeKey={tema.key}
                        cancion={canciones[tema.key] ?? null}
                        tieneMusica={(musica.value[tema.key] ?? '') !== ''}
                        // Sin fila en la base no sale en el catálogo: se lee como retirado.
                        publicado={publicacion.value[tema.key] ?? false}
                      />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </PanelCard>
    </>
  )
}
