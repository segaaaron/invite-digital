'use client'

import { Component, type ReactNode } from 'react'

type Props = { fallback: ReactNode; children: ReactNode }
type State = { failed: boolean }

/**
 * Suspense only covers the pending state. If the three.js chunk fails to download —
 * a flaky mobile network, a deploy that invalidated the hash — the error would reach
 * the page and take the whole hero down instead of falling back to the poster.
 */
export class SceneBoundary extends Component<Props, State> {
  override state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  override componentDidCatch(error: unknown): void {
    console.error('La escena 3D del hero no pudo cargarse; se muestra el póster.', error)
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
