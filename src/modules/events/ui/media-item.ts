/** Un archivo subido al evento, como lo ven los campos del editor. */
export type MediaItem = {
  readonly id: string
  readonly originalName: string
  readonly byteSize: number
  /**
   * Qué es: una fotografía o la música.
   *
   * Desde que el MP3 vive en esta misma tabla hace falta distinguirlos, o el campo de
   * música ofrecería fotografías y los de imagen ofrecerían la canción.
   */
  readonly contentType: string
  /** La trajo un invitado desde su invitación, no la subió el atelier. */
  readonly fromGuest: boolean
}

/** Si esta fila es la música y no una fotografía. */
export const esPista = (item: MediaItem): boolean => item.contentType.startsWith('audio/')
