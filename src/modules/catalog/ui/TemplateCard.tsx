import Image from 'next/image'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Template } from '../domain/template'

type Props = { template: Template; dictionary: Dictionary }

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join(' ')

export function TemplateCard({ template, dictionary }: Props) {
  const { models } = dictionary

  return (
    <figure
      className="m-0 flex w-[230px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-card)] border bg-bg-raised shadow-[var(--shadow-float)]"
      style={{ borderColor: template.palette.accent }}
    >
      <div className="relative aspect-[5/7] w-full">
        <Image
          alt={template.name}
          className="h-full w-full object-cover"
          height={640}
          sizes="(max-width: 768px) 80vw, 280px"
          src={template.coverImagePath}
          width={450}
        />
        <span
          className="absolute left-3 top-3 rounded-[var(--radius-pill)] bg-bg-raised/85 px-3 py-1 text-[9px] uppercase tracking-[var(--tracking-luxe)] backdrop-blur-md"
          style={{ color: template.palette.accent }}
        >
          {template.categoryName}
        </span>
        <span
          aria-hidden="true"
          className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full border bg-bg-raised/90 font-display text-[12px]"
          style={{ borderColor: template.palette.accent, color: template.palette.accent }}
        >
          {initials(template.name)}
        </span>
      </div>

      <figcaption className="flex flex-col gap-2 border-t px-4 py-4" style={{ borderColor: template.palette.accent }}>
        <p className="font-display text-[20px] font-light text-ink">{template.name}</p>
        <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[var(--tracking-luxe)]" style={{ color: template.palette.accent }}>
          <span>{models.qr}</span>
          <span className="rounded-[var(--radius-pill)] border px-3 py-1" style={{ borderColor: template.palette.accent }}>
            {models.open}
          </span>
        </div>
      </figcaption>
    </figure>
  )
}
