import Image from 'next/image'

/**
 * **La marca de agua de una demo** (0099): el sello de la casa sobre la invitación, visible desde el primer
 * segundo y en cada pantalla.
 *
 * La primera versión era una cinta al final del todo. Está bien como cierre de venta, pero **no es una
 * marca de agua**: estos diseños abren en un sobre y siguen con pantallas enteras, así que quien recibe la
 * demo no llega nunca ahí y la firma no existe para él (20 oct, el usuario abrió la suya y no vio nada).
 *
 * Por eso va fija y pequeña: el monograma y la palabra, arriba a la izquierda, sobre un velo oscuro que la
 * hace legible sobre una foto clara o un fondo negro. No tapa el contenido —28 píxeles de alto— y no se
 * puede pulsar: es una marca, no un botón. El botón de venta sigue siendo la cinta del final.
 */
export function SelloDeDemo({ texto }: { readonly texto: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none fixed top-3 left-3 z-50 inline-flex items-center gap-1.5 rounded-full bg-ink/55 py-1 pr-2.5 pl-1 font-mono text-[9px] tracking-[var(--tracking-luxe)] text-gold-light uppercase backdrop-blur-[2px] print:hidden"
    >
      <Image alt="" height={16} src="/site/marca/sello-la-48-627a79b8.avif" unoptimized width={16} />
      {texto}
    </span>
  )
}
