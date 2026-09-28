import { notFound } from 'next/navigation'

/**
 * Una dirección de la web que no existe (`/es/lo-que-sea`) cae aquí y responde el 404 **de la web**,
 * con su cabecera, su pie y en su idioma. Sin esta ruta Next pintaba el suyo, en inglés y sin marca,
 * y además prerenderizado: la CSP le bloqueaba los scripts por no llevar el nonce de la petición.
 */
export default function DireccionDesconocida() {
  notFound()
}
