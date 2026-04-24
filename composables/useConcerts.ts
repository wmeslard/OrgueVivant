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

// Mock fallback if Supabase isn't configured yet.
const MOCK: Concert[] = [
  {
    id: 'mock-1',
    title: 'Récital Bach — Toccata & Fugue',
    date: '2026-05-17', time: '20:30',
    location: 'saint_maurice',
    artists: 'Élisabeth Joyé',
    instruments: 'Grand orgue Cavaillé-Coll',
    description: 'Un parcours à travers les œuvres majeures de Jean-Sébastien Bach, de la Toccata en ré mineur aux chorals de Leipzig.',
    image_url: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=60',
    duration: '1h15',
    price_type: 'free',
    external_link: ''
  },
  {
    id: 'mock-2',
    title: 'Nuit des orgues — Improvisations',
    date: '2026-06-21', time: '21:00',
    location: 'saint_etienne',
    artists: 'Thierry Escaich',
    instruments: 'Orgue historique',
    description: 'Improvisations libres sur des thèmes proposés par le public, à l\'occasion de la Fête de la Musique.',
    image_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=60',
    duration: '1h30',
    price_type: 'paid',
    external_link: 'https://example.com/billetterie'
  },
  {
    id: 'mock-3',
    title: 'Musique française — Vierne, Widor',
    date: '2026-07-12', time: '20:00',
    location: 'saint_maurice',
    artists: 'Olivier Latry',
    instruments: 'Grand orgue',
    description: 'Les grandes pages symphoniques de l\'école française.',
    image_url: 'https://images.unsplash.com/photo-1519683384663-1b3d7b9d5e3f?auto=format&fit=crop&w=1200&q=60',
    duration: '1h20',
    price_type: 'free',
    external_link: ''
  },
  {
    id: 'mock-4',
    title: 'Chorals de Noël',
    date: '2025-12-22', time: '18:00',
    location: 'saint_etienne',
    artists: 'Ensemble Vox Clamantis',
    instruments: 'Orgue & chœur',
    description: 'Une soirée de chorals luthériens et motets pour le temps de l\'Avent.',
    image_url: 'https://images.unsplash.com/photo-1482366554080-0dbd0affa46a?auto=format&fit=crop&w=1200&q=60',
    duration: '1h',
    price_type: 'free',
    external_link: ''
  }
]

export function useConcerts() {
  const supabase = useSupabaseClient()
  const all = useState<Concert[]>('concerts', () => [])
  const pending = useState<boolean>('concerts-pending', () => false)

  function isSupabaseConfigured() {
    const config = useRuntimeConfig()
    const url = config.public.supabaseUrl as string | undefined
    return url && !url.includes('xxxxx') && !url.includes('example')
  }

  async function fetchConcerts() {
    pending.value = true

    if (!isSupabaseConfigured()) {
      all.value = MOCK
      pending.value = false
      return
    }

    try {
      const { data, error } = await supabase
        .from('concerts')
        .select('*')
        .order('date', { ascending: true })

      all.value = (error || !data || data.length === 0) ? MOCK : (data as Concert[])
    } catch {
      all.value = MOCK
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
    const { error } = await supabase.from('concerts').insert(c)
    if (error) throw error
  }

  async function updateConcert(id: string, c: Partial<Concert>) {
    const { id: _id, created_at, ...rest } = c as any
    const { error } = await supabase.from('concerts').update(rest).eq('id', id)
    if (error) throw error
  }

  async function deleteConcert(id: string) {
    const { error } = await supabase.from('concerts').delete().eq('id', id)
    if (error) throw error
  }

  return { all, pending, upcoming, past, fetchConcerts, createConcert, updateConcert, deleteConcert }
}
