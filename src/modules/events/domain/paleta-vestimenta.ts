/**
 * Los colores que se suelen pedir en un código de vestimenta, para elegir con un toque.
 *
 * Son **datos**, como los de las tarjetas del catálogo: lo que el cliente elige acaba en el
 * contenido de su invitación. Cualquier otro color se añade a mano con el selector.
 */
export const COLORES_DE_VESTIMENTA: ReadonlyArray<{ readonly nombre: string; readonly hex: string }> = [
  { nombre: 'Negro', hex: '#111111' },
  { nombre: 'Marfil', hex: '#f4efe4' },
  { nombre: 'Champaña', hex: '#e6d3b3' },
  { nombre: 'Dorado', hex: '#c9a45c' },
  { nombre: 'Plata', hex: '#c0c4c8' },
  { nombre: 'Rosa palo', hex: '#e8c4c4' },
  { nombre: 'Lavanda', hex: '#b9a7d6' },
  { nombre: 'Celeste', hex: '#a7c7e7' },
  { nombre: 'Azul marino', hex: '#1d2b4f' },
  { nombre: 'Verde salvia', hex: '#9caf88' },
  { nombre: 'Vino', hex: '#6d1f33' },
  { nombre: 'Terracota', hex: '#c0714f' },
]
