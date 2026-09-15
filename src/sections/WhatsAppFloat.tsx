import { WhatsAppIcon } from '@/shared/design/ui/icons'

/**
 * El botón flotante de WhatsApp de la web pública. Recibe el enlace ya resuelto de «La web»:
 * sin número configurado no se pinta, porque un botón que no lleva a ninguna parte resta.
 */
export function WhatsAppFloat({ href, label }: { href: string | null; label: string }) {
  if (href === null) return null

  return (
    <a
      aria-label={label}
      className="fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] z-40 grid size-14 place-items-center rounded-full bg-ink text-gold-light shadow-[var(--shadow-float)] transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold motion-reduce:transition-none motion-reduce:hover:scale-100"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title={label}
    >
      <WhatsAppIcon className="size-6" />
    </a>
  )
}
