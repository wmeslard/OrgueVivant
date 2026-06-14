const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ')

export function useFocusTrap(containerRef: Ref<HTMLElement | null | undefined>) {
  let previouslyFocused: HTMLElement | null = null

  function getFocusable() {
    if (!containerRef.value) return []
    return Array.from(containerRef.value.querySelectorAll<HTMLElement>(FOCUSABLE))
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return
    const nodes = getFocusable()
    if (!nodes.length) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }

  function activate() {
    previouslyFocused = document.activeElement as HTMLElement
    document.addEventListener('keydown', onKeydown)
    nextTick(() => getFocusable()[0]?.focus())
  }

  function deactivate() {
    document.removeEventListener('keydown', onKeydown)
    previouslyFocused?.focus()
  }

  return { activate, deactivate }
}
