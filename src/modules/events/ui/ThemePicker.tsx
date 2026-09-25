'use client'

import Image from '@/shared/design/ui/ImagenConCarga'
import { useId, useState } from 'react'
import { FIESTAS, fiestaDeCategoria, VOCABULARIO, type Fiesta } from '../domain/fiesta'
import type { ThemeDefinition } from './themes/contract'

type Props = {
  readonly definitions: readonly {
    key: string
    label: string
    categorySlug: ThemeDefinition['categorySlug']
    palette: Readonly<Record<string, string>>
    sample: { monogram: string; names: string } | null
    /**
     * La portada real del diseño. **Manda sobre el papel dibujado**: con la paleta sola, los
     * XV de papel claro salían casi en blanco y no se distinguían entre ellos.
     */
    cover?: string | null
  }[]
  readonly defaultValue: string
  readonly locale: string
}


/**
 * La rejilla de diseños de la Configuración del evento.
 *
 * Sustituye a un `<select>` de diecisiete claves. Un desplegable sirve para elegir un
 * idioma o un estado; **no sirve para elegir un diseño**, porque la decisión es visual y
 * ahí no se ve nada: el atelier tendría que abrir diecisiete pestañas para saber cuál es
 * «Étoile».
 *
 * Cada tarjeta pinta el papel con la paleta real del tema —el mismo dibujo que el
 * catálogo público— y enlaza a su vista previa, que es la invitación entera.
 *
 * La selección va en un `radio` de verdad y no en un `div` con estado: el formulario se
 * envía con `themeKey`, funciona con teclado y funciona sin JavaScript.
 *
 * Se pinta con la piel del panel —tinta oscura, borde neutro— y no con el dorado de la web
 * pública: la excepción del dorado es para lo que va sobre tarjeta oscura, y esto no lo es.
 */
export function ThemePicker({ definitions, defaultValue, locale }: Props) {
  const grupo = useId()
  const inicial = definitions.find((d) => d.key === defaultValue) ?? definitions[0]
  const [tipo, setTipo] = useState<Fiesta>(inicial === undefined ? 'boda' : fiestaDeCategoria(inicial.categorySlug))
  const [elegido, setElegido] = useState(inicial?.key ?? '')
  // Las fiestas que de verdad tienen diseños entre los que se le pasan: el cumpleaños solo
  // sale cuando alguien puede elegirlo, que hoy es únicamente el admin.
  const tipos = FIESTAS.filter((t) => definitions.some((d) => fiestaDeCategoria(d.categorySlug) === t))
  const porCategoria = { [tipo]: definitions.filter((d) => fiestaDeCategoria(d.categorySlug) === tipo) }

  return (
    <fieldset className="flex flex-col gap-6 border-0 p-0">
      <legend className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Diseño</legend>

      {/* Primero el tipo de fiesta, y solo sus diseños. Cambiar de tipo elige el primero del
          nuevo: un diseño de la otra fiesta no puede quedar elegido fuera de la vista. */}
      {tipos.length < 2 ? null : (
      <div aria-label="Tipo de fiesta" className="flex flex-wrap gap-1.5" role="group">
        {tipos.map((t) => (
          <button
            aria-pressed={tipo === t}
            className={`cursor-pointer rounded-[var(--radius-pill)] border px-4 py-2 font-mono text-[10px] tracking-[0.25em] uppercase transition-colors ${
              tipo === t ? 'border-ink bg-ink text-white' : 'border-line-panel-strong bg-white text-ink-soft hover:border-ink hover:text-ink'
            }`}
            key={t}
            onClick={() => {
              setTipo(t)
              const primero = definitions.find((d) => fiestaDeCategoria(d.categorySlug) === t)
              if (primero !== undefined) setElegido(primero.key)
            }}
            type="button"
          >
            {VOCABULARIO[t].plural}
          </button>
        ))}
      </div>
      )}

      {Object.entries(porCategoria).map(([categoria, temas]) => (
        <div className="flex flex-col gap-3" key={categoria}>

          {/* `auto-fill minmax`, no breakpoints: es la regla de las rejillas del panel. */}
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
            {temas.map((tema) => {
              const acento = tema.palette.oro ?? tema.palette.accent ?? tema.palette.lila ?? '#8d7a52'
              const papel = tema.palette.fondo ?? tema.palette.papel ?? tema.palette.marfil ?? '#f4f1ec'
              const seleccionado = elegido === tema.key

              return (
                <label
                  className={`flex cursor-pointer flex-col gap-2 rounded-[14px] border p-2 transition-colors ${
                    seleccionado ? 'border-ink' : 'border-[var(--color-line-panel)] hover:border-ink/40'
                  }`}
                  key={tema.key}
                >
                  <input
                    checked={seleccionado}
                    className="sr-only"
                    name="themeKey"
                    onChange={() => setElegido(tema.key)}
                    type="radio"
                    value={tema.key}
                    {...{ 'data-grupo': grupo }}
                  />

                  {tema.cover ? (
                    <span aria-hidden className="relative block aspect-5/7 overflow-hidden rounded-[8px] bg-bg-sunken">
                      <Image alt="" className="object-cover object-top" fill sizes="160px" src={tema.cover} />
                    </span>
                  ) : (
                  /* El papel del modelo, con la paleta real del diseño. */
                  <span
                    aria-hidden
                    className="relative flex aspect-5/7 flex-col items-center justify-center gap-1.5 rounded-[8px] text-center"
                    style={{ background: papel }}
                  >
                    <span className="absolute inset-2 border" style={{ borderColor: `${acento}55` }} />
                    <span
                      className="grid size-8 place-items-center rounded-full border font-display text-[11px]"
                      style={{ borderColor: `${acento}88`, color: acento }}
                    >
                      {tema.sample?.monogram ?? '·'}
                    </span>
                    <span className="px-2 font-display text-[13px] leading-tight italic" style={{ color: acento }}>
                      {(tema.sample?.names ?? tema.label).split('\n').map((linea) => (
                        <span className="block" key={linea}>
                          {linea}
                        </span>
                      ))}
                    </span>
                  </span>
                  )}

                  <span className="flex items-center justify-between gap-1 px-0.5">
                    <span className="text-[12px] text-ink">{tema.label}</span>
                    {/* Abre la invitación entera. El atelier decide mirándola, no leyendo
                        el nombre. En pestaña nueva para no perder el formulario a medias. */}
                    <a
                      className="font-mono text-[9px] tracking-[0.18em] text-ink-mute uppercase underline-offset-2 hover:text-ink hover:underline"
                      href={`/modelos/${locale}/${tema.key}`}
                      onClick={(evento) => evento.stopPropagation()}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Ver
                    </a>
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </fieldset>
  )
}
