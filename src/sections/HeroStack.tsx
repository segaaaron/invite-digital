import Image from 'next/image'

/**
 * La composición del hero, portada de la maqueta: la invitación al frente, el sobre
 * abierto detrás a la izquierda y el cerrado abajo, con dos aros dorados de fondo.
 *
 * Es lo primero que se pinta —es el LCP— y lo que la escena 3D sustituye cuando el
 * dispositivo puede con ella.
 */
export function HeroStack({ alt }: { alt: string }) {
  return (
    <div aria-label={alt} className="relative mx-auto h-[440px] w-full max-w-[580px] lg:h-[540px]" role="img">
      <span
        aria-hidden
        className="absolute top-[46%] left-1/2 aspect-square w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/30"
      />
      <span
        aria-hidden
        className="absolute top-[46%] left-1/2 aspect-square w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/20"
      />

      <Image
        alt=""
        aria-hidden
        className="absolute top-[2%] left-0 w-[40%] -rotate-9 object-contain drop-shadow-[0_26px_34px_rgb(104_80_36/0.28)]"
        height={992}
        sizes="220px"
        src="/site/hero/sobre-abierto.avif"
        width={1060}
      />
      <Image
        alt=""
        aria-hidden
        className="absolute bottom-[-4%] left-[2%] z-2 w-[34%] -rotate-6 object-contain drop-shadow-[0_30px_40px_rgb(104_80_36/0.32)]"
        height={747}
        sizes="200px"
        src="/site/hero/sobre-cerrado.avif"
        width={1000}
      />
      <Image
        alt=""
        aria-hidden
        className="absolute inset-0 z-1 m-auto w-full object-contain drop-shadow-[0_42px_52px_rgb(104_80_36/0.34)]"
        height={991}
        priority
        sizes="(max-width: 1024px) 90vw, 580px"
        src="/site/hero/invitacion.avif"
        width={1088}
      />
    </div>
  )
}
