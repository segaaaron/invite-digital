/**
 * La música de una invitación, ajustada sola al subirla.
 *
 * Quien sube la canción no tiene por qué saber recortar ni comprimir un MP3: sube la que
 * tenga —MP3, la M4A del iPhone, un WAV— y lo que se guarda es siempre un MP3 ligero que
 * suena en bucle en cualquier teléfono.
 */

/** Lo que se acepta subir. Una canción entera en WAV ronda los 30 MB. */
export const MAX_AUDIO_UPLOAD_BYTES = 30 * 1024 * 1024

/** El título y el artista que traía el archivo en sus etiquetas, antes de quitárselas. */
export type EtiquetasDeCancion = { readonly titulo: string | null; readonly artista: string | null }

export interface AudioProcessor {
  /**
   * Devuelve un MP3 listo para servir y las etiquetas que traía, o `null` si el fichero no
   * es un audio legible. **No lanza**: un fichero roto es una respuesta, no una avería.
   */
  normalize(bytes: Uint8Array): Promise<({ mp3: Uint8Array } & EtiquetasDeCancion) | null>
}

/**
 * El nombre que enseña el reproductor, sacado **del archivo que suena**.
 *
 * Existe porque el reproductor enseñaba la canción del contenido de muestra —«Tiempo de
 * Vals, Chayanne»— sonando otra: el nombre y el audio venían de dos sitios. Ahora salen del
 * mismo: las etiquetas del archivo y, si no trae, su nombre de fichero, con la forma habitual
 * «Artista - Título».
 */
export function nombreDeCancion(etiquetas: EtiquetasDeCancion, nombreArchivo: string): { track: string; artist: string } {
  const limpio = (valor: string | null) => (valor ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
  const titulo = limpio(etiquetas.titulo)
  const artista = limpio(etiquetas.artista)
  if (titulo !== '') return { track: titulo, artist: artista }

  const base = limpio(nombreArchivo.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/_/g, ' '))
  const partes = base.split(' - ')
  if (partes.length >= 2 && artista === '') return { artist: partes[0]!.trim(), track: partes.slice(1).join(' - ').trim() }
  return { track: base || 'Canción', artist: artista }
}
