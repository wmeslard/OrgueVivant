/** Le motif B-A-C-H tapé au clavier, hors champ de saisie (voir useBach). */
export default defineNuxtPlugin(() => {
  const { saisir, found } = useBach()
  window.addEventListener('keydown', (e) => {
    if (found.value || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return
    const el = e.target as HTMLElement | null
    if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return
    if (/[a-z]/i.test(e.key)) saisir(e.key)
  })
})
