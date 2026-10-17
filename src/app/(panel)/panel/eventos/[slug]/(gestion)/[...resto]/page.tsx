import { notFound } from 'next/navigation'

/**
 * Una dirección dentro de un evento que no existe (`/panel/eventos/<slug>/planear`) cae aquí y responde **el 404 del
 * panel**, en español y con salida. Sin esta ruta Next pintaba su 404 negro en inglés (16 oct), como pasaba en el admin.
 */
export default function DireccionDesconocida() {
  notFound()
}
