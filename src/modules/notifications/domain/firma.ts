import { BRAND } from '@/shared/config/brand'

/**
 * La firma de todo correo del sistema: la marca, su lema y la web. Sale de `BRAND` para que
 * el nombre no se escriba a mano en cada plantilla y no vuelva a quedar un «InvitePremium».
 *
 * Sin colores: los clientes de correo no leen los tokens de la hoja y un hexadecimal aquí
 * sería uno más fuera de `tokens.css`. La firma se distingue por la letra.
 */
export function firmaTexto(siteUrl: string): string {
  return ['—', BRAND.siteName, BRAND.tagline, siteUrl].join('\n')
}

export function firmaHtml(siteUrl: string): string {
  return [
    '<hr style="border:none;border-top:1px solid;opacity:.2;margin:28px 0 16px">',
    `<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-style:italic">${BRAND.siteName}</p>`,
    `<p style="margin:4px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.6">${BRAND.tagline}</p>`,
    `<p style="margin:8px 0 0;font-size:12px"><a href="${siteUrl}">${siteUrl.replace(/^https?:\/\//, '')}</a></p>`,
  ].join('')
}
