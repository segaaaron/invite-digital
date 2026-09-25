import { AvisosDelAdmin } from './AvisosDelAdmin'
import { BuscadorRapido } from './BuscadorRapido'

/**
 * La barra superior del admin: buscar (⌘K) y lo que llega en vivo. Encima de cada pantalla, a la
 * derecha, como en Linear o Stripe: lo que se usa desde cualquier sitio no ocupa la barra lateral.
 */
export function BarraDelAdmin() {
  return (
    <div className="mb-5 flex items-center justify-end gap-2.5">
      <AvisosDelAdmin />
      <BuscadorRapido />
    </div>
  )
}
