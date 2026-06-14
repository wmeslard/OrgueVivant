export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
  undo?: () => void
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
  function show(message: string, options: { type?: Toast['type'], duration?: number, undo?: () => void } = {}) {
    const { type = 'success', duration = 3500, undo } = options
    const id = ++nextId
    toasts.value.push({ id, message, type, undo })
    setTimeout(() => dismiss(id), duration)
    return id
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return { toasts, show, dismiss }
}
