import { PhotoSlot } from './PhotoSlot'

type Foto = { readonly src?: string | undefined; readonly label: string }

type Props = {
  readonly variant?: 'mosaic' | 'polaroid' | 'strip' | 'asymmetric'
  /** Hasta cinco fotos con su rótulo. Las que falten se pintan como hueco. */
  readonly photos: readonly Foto[]
  readonly border: string
  readonly slotBg: string
  readonly slotColor: string
  /** El fondo de la tira de fotomatón, que en la maqueta es casi negro. */
  readonly stripBg: string
  /** El cartón blanco de las polaroid y el papel de su hueco. */
  readonly polaroidBg: string
  readonly polaroidSlotBg: string
  readonly polaroidSlotColor: string
}

/**
 * La galería, en las cuatro disposiciones de la maqueta.
 *
 * Cada hueco sin foto se pinta como marcador y no se esconde: en el escaparate del
 * catálogo no hay fotos de nadie, y una galería que desaparece deja un salto en mitad del
 * diseño donde debería haber un bloque.
 */
export function PhotoCollage({
  variant = 'mosaic',
  photos,
  border,
  slotBg,
  slotColor,
  stripBg,
  polaroidBg,
  polaroidSlotBg,
  polaroidSlotColor,
}: Props) {
  const foto = (indice: number): Foto => photos[indice] ?? { label: `IMG·${String(indice + 1).padStart(2, '0')}` }

  if (variant === 'polaroid') {
    const posiciones = [
      { rot: -8, x: 0, y: 20, i: 0 },
      { rot: 6, x: 110, y: 0, i: 1 },
      { rot: -3, x: 200, y: 140, i: 2 },
      { rot: 10, x: 40, y: 160, i: 3 },
    ]
    return (
      <div style={{ position: 'relative', height: 320, width: '100%' }}>
        {posiciones.map((posicion) => (
          <div
            key={posicion.i}
            style={{
              position: 'absolute',
              left: posicion.x,
              top: posicion.y,
              width: 130,
              height: 150,
              transform: `rotate(${posicion.rot}deg)`,
              background: polaroidBg,
              padding: 8,
              paddingBottom: 24,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            }}
          >
            <PhotoSlot
              bg={polaroidSlotBg}
              border="none"
              color={polaroidSlotColor}
              height="100%"
              label={foto(posicion.i).label}
              radius={2}
              src={foto(posicion.i).src}
              width="100%"
            />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'strip') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 4,
          padding: 6,
          background: stripBg,
          borderRadius: 2,
        }}
      >
        {[0, 1, 2, 3].map((indice) => (
          <div key={indice} style={{ aspectRatio: '3/4' }}>
            <PhotoSlot
              bg={slotBg}
              border="none"
              color={slotColor}
              height="100%"
              label={foto(indice).label}
              radius={0}
              src={foto(indice).src}
              width="100%"
            />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'asymmetric') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8, height: 280 }}>
        <div style={{ gridRow: '1 / 3' }}>
          <PhotoSlot
            bg={slotBg}
            border={`1px solid ${border}`}
            color={slotColor}
            height="100%"
            label={foto(0).label}
            radius={8}
            src={foto(0).src}
            width="100%"
          />
        </div>
        {[1, 2].map((indice) => (
          <PhotoSlot
            bg={slotBg}
            border={`1px solid ${border}`}
            color={slotColor}
            height="100%"
            key={indice}
            label={foto(indice).label}
            radius={8}
            src={foto(indice).src}
            width="100%"
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '90px 90px', gap: 6 }}>
      <div style={{ gridRow: '1 / 3' }}>
        <PhotoSlot
          bg={slotBg}
          border={`1px solid ${border}`}
          color={slotColor}
          height="100%"
          label={foto(0).label}
          radius={6}
          src={foto(0).src}
          width="100%"
        />
      </div>
      {[1, 2, 3, 4].map((indice) => (
        <PhotoSlot
          bg={slotBg}
          border={`1px solid ${border}`}
          color={slotColor}
          height="100%"
          key={indice}
          label={foto(indice).label}
          radius={6}
          src={foto(indice).src}
          width="100%"
        />
      ))}
    </div>
  )
}
