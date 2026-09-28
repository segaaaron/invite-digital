import { notFound } from 'next/navigation'

/**
 * Una dirección del admin que no existe (`/panel/admin/ajustes`, un enlace viejo) cae aquí y
 * responde **el 404 del panel, dentro de su carcasa**, con la barra y «Volver al panel». Sin esta
 * ruta, Next no tiene un layout raíz común que envuelva lo desconocido y pintaba su 404 negro.
 */
export default function DireccionDesconocida() {
  notFound()
}
