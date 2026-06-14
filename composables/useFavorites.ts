const KEY = 'ov_favorites'

export function useFavorites() {
  const favorites = ref<string[]>([])

  if (import.meta.client) {
    try { favorites.value = JSON.parse(localStorage.getItem(KEY) || '[]') } catch {}
  }

  function toggle(id: string) {
    const idx = favorites.value.indexOf(id)
    if (idx > -1) favorites.value.splice(idx, 1)
    else favorites.value.push(id)
    if (import.meta.client) localStorage.setItem(KEY, JSON.stringify(favorites.value))
  }

  function isFavorite(id: string) {
    return favorites.value.includes(id)
  }

  return { favorites, toggle, isFavorite }
}
