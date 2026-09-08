export interface NewsItem {
  id: string
  title: string
  title_en?: string
  body: string
  body_en?: string
  published_at: string // YYYY-MM-DD
  author?: string
  image_url?: string
  created_at?: string
}

export function useNews() {
  const supabase = useSupabaseClient()
  const all = useState<NewsItem[]>('news', () => [])
  const pending = useState<boolean>('news-pending', () => false)

  async function fetchNews() {
    pending.value = true
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('published_at', { ascending: false })
      if (error) throw error
      all.value = ((data as NewsItem[]) ?? []).sort(
        (a, b) => b.published_at.slice(0, 10).localeCompare(a.published_at.slice(0, 10))
      )
    } catch {
      all.value = []
    } finally {
      pending.value = false
    }
  }

  // Une actualité reste affichée une semaine après sa date de publication, puis
  // bascule dans les archives.
  const VISIBLE_DAYS = 7

  /**
   * Date plancher de visibilité. Le retrait en jours traverse correctement les
   * changements de mois et d'année, sans le débordement que produisait un
   * retrait en mois sur les mois plus courts.
   */
  function visibilityCutoff() {
    const d = new Date()
    d.setDate(d.getDate() - VISIBLE_DAYS)
    return d.toISOString().slice(0, 10)
  }

  const day = (n: NewsItem) => n.published_at.slice(0, 10)
  const byDateDesc = (a: NewsItem, b: NewsItem) => day(b).localeCompare(day(a))

  /** Actualités encore à l'affiche : à venir, ou datées de moins d'un mois. */
  const current = computed(() =>
    [...all.value].filter(n => day(n) >= visibilityCutoff()).sort(byDateDesc)
  )

  /** Actualités passées depuis plus d'un mois. */
  const archived = computed(() =>
    [...all.value].filter(n => day(n) < visibilityCutoff()).sort(byDateDesc)
  )

  const latest = computed(() => current.value.slice(0, 3))

  async function createNews(n: Partial<NewsItem>) {
    await $fetch('/api/admin/news', { method: 'POST', body: n })
  }

  async function updateNews(id: string, n: Partial<NewsItem>) {
    await $fetch(`/api/admin/news/${id}`, { method: 'PATCH', body: n })
  }

  async function deleteNews(id: string) {
    await $fetch(`/api/admin/news/${id}`, { method: 'DELETE' })
  }

  return { all, pending, latest, current, archived, fetchNews, createNews, updateNews, deleteNews }
}
