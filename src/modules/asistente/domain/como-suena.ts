/**
 * Un nombre tal como suena en español, para encontrar a un invitado dictado por voz con otra ortografía
 * (13 oct: se registraba «Ramón Peres» y «borra a Ramón Pérez» no lo encontraba). Sin tildes ni
 * mayúsculas; s/z/c(e,i) suenan igual, b/v, ll/y, la h muda, qu/k/c(a,o,u) y las letras dobles.
 */
export function comoSuena(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ll/g, 'y')
    .replace(/qu(?=[ei])/g, 'k')
    .replace(/c(?=[ei])/g, 's')
    .replace(/[cq]/g, 'k')
    .replace(/z/g, 's')
    .replace(/v/g, 'b')
    .replace(/h/g, '')
    .replace(/(.)\1+/g, '$1')
}
