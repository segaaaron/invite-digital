import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ffmpegAudioProcessor } from './ffmpeg-audio-processor'

const hayFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0

/** Genera un fichero con el propio ffmpeg y devuelve sus bytes. */
function generar(extension: string, argumentos: string[]): Uint8Array {
  const carpeta = mkdtempSync(join(tmpdir(), 'gen-'))
  const ruta = join(carpeta, `f.${extension}`)
  spawnSync('ffmpeg', ['-loglevel', 'error', ...argumentos, ruta])
  const bytes = new Uint8Array(readFileSync(ruta))
  rmSync(carpeta, { recursive: true, force: true })
  return bytes
}

const tono = ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=20']

function sondear(bytes: Uint8Array): { duracion: number; bps: number; video: boolean } {
  const carpeta = mkdtempSync(join(tmpdir(), 'son-'))
  const ruta = join(carpeta, 'a.mp3')
  writeFileSync(ruta, bytes)
  const salida = spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', ruta])
  rmSync(carpeta, { recursive: true, force: true })
  const json = JSON.parse(salida.stdout.toString()) as {
    streams: { codec_type: string }[]
    format: { duration: string; bit_rate: string }
  }
  return {
    duracion: Number(json.format.duration),
    bps: Number(json.format.bit_rate),
    video: json.streams.some((s) => s.codec_type === 'video'),
  }
}

describe.skipIf(!hayFfmpeg)('ffmpegAudioProcessor', () => {
  it('un WAV sale en MP3 más ligero, entero y con calidad alta', async () => {
    const wav = generar('wav', tono)
    const mp3 = (await ffmpegAudioProcessor.normalize(wav))?.mp3 ?? null

    expect(mp3).not.toBeNull()
    expect(mp3![0] === 0x49 || mp3![0] === 0xff).toBe(true)
    expect(mp3!.byteLength).toBeLessThan(wav.byteLength)
    expect(sondear(mp3!).duracion).toBeGreaterThan(19.5)
  }, 60_000)

  it('devuelve el título y el artista que traía el archivo, aunque el MP3 salga sin etiquetas', async () => {
    const etiquetado = generar('mp3', [...tono, '-c:a', 'libmp3lame', '-b:a', '128k', '-metadata', 'title=Vals de Valeria', '-metadata', 'artist=Cuarteto Andino'])
    const ajustado = await ffmpegAudioProcessor.normalize(etiquetado)

    expect(ajustado).toMatchObject({ titulo: 'Vals de Valeria', artista: 'Cuarteto Andino' })
  }, 60_000)

  it('un MP3 ya ligero no se recomprime: conserva su tasa', async () => {
    const ligero = generar('mp3', [...tono, '-c:a', 'libmp3lame', '-b:a', '128k'])
    const mp3 = (await ffmpegAudioProcessor.normalize(ligero))?.mp3 ?? null

    expect(mp3).not.toBeNull()
    expect(Math.abs(sondear(mp3!).bps - sondear(ligero).bps)).toBeLessThan(8_000)
  }, 60_000)

  it('un MP3 pesado sí se comprime', async () => {
    const pesado = generar('mp3', [...tono, '-c:a', 'libmp3lame', '-b:a', '320k'])
    const mp3 = (await ffmpegAudioProcessor.normalize(pesado))?.mp3 ?? null

    expect(mp3).not.toBeNull()
    expect(mp3!.byteLength).toBeLessThan(pesado.byteLength)
  }, 60_000)

  it('quita la carátula: queda solo el audio', async () => {
    const portada = generar('png', ['-f', 'lavfi', '-i', 'color=red:size=64x64', '-frames:v', '1'])
    const carpeta = mkdtempSync(join(tmpdir(), 'car-'))
    writeFileSync(join(carpeta, 'p.png'), portada)
    const conCaratula = generar('mp3', [
      ...tono,
      '-i',
      join(carpeta, 'p.png'),
      '-map',
      '0:a',
      '-map',
      '1:v',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '128k',
      '-c:v',
      'png',
      '-disposition:v',
      'attached_pic',
    ])
    rmSync(carpeta, { recursive: true, force: true })

    const mp3 = (await ffmpegAudioProcessor.normalize(conCaratula))?.mp3 ?? null

    expect(mp3).not.toBeNull()
    expect(sondear(mp3!).video).toBe(false)
  }, 60_000)

  it('un vídeo se rechaza aunque traiga sonido: solo música', async () => {
    const video = generar('mp4', ['-f', 'lavfi', '-i', 'testsrc=duration=3:size=64x64', ...tono, '-shortest'])
    expect(await ffmpegAudioProcessor.normalize(video)).toBeNull()
  }, 60_000)

  it('lo que no es audio devuelve null, no lanza', async () => {
    expect(await ffmpegAudioProcessor.normalize(new TextEncoder().encode('esto no es una canción'))).toBeNull()
  })
})
