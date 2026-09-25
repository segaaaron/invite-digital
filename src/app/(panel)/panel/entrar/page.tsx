import Image from 'next/image'
import { SignInForm } from '@/modules/identity/ui/SignInForm'

export const metadata = { title: 'Entrar · Panel' }

/**
 * La puerta del panel.
 *
 * Es lo primero que se ve del producto cada mañana, así que no es un formulario suelto en
 * medio de una pantalla en blanco: dos mitades, la oscura con la marca —la misma tinta
 * `shell` de la barra lateral, para que entrar sea entrar en el panel y no en otro sitio—
 * y la marfil con el formulario.
 *
 * Por debajo de 860 —el corte de la carcasa del panel, no el de Tailwind— la mitad oscura
 * se convierte en una banda de cabecera: en un teléfono, media pantalla de decoración
 * dejaría el formulario por debajo del pliegue.
 */
export default function SignInPage() {
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] min-[860px]:grid-cols-[1.05fr_1fr] min-[860px]:grid-rows-1">
      <section className="relative flex flex-col justify-between overflow-hidden bg-linear-to-b from-shell to-shell-deep px-8 py-10 text-shell-ink min-[860px]:px-14 min-[860px]:py-14">
        {/*
          La fotografía, y **solo de 860 para arriba**: por debajo esta mitad es una banda
          de cabecera de unos pocos centímetros, y una foto ahí empuja el formulario por
          debajo del pliegue — que es justo lo que esta pantalla no se puede permitir.

          Es la boda de noche del catálogo, elegida entre las nueve por una razón concreta:
          ya es oscura, así que el velo que necesita para que el titular se lea encima
          apenas la apaga, y sus guirnaldas cálidas conversan con el oro de la marca. El
          jardín a plena luz dejaba el vestido blanco justo donde va el titular.

          `priority` porque es lo primero que se ve del producto cada mañana; sin él entra
          después del texto y la mitad oscura parpadea de negro a fotografía.
        */}
        <Image
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden size-full object-cover object-[62%_center] min-[860px]:block"
          height={1760}
          priority
          src="/site/colecciones/bodas-2.avif"
          width={1320}
        />

        {/* El velo. Sin él la fotografía se come el titular y la marca: lo que esta mitad
            tiene que comunicar es el atelier, no la boda de otros. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden bg-linear-to-b from-shell/88 via-shell/82 to-shell-deep/94 min-[860px]:block"
        />

        {/* El halo dorado va **dentro** de los límites del bloque, con el centro del
            degradado desplazado, y no en un círculo que asome por el borde: un absoluto
            que se sale no lo recorta el `overflow-hidden` de aquí si su bloque contenedor
            acaba siendo otro, y estira el documento a lo ancho. Lo cazó la e2e. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(620px_380px_at_84%_-4%,rgb(var(--color-gold-rgb)/0.26)_0%,transparent_70%)]"
        />

        {/* El monograma y el nombre como una sola pieza, del tamaño del texto: el emblema de
            la marca es lo primero que se ve al entrar, y repetirlo grande sería un logotipo
            pegado encima de otro. */}
        <div className="relative flex items-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="size-11 shrink-0 min-[860px]:size-12" src="/icon.svg" />
          <p className="font-display text-[26px] leading-none italic min-[860px]:text-[30px]">
            Luxury <b className="font-medium not-italic">Atelier</b>
          </p>
        </div>

        <div className="relative mt-10 hidden max-w-[34ch] flex-col gap-6 min-[860px]:flex">
          <span aria-hidden className="h-px w-16 bg-gold/60" />
          <p className="font-display text-[34px] leading-[1.25] font-light">
            El atelier, del otro lado de esta puerta.
          </p>
          <p className="text-[14px] leading-[1.75] text-shell-ink/65">
            Invitados, mesas, regalos y llegadas de cada evento, en un solo sitio.
          </p>
        </div>

        {/* El dominio y el alcance, no la ciudad: el panel se abre desde donde sea, y quien
            entra ya sabe dónde está el taller. */}
        <p className="relative mt-8 hidden font-mono text-[10.5px] tracking-[0.16em] text-shell-ink/40 uppercase min-[860px]:block">
          luxuryatelier.net · invitaciones digitales en todo el mundo
        </p>
      </section>

      {/* La mitad del formulario. */}
      <section className="flex items-center justify-center bg-bg-top px-6 py-14 min-[860px]:px-10">
        <div className="flex w-full max-w-[380px] flex-col gap-8">
          <header className="flex flex-col gap-2">
            <p className="font-mono text-[10.5px] tracking-[0.16em] text-ink-mute uppercase">Acceso privado</p>
            <h1 className="font-display text-[30px] leading-tight font-light text-ink">Panel del atelier</h1>
          </header>

          <SignInForm />
        </div>
      </section>
    </main>
  )
}
