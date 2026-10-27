/**
 * El botón flotante de WhatsApp de la web pública. Recibe el enlace ya resuelto de «La web».
 *
 * La piel es la de la maqueta («mix», aprobada el 26 oct): verde de WhatsApp, siempre visible,
 * y al pasar el ratón se abre y dice su nombre. Las clases viven en `sections/portada/portada.css`,
 * que el layout del sitio ya carga.
 */
export function WhatsAppFloat({ href, label }: { href: string | null; label: string }) {
  // **Siempre a la vista, como en la maqueta.** Mientras «La web» no tenga número cargado lleva a
  // whatsapp.com —igual que los iconos del pie—, y en cuanto esté, al chat del atelier.
  return (
    <a aria-label={label} className="wa" href={href ?? 'https://www.whatsapp.com/'} rel="noopener noreferrer" target="_blank">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.86 9.86 0 004.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0012.04 2zm0 18.15h-.01a8.2 8.2 0 01-4.18-1.15l-.3-.18-3.1.81.83-3.03-.2-.31a8.16 8.16 0 01-1.25-4.39c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.82c0 4.54-3.69 8.24-8.26 8.24zm4.52-6.17c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23a7.4 7.4 0 01-1.37-1.71c-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.84-.2-.49-.4-.42-.55-.43h-.48c-.16 0-.42.06-.64.3-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.17 1.69 2.58 4.1 3.62.57.24 1.02.39 1.37.5.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.47-.29z" />
      </svg>
      <b>{label}</b>
    </a>
  )
}
