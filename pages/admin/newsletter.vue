<script setup lang="ts">
import type { Concert } from '~/composables/useConcerts'
import type { NewsItem } from '~/composables/useNews'

definePageMeta({ middleware: 'auth', layout: 'admin' })

const { t } = useI18n()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const isSuperAdmin = computed(() =>
  (user.value?.app_metadata as Record<string, unknown>)?.role === 'super_admin'
)

const { all: concerts, fetchConcerts } = useConcerts()
const { all: news, fetchNews } = useNews()
const { show: showToast } = useToast()

interface Subscriber { id: string; email: string; subscribed_at: string }

const subscribers = ref<Subscriber[]>([])
const loadingSubs = ref(false)

async function loadSubscribers() {
  loadingSubs.value = true
  try {
    const res = await $fetch<{ count: number; subscribers: Subscriber[] }>(
      '/api/admin/newsletter/subscribers'
    )
    subscribers.value = res.subscribers
  } catch {
    subscribers.value = []
  } finally {
    loadingSubs.value = false
  }
}

await Promise.all([fetchConcerts(), fetchNews(), loadSubscribers()])

// ── Sélection de l'annonce à envoyer ─────────────────────────────────────────

const kind = ref<'concert' | 'news'>('concert')
const selectedId = ref<string>('')

const options = computed(() =>
  kind.value === 'concert'
    ? [...concerts.value].sort((a, b) => b.date.localeCompare(a.date))
      .map(c => ({ id: c.id, label: `${c.date} — ${c.title}` }))
    : [...news.value].map(n => ({
      id: n.id,
      label: `${n.published_at.slice(0, 10)} — ${n.title}`
    }))
)

watch(kind, () => { selectedId.value = '' })

const selected = computed<Concert | NewsItem | null>(() => {
  if (!selectedId.value) return null
  return kind.value === 'concert'
    ? concerts.value.find(c => c.id === selectedId.value) ?? null
    : news.value.find(n => n.id === selectedId.value) ?? null
})

// ── Envoi ────────────────────────────────────────────────────────────────────

const sending = ref(false)
const error = ref('')
const lastSent = ref<number | null>(null)

async function send() {
  if (!selected.value || !subscribers.value.length) return
  const label = kind.value === 'concert'
    ? (selected.value as Concert).title
    : (selected.value as NewsItem).title
  if (!confirm(t('admin.newsletterConfirm', { n: subscribers.value.length, title: label }))) return

  sending.value = true
  error.value = ''
  try {
    const res = await $fetch<{ ok: boolean; sent: number; dev?: boolean }>(
      '/api/newsletter/broadcast',
      { method: 'POST', body: { type: kind.value, data: selected.value } }
    )
    lastSent.value = res.sent
    showToast(t('admin.newsletterSent', { n: res.sent }), { type: 'success' })
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Erreur'
  } finally {
    sending.value = false
  }
}

async function removeSubscriber(s: Subscriber) {
  if (!confirm(t('admin.newsletterConfirmDelete', { email: s.email }))) return
  try {
    await $fetch(`/api/admin/newsletter/${s.id}`, { method: 'DELETE' })
    subscribers.value = subscribers.value.filter(x => x.id !== s.id)
    showToast(t('admin.deleted'), { type: 'info' })
  } catch {
    showToast('Erreur', { type: 'error' })
  }
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

async function logout() {
  await supabase.auth.signOut()
  await navigateTo('/admin/login')
}
</script>

<template>
  <div class="container-apple py-20">
    <header class="mb-10 flex items-center justify-between">
      <div>
        <div class="text-xs uppercase tracking-widest text-accent">{{ t('admin.eyebrow') }}</div>
        <h1 class="heading-section mt-2">{{ t('admin.dashboard') }}</h1>
        <p v-if="user" class="mt-2 text-sm text-ink-500">{{ user.email }}</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink v-if="isSuperAdmin" to="/admin/users" class="btn-ghost">
          Gestion des comptes
        </NuxtLink>
        <button class="btn-ghost" @click="logout">{{ t('admin.logout') }}</button>
      </div>
    </header>

    <AdminNav />

    <!-- Composer un envoi -->
    <section class="mb-12 rounded-2xl border border-ink-200 p-6 dark:border-ink-800">
      <h2 class="font-display text-2xl">{{ t('admin.newsletterCompose') }}</h2>
      <p class="mt-2 text-sm text-ink-500">{{ t('admin.newsletterHelp') }}</p>

      <div class="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <label class="label">{{ t('admin.newsletterKind') }}</label>
          <select v-model="kind" class="input">
            <option value="concert">{{ t('admin.concerts') }}</option>
            <option value="news">{{ t('admin.news') }}</option>
          </select>
        </div>
        <div>
          <label class="label">{{ t('admin.newsletterPick') }}</label>
          <select v-model="selectedId" class="input">
            <option value="">—</option>
            <option v-for="o in options" :key="o.id" :value="o.id">{{ o.label }}</option>
          </select>
        </div>
      </div>

      <div v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</div>

      <div class="mt-6 flex flex-wrap items-center gap-4">
        <button
          class="btn-primary"
          :disabled="!selectedId || sending || !subscribers.length"
          @click="send"
        >
          <Icon v-if="sending" name="heroicons:arrow-path" class="mr-2 h-4 w-4 animate-spin" />
          {{ t('admin.newsletterSend') }}
        </button>
        <span class="text-sm text-ink-500">
          {{ t('admin.newsletterRecipients', { n: subscribers.length }) }}
        </span>
        <span v-if="lastSent !== null" class="text-sm text-gold">
          {{ t('admin.newsletterSent', { n: lastSent }) }}
        </span>
      </div>
    </section>

    <!-- Abonnés -->
    <section>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="font-display text-2xl">{{ t('admin.newsletterSubscribers') }}</h2>
        <button class="text-sm text-gold hover:text-gold/70" @click="loadSubscribers">
          {{ t('admin.newsletterRefresh') }}
        </button>
      </div>

      <div v-if="loadingSubs" class="text-sm text-ink-500">…</div>
      <div v-else-if="!subscribers.length" class="text-sm text-ink-500">
        {{ t('admin.newsletterEmpty') }}
      </div>
      <div v-else class="overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800">
        <table class="w-full text-left text-sm">
          <thead class="bg-ink-50 text-xs uppercase tracking-wider text-ink-500 dark:bg-ink-900">
            <tr>
              <th class="px-4 py-3">{{ t('contact.email') }}</th>
              <th class="px-4 py-3">{{ t('admin.newsletterSince') }}</th>
              <th class="px-4 py-3 text-right">{{ t('admin.fields.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in subscribers" :key="s.id" class="border-t border-ink-100 dark:border-ink-800">
              <td class="px-4 py-3 font-medium">{{ s.email }}</td>
              <td class="px-4 py-3 text-ink-500">{{ formatDate(s.subscribed_at) }}</td>
              <td class="px-4 py-3 text-right">
                <button class="text-sm text-red-600 underline" @click="removeSubscriber(s)">
                  {{ t('admin.delete') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <AdminToast />
  </div>
</template>
