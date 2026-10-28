import type { ReactNode } from 'react'
import { T } from '@/shared/i18n/idioma-navegador'
import Image from '@/shared/design/ui/ImagenConCarga'

/**
 * La puerta del panel (E14, E69, E70): a la izquierda la foto del sobre con los anillos, el sello y —al entrar— la
 * frase; a la derecha, marfil, el formulario. En el celular la foto es una banda arriba y el formulario sube sobre ella
 * en una hoja redondeada (M20).
 */
export function PuertaConFoto({ children, frase = false, pie = false }: { children: ReactNode; frase?: boolean; pie?: boolean }) {
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] min-[860px]:grid-cols-[1fr_1fr] min-[860px]:grid-rows-1">
      <section className="relative flex min-h-[300px] flex-col justify-between overflow-hidden bg-shell-deep px-5 pt-5 pb-12 text-shell-ink min-[860px]:min-h-0 min-[860px]:px-10 min-[860px]:py-10">
        <Image
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full object-cover max-[859px]:object-[50%_30%]"
          height={1650}
          priority
          src="/site/entrada/sobre-esmeralda-b374c402.avif"
          width={1100}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-b from-shell-deep/35 via-transparent to-shell-deep/75" />

        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="size-12 shrink-0 min-[860px]:size-10" src="/site/marca/sello-la-48-627a79b8.avif" srcSet="/site/marca/sello-la-48-627a79b8.avif 1x, /site/marca/sello-la-96-56d82990.avif 2x, /site/marca/sello-la-144-59259035.avif 3x" />
          <p className="font-display text-[24px] leading-none font-medium max-[859px]:hidden">Luxury Atelier</p>
        </div>

        <p className="relative font-display text-[22px] italic min-[860px]:hidden">Luxury Atelier</p>
        {frase ? (
          <div className="relative hidden flex-col gap-5 min-[860px]:flex">
            <p className="max-w-[20ch] font-display text-[34px] leading-[1.2] font-normal italic">
          <T en="Every celebration begins with an envelope being opened." es="Cada celebración empieza con un sobre que se abre." />
        </p>
            <span aria-hidden className="flex w-16 flex-col gap-1">
              <span className="h-px bg-gold" />
              <span className="h-px bg-gold" />
            </span>
          </div>
        ) : null}
      </section>

      <section className="relative -mt-6 flex flex-col items-center justify-between gap-10 overflow-hidden rounded-t-[24px] bg-bg px-5 pt-8 pb-8 min-[860px]:mt-0 min-[860px]:rounded-none min-[860px]:px-10 min-[860px]:pt-0">
        {/*
          El marfil estaba plano, como una hoja en blanco. Ahora tiene la luz que tiene el resto
          de la marca: dos focos de oro muy velados —uno alto a la derecha, otro bajo a la
          izquierda— y el sello en marca de agua. Es fondo, no decoración: ni mueve el formulario
          ni se lleva un clic.
        */}
        {/*
          Los focos y el sello van **pintados**, no puestos: eran tres cajas que se salían de la
          pantalla por el borde (`-right-[22%]`). Recortadas se veían igual, pero en un teléfono
          chico eso es contenido fuera de la ventana sin forma de llegar a él, y `responsive.spec`
          lo caza a propósito. Como fondo de una capa `inset-0` el efecto es el mismo —el degradado
          y el sello siguen saliéndose por el borde— y no hay ninguna caja que sobresalga.
        */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(62vh_62vh_at_112%_-16%,rgb(var(--color-gold-rgb)/0.16),transparent),radial-gradient(54vh_54vh_at_-14%_116%,rgb(var(--color-gold-rgb)/0.09),transparent)]" />
          <div className="absolute inset-0 bg-[url(/site/marca/sello-la-144-59259035.avif)] bg-no-repeat opacity-[0.05] mix-blend-multiply [background-position:112%_88%] [background-size:46%_auto] max-[859px]:hidden" />
          <div className="absolute inset-y-0 left-0 w-px bg-linear-to-b from-transparent via-gold/25 to-transparent max-[859px]:hidden" />
        </div>
        <span aria-hidden className="relative hidden min-[860px]:block" />
        <div className="relative flex w-full max-w-[360px] flex-col gap-7">{children}</div>
        {pie ? <p className="relative text-center text-[13px] text-ink-mute">
          <T en="Luxury Atelier, digital invitations handmade in Bolivia" es="Luxury Atelier, invitaciones digitales hechas a mano en Bolivia" />
        </p> : <span aria-hidden />}
      </section>
    </main>
  )
}
