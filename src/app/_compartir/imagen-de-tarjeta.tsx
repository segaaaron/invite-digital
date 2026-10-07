import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import type { TarjetaDeInvitacion } from '@/modules/events/domain/tarjeta-de-invitacion'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { medallonDeCompartir, portadaParaCompartir } from '@/modules/events/ui/themes/portada-para-compartir'
import { PALETTE } from '@/shared/design/palette'
import { CATALOG_ENTRIES } from '@/shared/design/theme-catalog'
import { getDictionary } from '@/shared/i18n/dictionaries'

const ANCHO = 1200
const ALTO = 630

// Satori solo lee TTF: las mismas de la imagen de la web.
const FUENTES = join(process.cwd(), 'src/shared/seo')
let fuentes: Promise<Array<{ name: string; data: Buffer; weight: 400 | 300 | 700; style: 'normal' }>> | null = null
const leerFuentes = () =>
  (fuentes ??= Promise.all([
    readFile(join(FUENTES, 'cormorant-garamond-400.ttf')).then((data) => ({ name: 'Cormorant', data, weight: 400 as const, style: 'normal' as const })),
    readFile(join(FUENTES, 'jost-300.ttf')).then((data) => ({ name: 'Jost', data, weight: 300 as const, style: 'normal' as const })),
    // Para el nombre dentro del medallón: es la misma que rotula la portada al abrirla.
    readFile(join(FUENTES, 'cinzel-700.ttf')).then((data) => ({ name: 'Cinzel', data, weight: 700 as const, style: 'normal' as const })),
  ]))

/** Si un color de fondo es oscuro: decide si los textos van en marfil o en tinta. */
const esOscuro = (hex: string): boolean => {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140
}

/**
 * La imagen de vista previa (1200×630, JPEG) de un enlace de evento. La usan la invitación
 * (`/i/<token>/imagen`) y el save the date (`/guarda/<token>/imagen`).
 *
 * **Sin desenfoque y sin nada escrito sobre el arte** (6 de octubre): antes la portada iba sobre
 * sí misma ampliada y borrosa, con los nombres y la fecha encima, y en los carteles que ya traen
 * letras («Femme Fatale») se leían encimadas. Ahora la portada va entera y nítida al centro, sobre
 * el color del propio diseño, con los nombres a la izquierda y la fecha a la derecha. Al centro y
 * sola porque WhatsApp recorta a cuadrado las miniaturas pequeñas: ahí queda la portada limpia.
 * La única excepción es el medallón de «Cervecería Vintage», que espera el nombre dentro.
 *
 * JPEG y no PNG: WhatsApp deja sin imagen las vistas previas pesadas.
 */
export async function imagenDeTarjeta(event: { readonly themeKey: string; readonly locale: 'es' | 'en' }, tarjeta: TarjetaDeInvitacion): Promise<Response> {
  const clave = themeFor(event.themeKey).key
  const original = await readFile(join(process.cwd(), 'public', portadaParaCompartir(clave))).catch(() => null)

  /** El hueco del arte donde va rotulado el nombre, para el diseño cuyo arte lo tiene (hoy «Cervecería Vintage»). */
  const hueco = medallonDeCompartir(clave)

  // Los colores del diseño (los de su tarjeta del catálogo): el fondo y el filete.
  const colores = CATALOG_ENTRIES.find((entrada) => entrada.key === clave)?.palette ?? { base: PALETTE.ink, accent: PALETTE.gold }
  const oscuro = esOscuro(colores.base)
  const tinta = oscuro ? PALETTE.bgRaised : PALETTE.ink
  const tintaSuave = oscuro ? PALETTE.bgSunken : PALETTE.inkSoft

  // La portada, casi a toda la altura y con la proporción de su arte (2:3 por defecto).
  const ALTO_PORTADA = 570
  const ANCHO_PORTADA = hueco === null ? 380 : Math.round((ALTO_PORTADA * hueco.arte.ancho) / hueco.arte.alto)
  const portada = original === null ? null : await sharp(original).resize(ANCHO_PORTADA, ALTO_PORTADA, { fit: 'cover', position: 'centre' }).jpeg({ quality: 88 }).toBuffer()
  const uri = (b: Buffer | null) => (b === null ? null : `data:image/jpeg;base64,${b.toString('base64')}`)

  /**
   * El nombre dentro del medallón. Las coordenadas son del arte, así que hay que llevarlas a
   * la miniatura: entra con `fit: cover` y `position: centre`, o sea escalada por el lado que
   * manda y recortada por igual a los dos lados del otro (con la proporción del arte, cero).
   */
  const rotulo = hueco === null || tarjeta.nombres === null ? null : (() => {
    const escala = Math.max(ANCHO_PORTADA / hueco.arte.ancho, ALTO_PORTADA / hueco.arte.alto)
    const centro = {
      x: hueco.x * escala - (hueco.arte.ancho * escala - ANCHO_PORTADA) / 2,
      y: hueco.y * escala - (hueco.arte.alto * escala - ALTO_PORTADA) / 2,
    }
    const ancho = hueco.ancho * escala
    const letras = Math.max(tarjeta.nombres.trim().length, 1)
    // 0,68 em es el ancho medio de una mayúscula de Cinzel, medido en el propio fichero.
    const tamano = Math.min(46, Math.round(ancho / (0.68 * letras)))
    return { texto: tarjeta.nombres.trim().toUpperCase(), tamano, centro }
  })()

  // Los dos lados: quién, a la izquierda; cuándo, a la derecha. La fecha llega como
  // «sábado, 17 de octubre de 2026 · 18:00» y se parte en día y hora.
  const nombres = tarjeta.nombres ?? tarjeta.titulo
  const [dia = '', hora = ''] = (tarjeta.fecha ?? '').split(' · ')
  const LADO = Math.floor((ANCHO - ANCHO_PORTADA) / 2) - 56
  const filete = <div style={{ display: 'flex', width: 54, height: 1, background: colores.accent, margin: '18px 0' }} />

  const tarjetaPng = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          position: 'relative',
          background: `radial-gradient(ellipse 70% 90% at 50% 50%, ${oscuro ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)'}, rgba(0,0,0,0) 70%), ${colores.base}`,
          color: tinta,
        }}
      >
        {/* El marco fino del acento, a todo el borde: lo que la hace tarjeta y no captura. */}
        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, bottom: 16, border: `1px solid ${colores.accent}`, opacity: 0.55, display: 'flex' }} />

        <div style={{ width: LADO, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
          {tarjeta.antetitulo === null ? null : (
            <div style={{ display: 'flex', fontFamily: 'Jost', fontSize: 19, letterSpacing: 5, color: colores.accent }}>{tarjeta.antetitulo.toUpperCase()}</div>
          )}
          {filete}
          {/* Con el nombre ya rotulado en el medallón del arte, repetirlo aquí lo diría dos veces. */}
          {rotulo !== null ? null : (
            <div style={{ display: 'flex', fontFamily: 'Cormorant', fontSize: nombres.length > 22 ? 44 : nombres.length > 14 ? 52 : 62, lineHeight: 1.05 }}>{nombres}</div>
          )}
        </div>

        <div style={{ display: 'flex', position: 'relative', width: ANCHO_PORTADA, height: ALTO_PORTADA, borderRadius: 22, overflow: 'hidden', boxShadow: '0 26px 60px rgba(0,0,0,0.38)', border: `2px solid ${colores.accent}` }}>
          {portada === null ? null : (
            // eslint-disable-next-line @next/next/no-img-element -- satori: no hay optimizador aquí
            <img alt="" height={ALTO_PORTADA} src={uri(portada)!} style={{ position: 'absolute', inset: 0 }} width={ANCHO_PORTADA} />
          )}
          {rotulo === null ? null : (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: Math.round(rotulo.centro.y - rotulo.tamano * 0.5),
                display: 'flex',
                justifyContent: 'center',
                fontFamily: 'Cinzel',
                fontSize: rotulo.tamano,
                lineHeight: 1,
                color: '#f3e0b8',
              }}
            >
              {rotulo.texto}
            </div>
          )}
        </div>

        <div style={{ width: LADO, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {dia === '' ? null : <div style={{ display: 'flex', fontFamily: 'Cormorant', fontSize: 38, lineHeight: 1.12 }}>{dia}</div>}
          {hora === '' ? null : <div style={{ display: 'flex', fontFamily: 'Jost', fontSize: 26, marginTop: 6, color: tintaSuave }}>{hora}</div>}
          {filete}
          <div style={{ display: 'flex', fontFamily: 'Jost', fontSize: 18, letterSpacing: 3, color: colores.accent }}>
            {getDictionary(event.locale).themes.shareImageTap.toUpperCase()}
          </div>
        </div>
      </div>
    ),
    { width: ANCHO, height: ALTO, fonts: await leerFuentes() },
  )

  const jpeg = await sharp(Buffer.from(await tarjetaPng.arrayBuffer())).jpeg({ quality: 84, mozjpeg: true }).toBuffer()

  return new Response(new Uint8Array(jpeg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600', 'X-Robots-Tag': 'noindex' },
  })
}
