import { cache } from 'react'
import { rsvp } from '@/app/composition/container'

/**
 * `cache` deduplica la consulta dentro de una misma petición: el layout la necesita para
 * el idioma y la página para todo lo demás, y así la base se toca una vez.
 */
export const resolveInvitation = cache(async (token: string) => rsvp.getInvitation(token))
