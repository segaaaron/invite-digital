/**
 * La paleta de «Sobre Lacrado», la boda de acuarela crema y guinda (`boda-sobre-lacrado.jsx`).
 *
 * Son los seis colores que la maqueta declara en su constante `SL`, con su nombre en
 * castellano: crema, ciruela, vino, rosa viejo, crema de texto y oro del lacre.
 */
export const PALETA = {
  /** `cream`: el papel de acuarela. */
  crema: '#f2ede4',
  /** `plum`: el fondo de los bloques oscuros. */
  ciruela: '#4a1b33',
  /** `wine`: la tinta de los titulares sobre crema. */
  vino: '#5a1e33',
  /** `rose`: la tinta secundaria, de los rótulos. */
  rosa: '#7a4a55',
  /** `creamTxt`: la tinta sobre los bloques ciruela. */
  cremaTinta: '#f5efe0',
  /** `gold`: el oro del lacre, los filetes y los números. */
  oro: '#c9a961',
  /** El velo de los botones y los campos: vino al 6 %. */
  velo: 'rgba(90,30,51,0.06)',
  /** El filete del oro al 44 %, como lo escribe la maqueta (`${gold}70`). */
  filete: 'rgba(201,169,97,0.44)',
} as const
