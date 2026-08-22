import type { ReactNode } from 'react'
import { requireSession } from '@/modules/identity/session-cookie'
import { rootNav } from '@/modules/shell/ui/nav'
import { PanelFrame } from '@/modules/shell/ui/PanelFrame'

/** La carcasa fuera de un evento: la bandeja, el evento nuevo y la ayuda. */
export default async function AtelierLayout({ children }: { children: ReactNode }) {
  await requireSession()

  return (
    <PanelFrame brandSub="ATELIER" sections={rootNav()}>
      {children}
    </PanelFrame>
  )
}
