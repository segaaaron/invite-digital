import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MAX_AUDIO_SEGUNDOS } from './audio'
import { ffmpegAudioProcessor } from './ffmpeg-audio-processor'

const hayFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0

/** Genera un tono de `segundos` en el formato que se pida, con el propio ffmpeg. */
function tono(segundos: number, extension: string): Uint8Array {
  const carpeta = mkdtempSync(join(tmpdir(), 'tono-'))
  const ruta = join(carpeta, `tono.${extension}`)
  spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', `sine=frequency=440:duration=${segundos}`, ruta])
  const bytes = new Uint8Array(readFileSync(ruta))
  rmSync(carpeta, { recursive: true, force: true })
  return bytes
}

function duracion(bytes: Uint8Array): number {
  const carpeta = mkdtempSync(join(tmpdir(), 'dur-'))
  const ruta = join(carpeta, 'a.mp3')
  writeFileSync(ruta, bytes)
  const salida = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ruta])
  rmSync(carpeta, { recursive: true, force: true })
  return Number(salida.stdout.toString().trim())
}

describe.skipIf(!hayFfmpeg)('ffmpegAudioProcessor', () => {
  it('convierte un WAV en MP3 y lo recorta a la duración máxima', async () => {
    const mp3 = await ffmpegAudioProcessor.normalize(tono(MAX_AUDIO_SEGUNDOS + 20, 'wav'))
    expect(mp3).not.toBeNull()
    // Empieza por ID3 o por una trama MP3.
    expect(mp3![0] === 0x49 || mp3![0] === 0xff).toBe(true)
    expect(duracion(mp3!)).toBeLessThanOrEqual(MAX_AUDIO_SEGUNDOS + 0.5)
  }, 60_000)

  it('lo que no es audio devuelve null, no lanza', async () => {
    expect(await ffmpegAudioProcessor.normalize(new TextEncoder().encode('esto no es una canción'))).toBeNull()
  })
})
