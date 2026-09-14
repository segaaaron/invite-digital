/**
 * La música de una invitación, ajustada sola al subirla.
 *
 * Quien sube la canción no tiene por qué saber recortar ni comprimir un MP3: sube la que
 * tenga —MP3, la M4A del iPhone, un WAV— y lo que se guarda es siempre un MP3 ligero que
 * suena en bucle en cualquier teléfono.
 */

/** Lo que se acepta subir. Una canción entera en WAV ronda los 30 MB. */
export const MAX_AUDIO_UPLOAD_BYTES = 30 * 1024 * 1024

export interface AudioProcessor {
  /**
   * Devuelve un MP3 listo para servir, o `null` si el fichero no es un audio legible.
   * **No lanza**: un fichero roto es una respuesta, no una avería.
   */
  normalize(bytes: Uint8Array): Promise<Uint8Array | null>
}
