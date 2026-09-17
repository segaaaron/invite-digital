import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { events } from '@/app/composition/container'
import { tarjetaDeInvitacion } from '@/modules/events/domain/tarjeta-de-invitacion'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { portadaParaCompartir } from '@/modules/events/ui/themes/portada-para-compartir'
import { PALETTE } from '@/shared/design/palette'
import { isErr } from '@/shared/result'
import { resolveInvitation } from '../invitation'

const ANCHO = 1200
const ALTO = 630

// Satori solo lee TTF: las mismas de la imagen de la web.
const FUENTES = join(process.cwd(), 'src/shared/seo')
let fuentes: Promise<Array<{ name: string; data: Buffer; weight: 400 | 300; style: 'normal' }>> | null = null
const leerFuentes = () =>
  (fuentes ??= Promise.all([
    readFile(join(FUENTES, 'cormorant-garamond-400.ttf')).then((data) => ({ name: 'Cormorant', data, weight: 400 as const, style: 'normal' as const })),
    readFile(join(FUENTES, 'jost-300.ttf')).then((data) => ({ name: 'Jost', data, weight: 300 as const, style: 'normal' as const })),
  ]))

/**
 * La imagen que WhatsApp enseña al pegar el enlace de una invitación: la foto de la portada
 * —o la del diseño, si no hay— a sangre, con los nombres y la fecha encima.
 *
 * JPEG y no PNG: WhatsApp deja sin imagen las vistas previas pesadas, y una foto en PNG pasa de
 * medio mega. Con contraseña, solo el diseño y «Tienes una invitación».
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitacion = await resolveInvitation(token)
  if (isErr(invitacion)) return new Response('No encontrada', { status: 404 })
  const { event, group } = invitacion.value

  const protegida = (await events.passwordHashOf(event.id)) !== null
  const contenido = protegida ? {} : await events.contenidoParaInvitados(event.id, {})
  const tarjeta = tarjetaDeInvitacion({ evento: event, contenido, invitado: group.label, protegida })

  // La portada de la invitación comprada: la foto que subió el cliente para la portada o, si no,
  // el arte de portada del diseño. Los nombres del cliente van encima, como al abrirla.
  const id = protegida ? undefined : contenido.hero?.coverImageId
  const propia = id === undefined ? null : await events.media.read(id)
  const original =
    propia !== null && propia.eventId === event.id && propia.contentType.startsWith('image/')
      ? Buffer.from(propia.bytes)
      : await readFile(join(process.cwd(), 'public', portadaParaCompartir(themeFor(event.themeKey).key))).catch(() => null)

  const ALTO_PORTADA = 570
  const ANCHO_PORTADA = 380
  const [portada, desenfocada] =
    original === null
      ? [null, null]
      : await Promise.all([
          sharp(original).resize(ANCHO_PORTADA, ALTO_PORTADA, { fit: 'cover', position: 'centre' }).jpeg({ quality: 84 }).toBuffer(),
          sharp(original).resize(ANCHO, ALTO, { fit: 'cover' }).blur(28).modulate({ brightness: 0.55 }).jpeg({ quality: 70 }).toBuffer(),
        ])
  const uri = (b: Buffer | null) => (b === null ? null : `data:image/jpeg;base64,${b.toString('base64')}`)

  const tarjetaPng = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PALETTE.ink, position: 'relative' }}>
        {desenfocada === null ? null : (
          // eslint-disable-next-line @next/next/no-img-element -- satori: no hay optimizador aquí
          <img alt="" height={ALTO} src={uri(desenfocada)!} style={{ position: 'absolute', inset: 0 }} width={ANCHO} />
        )}
        <div style={{ display: 'flex', position: 'relative', width: ANCHO_PORTADA, height: ALTO_PORTADA, borderRadius: 26, overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.55)', border: '2px solid rgba(255,255,255,0.35)' }}>
          {portada === null ? null : (
            // eslint-disable-next-line @next/next/no-img-element -- satori
            <img alt="" height={ALTO_PORTADA} src={uri(portada)!} style={{ position: 'absolute', inset: 0 }} width={ANCHO_PORTADA} />
          )}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 300,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
              textAlign: 'center',
              padding: '0 24px 34px',
              color: 'white',
              background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 70%)',
            }}
          >
            {tarjeta.antetitulo === null ? null : (
              <div style={{ display: 'flex', fontFamily: 'Jost', fontSize: 16, letterSpacing: 6 }}>{tarjeta.antetitulo.toUpperCase()}</div>
            )}
            <div style={{ display: 'flex', fontFamily: 'Cormorant', fontSize: (tarjeta.nombres ?? tarjeta.titulo).length > 16 ? 48 : 64, lineHeight: 1.05, marginTop: 8 }}>
              {tarjeta.nombres ?? tarjeta.titulo}
            </div>
            <div style={{ display: 'flex', width: 70, height: 1, background: 'rgba(255,255,255,0.8)', margin: '14px 0' }} />
            <div style={{ display: 'flex', fontFamily: 'Jost', fontSize: 18 }}>{tarjeta.fecha ?? (event.locale === 'en' ? 'Tap to open it' : 'Toca para abrirla')}</div>
          </div>
        </div>
      </div>
    ),
    { width: ANCHO, height: ALTO, fonts: await leerFuentes() },
  )

  const jpeg = await sharp(Buffer.from(await tarjetaPng.arrayBuffer())).jpeg({ quality: 80, mozjpeg: true }).toBuffer()

  return new Response(new Uint8Array(jpeg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=300', 'X-Robots-Tag': 'noindex' },
  })
}
