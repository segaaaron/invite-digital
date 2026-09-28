/** «1 invitación», «3 invitaciones». Sin `(s)`: se lee como un formulario, no como una frase. */
export const plural = (n: number, uno: string, varios: string): string => `${n} ${n === 1 ? uno : varios}`
