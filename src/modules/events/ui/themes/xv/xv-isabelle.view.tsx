import type { ThemeProps } from '../contract'
import { PIEL } from './xv-isabelle.skin'
import { XvSharedView } from './xv.view'

/** «Palacio Griego» — Isabelle, de `invites-1.jsx` (`QuinceInviteIsabelleGriego`, maqueta V3). */
export function XvIsabelleView(props: ThemeProps) {
  return <XvSharedView {...props} piel={PIEL} />
}
