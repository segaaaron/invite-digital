'use client'

import { useState } from 'react'
import type { CountryCode } from 'libphonenumber-js'
import { FIELD_CLASS } from './PanelKit'
import { aGuardar, esValido, formatearMientrasEscribe, nacionalDe, PAIS_POR_DEFECTO, PAISES, paisDeNumero, prefijoDe } from '@/shared/phone/paises'

/**
 * Un teléfono internacional: se elige el país y se escribe el número local, como en cualquier
 * producto que vende fuera de su país.
 *
 * Se guarda en **E.164** (`+59170012345`), que es lo que `wa.me` exige y lo que deja llamar
 * desde cualquier sitio. El país sale del propio número cuando ya hay uno guardado; si no, del
 * idioma del navegador cuando es de la región que vendemos, y si no, Bolivia.
 *
 * El formato se aplica mientras se escribe (`AsYouType` de libphonenumber-js), así que el
 * número se lee como en la agenda del teléfono y no como una tira de dígitos.
 */
export function CampoTelefono({
  id,
  name,
  value,
  onChange,
  onBlur,
  className = '',
  paisPorDefecto,
}: {
  id?: string
  /** Con `name`, el valor viaja en un campo oculto: sirve dentro de un formulario normal. */
  name?: string
  value: string
  onChange: (e164: string) => void
  onBlur?: () => void
  className?: string
  paisPorDefecto?: CountryCode
}) {
  const inicial = () => {
    if (value.trim() !== '') return paisDeNumero(value)
    if (paisPorDefecto !== undefined) return paisPorDefecto
    // El idioma del navegador trae la región: `es-BO`, `en-US`. Si no es de las nuestras, Bolivia.
    const region = typeof navigator === 'undefined' ? '' : (new Intl.Locale(navigator.language).region ?? '')
    return (PAISES.find((p) => p.code === region)?.code ?? PAIS_POR_DEFECTO) as CountryCode
  }
  const [pais, setPais] = useState<CountryCode>(inicial)
  const [nacional, setNacional] = useState(() => nacionalDe(value, inicial()))

  const escribir = (crudo: string, code: CountryCode) => {
    const formateado = formatearMientrasEscribe(crudo, code)
    setNacional(formateado)
    onChange(aGuardar(formateado, code))
  }

  const incompleto = nacional.trim() !== '' && !esValido(nacional, pais)

  return (
    <span className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="flex min-w-0 items-stretch gap-2">
        <label className="sr-only" htmlFor={`${id}-pais`}>
          País del teléfono
        </label>
        <select
          className={`${FIELD_CLASS} w-[112px] shrink-0 px-2.5`}
          id={`${id}-pais`}
          onChange={(e) => {
            const code = e.target.value as CountryCode
            setPais(code)
            escribir(nacional, code)
          }}
          value={pais}
        >
          {PAISES.map((p) => (
            <option key={p.code} value={p.code}>
              {p.bandera} {prefijoDe(p.code)}
            </option>
          ))}
        </select>

        <input
          aria-describedby={incompleto ? `${id}-aviso` : undefined}
          className={`${FIELD_CLASS} min-w-0 flex-1`}
          id={id}
          inputMode="tel"
          onBlur={onBlur}
          onChange={(e) => escribir(e.target.value, pais)}
          placeholder={pais === 'BO' ? '700 12345' : 'Número local'}
          type="tel"
          value={nacional}
        />
        {name === undefined ? null : <input name={name} type="hidden" value={value} />}
      </span>
      {incompleto ? (
        <span className="text-[11.5px] text-ink-mute" id={`${id}-aviso`}>
          Ese número parece incompleto para {PAISES.find((p) => p.code === pais)?.nombre}. Se guarda igual.
        </span>
      ) : null}
    </span>
  )
}
