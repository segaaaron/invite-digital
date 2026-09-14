import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AudioProcessor } from './audio'

/** Una canción de tres minutos se codifica en segundos; pasado esto, algo va mal. */
const TIEMPO_MAXIMO_MS = 90_000

/**
 * `ffmpeg` convierte cualquier audio que sepa leer en un MP3 de 96 kbps.
 *
 * - **Fichero temporal y no tubería**: la M4A del iPhone guarda su índice al final y
 *   `ffmpeg` no la lee desde una entrada que no se puede rebobinar.
 * - **La canción entera, sin recortar.** Suena en bucle hasta que quien mira la invitación la
 *   pausa desde su reproductor: cuánto suena lo decide él, no la subida.
 * - **Sin metadatos**: la carátula incrustada pesa más que la canción recortada.
 * - 96 kbps en estéreo: una canción de cuatro minutos queda en unos 3 MB, que es lo que baja
 *   un invitado con datos.
 */
export const ffmpegAudioProcessor: AudioProcessor = {
  async normalize(bytes) {
    const carpeta = await mkdtemp(join(tmpdir(), 'audio-'))
    const entrada = join(carpeta, `${randomUUID()}.in`)
    const salida = join(carpeta, `${randomUUID()}.mp3`)

    try {
      await writeFile(entrada, bytes)
      const bien = await ejecutar([
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        entrada,
        '-vn',
        '-map_metadata',
        '-1',
        '-ac',
        '2',
        '-ar',
        '44100',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '96k',
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

function ejecutar(argumentos: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const proceso = spawn('ffmpeg', argumentos, { stdio: ['ignore', 'ignore', 'pipe'] })
    let errores = ''
    proceso.stderr.on('data', (trozo: Buffer) => {
      errores += trozo.toString()
    })
    const reloj = setTimeout(() => proceso.kill('SIGKILL'), TIEMPO_MAXIMO_MS)
    proceso.on('error', (causa) => {
      clearTimeout(reloj)
      console.error('ffmpeg no se pudo ejecutar:', causa)
      resolve(false)
    })
    proceso.on('close', (codigo) => {
      clearTimeout(reloj)
      if (codigo !== 0) console.error('ffmpeg rechazó el audio:', errores.trim().slice(0, 500))
      resolve(codigo === 0)
    })
  })
}
