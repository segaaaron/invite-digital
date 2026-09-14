import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AudioProcessor } from './audio'

/** Una canción entera se codifica en segundos; pasado esto, algo va mal. */
const TIEMPO_MAXIMO_MS = 90_000

/**
 * Un MP3 por debajo de esto ya es ligero: se guarda con su audio tal cual. Recomprimirlo
 * solo le quitaría calidad sin ganar peso.
 */
const MP3_LIGERO_BPS = 192_000

type Sonda = {
  streams?: { codec_type?: string; disposition?: { attached_pic?: number } }[]
  format?: { format_name?: string; bit_rate?: string }
}

/**
 * Deja la música lista para servir, conservando su calidad.
 *
 * 1. **Solo música.** `ffprobe` mira qué trae el fichero: sin pista de audio, o con vídeo,
 *    se rechaza. La carátula de un MP3 aparece como imagen adjunta y no cuenta como vídeo.
 * 2. **Un MP3 ya ligero no se recomprime**: se copia su audio sin tocarlo y solo se le quita
 *    lo que no es sonido —carátula y metadatos—.
 * 3. **Lo demás** —WAV, la M4A del iPhone, un MP3 pesado— **se codifica en MP3 de calidad
 *    variable alta** (`-q:a 4`, unos 130–160 kbps según la canción): suena como el original
 *    y pesa una fracción. La tasa fija de 96 kbps de antes se notaba en voces y platillos.
 *
 * Fichero temporal y no tubería: la M4A guarda su índice al final y desde una tubería no se
 * lee. **No lanza**: lo que no vale devuelve `null`.
 */
export const ffmpegAudioProcessor: AudioProcessor = {
  async normalize(bytes) {
    const carpeta = await mkdtemp(join(tmpdir(), 'audio-'))
    const entrada = join(carpeta, `${randomUUID()}.in`)
    const salida = join(carpeta, `${randomUUID()}.mp3`)

    try {
      await writeFile(entrada, bytes)

      const sonda = await sondear(entrada)
      if (sonda === null) return null
      const pistas = sonda.streams ?? []
      const hayAudio = pistas.some((p) => p.codec_type === 'audio')
      const hayVideo = pistas.some((p) => p.codec_type === 'video' && p.disposition?.attached_pic !== 1)
      if (!hayAudio || hayVideo) return null

      const esMp3 = (sonda.format?.format_name ?? '').split(',').includes('mp3')
      const bps = Number(sonda.format?.bit_rate ?? Number.NaN)
      const ligero = esMp3 && Number.isFinite(bps) && bps <= MP3_LIGERO_BPS

      const bien = await ejecutar('ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        entrada,
        // Solo el sonido: fuera la carátula y los metadatos.
        '-vn',
        '-map_metadata',
        '-1',
        ...(ligero ? ['-c:a', 'copy'] : ['-c:a', 'libmp3lame', '-q:a', '4']),
        salida,
      ])
      if (!bien) return null

      const mp3 = await readFile(salida)
      return mp3.byteLength === 0 ? null : new Uint8Array(mp3)
    } catch {
      return null
    } finally {
      await rm(carpeta, { recursive: true, force: true })
    }
  },
}

async function sondear(ruta: string): Promise<Sonda | null> {
  let json = ''
  const bien = await ejecutar(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', ruta],
    (trozo) => {
      json += trozo
    },
  )
  if (!bien) return null
  try {
    return JSON.parse(json) as Sonda
  } catch {
    return null
  }
}

function ejecutar(programa: string, argumentos: string[], alSalir?: (trozo: string) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const proceso = spawn(programa, argumentos, { stdio: ['ignore', alSalir ? 'pipe' : 'ignore', 'pipe'] })
    let errores = ''
    proceso.stdout?.on('data', (trozo: Buffer) => alSalir?.(trozo.toString()))
    proceso.stderr?.on('data', (trozo: Buffer) => {
      errores += trozo.toString()
    })
    const reloj = setTimeout(() => proceso.kill('SIGKILL'), TIEMPO_MAXIMO_MS)
    proceso.on('error', (causa) => {
      clearTimeout(reloj)
      console.error(`${programa} no se pudo ejecutar:`, causa)
      resolve(false)
    })
    proceso.on('close', (codigo) => {
      clearTimeout(reloj)
      if (codigo !== 0) console.error(`${programa} rechazó el archivo:`, errores.trim().slice(0, 500))
      resolve(codigo === 0)
    })
  })
}
