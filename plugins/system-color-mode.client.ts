export default defineNuxtPlugin(() => {
  // Clean up any leftover manual preference from previous versions
  localStorage.removeItem('ov-manual-color-mode')

  const colorMode = useColorMode()
  const mq = window.matchMedia('(prefers-color-scheme: dark)')

  function applyDark(dark: boolean) {
    colorMode.preference = dark ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', dark)
  }

  // System always wins — override any manual toggle
  mq.addEventListener('change', (e) => applyDark(e.matches))

  // Apply system preference on first load
  applyDark(mq.matches)
})
