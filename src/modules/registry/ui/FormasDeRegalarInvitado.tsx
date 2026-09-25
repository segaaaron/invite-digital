'use client'

import { useState } from 'react'
import type { RegistryDictionary } from '@/shared/i18n/dictionary'
import type { FormasDeRegalar } from '../domain/formas-de-regalar'

type Textos = Pick<
  RegistryDictionary,
  'sobresTitle' | 'sobresDefault' | 'transferTitle' | 'transferIntro' | 'bank' | 'holder' | 'account' | 'copy' | 'copied' | 'qrAlt' | 'qrHint' | 'downloadQr'
>

/**
 * El QR del banco del cliente, con «Descargar QR»: desde el mismo celular no se escanea, así que
 * se guarda y se abre desde la app del banco. Imagen sin optimizar a propósito: es privada, la
 * sirve `/i/<token>/regalos-qr` tras la puerta de la invitación.
 */
export function QrDeRegalo({ src, dictionary }: { src: string; dictionary: Pick<Textos, 'qrAlt' | 'qrHint' | 'downloadQr'> }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={dictionary.qrAlt} className="size-44 rounded-[12px] bg-white object-contain p-2" src={src} />
      <span className="text-[12px] text-ink-mute">{dictionary.qrHint}</span>
      <a
        className="rounded-[var(--radius-pill)] border border-line px-5 py-2.5 font-mono text-[10px] tracking-[var(--tracking-luxe)] uppercase"
        download="qr-regalos"
        href={src}
      >
        {dictionary.downloadQr}
      </a>
    </div>
  )
}

function Copiar({ texto, dictionary }: { texto: string; dictionary: Pick<Textos, 'copy' | 'copied'> }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <button
      className="shrink-0 cursor-pointer rounded-[var(--radius-pill)] border border-line px-3 py-1 font-mono text-[10px] tracking-[0.12em] uppercase"
      onClick={() => void navigator.clipboard?.writeText(texto).then(() => setCopiado(true))}
      type="button"
    >
      {copiado ? dictionary.copied : dictionary.copy}
    </button>
  )
}

/**
 * Las formas de regalar en la invitación: la lluvia de sobres y la transferencia con su QR. El
 * dinero va directo a la cuenta del cliente; aquí no se cobra nada.
 *
 * `sobres` y `qr` se pueden apagar: los diseños de XV que traen su propia tarjeta de sobres
 * (la de la maqueta) pintan el aviso y el QR en su sitio, y aquí solo va el resto.
 */
export function FormasDeRegalarInvitado({
  formas,
  qrSrc,
  dictionary,
  sobres = true,
  qr = true,
}: {
  formas: FormasDeRegalar
  qrSrc: string
  dictionary: Textos
  sobres?: boolean
  qr?: boolean
}) {
  const conSobres = sobres && formas.sobres
  const conCuenta = formas.transferencia && formas.cuenta !== null
  const conQr = qr && formas.transferencia && formas.tieneQr
  if (!conSobres && !conCuenta && !conQr) return null

  return (
    <div className="flex flex-col gap-4 text-left">
      {conSobres ? (
        <section className="flex flex-col gap-2 rounded-[16px] border border-line p-5 text-center">
          <h3 className="font-display text-[20px] text-ink">{dictionary.sobresTitle}</h3>
          <p className="text-[13px] leading-[1.7] text-ink-soft">{formas.sobresTexto ?? dictionary.sobresDefault}</p>
        </section>
      ) : null}

      {conCuenta || conQr ? (
        <section className="flex flex-col gap-4 rounded-[16px] border border-line p-5">
          <h3 className="text-center font-display text-[20px] text-ink">{dictionary.transferTitle}</h3>
          <p className="text-center text-[13px] leading-[1.7] text-ink-soft">{dictionary.transferIntro}</p>
          {conCuenta ? (
            <dl className="flex flex-col gap-2 text-[13px]">
              {(
                [
                  [dictionary.bank, formas.banco],
                  [dictionary.holder, formas.titular],
                ] as const
              ).map(([rotulo, valor]) =>
                valor === null ? null : (
                  <div className="flex justify-between gap-3" key={rotulo}>
                    <dt className="text-ink-mute">{rotulo}</dt>
                    <dd className="text-right text-ink">{valor}</dd>
                  </div>
                ),
              )}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <dt className="text-ink-mute">{dictionary.account}</dt>
                <dd className="flex items-center gap-2 text-ink">
                  {/* Entera: partida en dos líneas se copia a mano con un guion de más. */}
                  <span className="font-mono tracking-[0.04em] whitespace-nowrap">{formas.cuenta}</span>
                  <Copiar dictionary={dictionary} texto={formas.cuenta ?? ''} />
                </dd>
              </div>
            </dl>
          ) : null}
          {formas.nota === null ? null : <p className="text-center text-[12px] leading-[1.6] text-ink-mute">{formas.nota}</p>}
          {conQr ? <QrDeRegalo dictionary={dictionary} src={qrSrc} /> : null}
        </section>
      ) : null}
    </div>
  )
}
