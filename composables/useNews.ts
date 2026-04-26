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

  const today = () => new Date().toISOString().slice(0, 10)

  const latest = computed(() =>
    [...all.value]
      .filter(n => n.published_at.slice(0, 10) >= today())
      .sort((a, b) => a.published_at.slice(0, 10).localeCompare(b.published_at.slice(0, 10)))
      .slice(0, 3)
  )

  async function createNews(n: Partial<NewsItem>) {
    await $fetch('/api/admin/news', { method: 'POST', body: n })
  }

  async function updateNews(id: string, n: Partial<NewsItem>) {
    await $fetch(`/api/admin/news/${id}`, { method: 'PATCH', body: n })
  }

  async function deleteNews(id: string) {
    await $fetch(`/api/admin/news/${id}`, { method: 'DELETE' })
  }

  return { all, pending, latest, fetchNews, createNews, updateNews, deleteNews }
}
