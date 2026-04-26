export interface Concert {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  location: 'saint_maurice' | 'saint_etienne'
  artists: string
  instruments: string
  description: string
  description_en?: string
  image_url: string
  duration: string
  price_type: 'free' | 'paid'
  external_link: string
  created_at?: string
}

export function useConcerts() {
  const supabase = useSupabaseClient()
  const all = useState<Concert[]>('concerts', () => [])
  const pending = useState<boolean>('concerts-pending', () => false)

  async function fetchConcerts() {
    pending.value = true
    try {
      const { data, error } = await supabase
        .from('concerts')
        .select('*')
        .order('date', { ascending: true })

      if (error) throw error
      all.value = (data as Concert[]) ?? []
    } catch {
      all.value = []
    } finally {
      pending.value = false
    }
  }

  const now = () => new Date().toISOString().slice(0, 10)

  const upcoming = computed(() =>
    [...all.value]
      .filter(c => c.date >= now())
      .sort((a, b) => a.date.localeCompare(b.date))
  )

  const past = computed(() =>
    [...all.value]
      .filter(c => c.date < now())
      .sort((a, b) => b.date.localeCompare(a.date))
  )

  async function createConcert(c: Partial<Concert>) {
    await $fetch('/api/admin/concerts', { method: 'POST', body: c })
  }

  async function updateConcert(id: string, c: Partial<Concert>) {
    await $fetch(`/api/admin/concerts/${id}`, { method: 'PATCH', body: c })
  }

  async function deleteConcert(id: string) {
    await $fetch(`/api/admin/concerts/${id}`, { method: 'DELETE' })
  }

  return { all, pending, upcoming, past, fetchConcerts, createConcert, updateConcert, deleteConcert }
}
