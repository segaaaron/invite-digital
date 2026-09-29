import { after } from 'next/server'
import { registrarFallo } from '@/shared/observability/fallos'

/**
 * Corre una tarea **después de responder** (`after`), como los correos y los avisos: quien confirma o
 * reserva no espera. Fuera de una petición —un guion, una prueba— no hay `after`: se lanza sin esperar.
 * Nunca deja escapar un error: un aviso que falla no puede tumbar lo que el usuario acaba de hacer.
 */
export function enSegundoPlano(tarea: () => Promise<unknown>): void {
  const segura = () => tarea().catch((causa: unknown) => registrarFallo('shared/http/en-segundo-plano', 'tarea en segundo plano fallida:', causa))
  try {
    after(segura)
  } catch {
    void Promise.resolve().then(segura)
  }
}
