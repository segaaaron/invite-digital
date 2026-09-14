import { admin } from '@/app/composition/container'
import { ShowcaseMusicRow } from '@/modules/admin'
import { themeDefinitions } from '@/modules/events/ui/themes/registry'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Música de los modelos · Administración' }
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

  const musica = await admin.showcaseMusic()
  const modelos = themeDefinitions().filter((tema) => tema.key !== 'clasico')

  return (
    <>
      <PanelHeader
        kicker="Administración"
        meta="Lo que suena en los modelos de la web, no en las bodas"
        title="Música de los modelos"
      />

      <PanelCard>
        <div className="mb-5 flex flex-col gap-2.5">
          <p className="text-[13px] leading-[1.7] text-ink-soft">
            Cada modelo del catálogo pinta su reproductor desde el primer día. Sin un archivo detrás, el botón mueve las
            barras y no suena. Sube aquí un <strong className="font-normal text-ink">MP3</strong> y ese modelo sonará en{' '}
            <span className="font-mono text-[12px]">/modelos</span>.
          </p>
          <p className="text-[12px] leading-[1.7] text-ink-mute">
            Súbelo <strong className="font-normal text-ink-soft">ya recortado, de 30 a 60 segundos</strong> y hasta 3 MB:
            se guarda tal cual y es lo que va a descargar quien entre en la web. Y responde por lo que publiques — si la
            grabación tiene dueño, publicarla es cosa del atelier.
          </p>
        </div>

        {isErr(musica) ? (
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer la música de los modelos. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : (
          <ul className="flex flex-col">
            {modelos.map((tema) => (
              <ShowcaseMusicRow
                key={tema.key}
                label={tema.label}
                themeKey={tema.key}
                tieneMusica={(musica.value[tema.key] ?? '') !== ''}
              />
            ))}
          </ul>
        )}
      </PanelCard>
    </>
  )
}
