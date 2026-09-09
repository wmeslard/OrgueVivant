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

// ── Sélection ────────────────────────────────────────────────────────────────

const kind = ref<'concert' | 'news'>('concert')
const selectedId = ref('')

const options = computed(() =>
  kind.value === 'concert'
    ? [...concerts.value].sort((a, b) => b.date.localeCompare(a.date))
      .map(c => ({ id: c.id, label: `${c.date} — ${c.title}` }))
    : [...news.value].map(n => ({
      id: n.id,
      label: `${n.published_at.slice(0, 10)} — ${n.title}`
    }))
)

// ── Champs éditables, pré-remplis depuis l'élément choisi ────────────────────
// L'envoi part de ce brouillon, jamais de l'élément d'origine : modifier ici
// ne touche donc pas le concert ni l'actualité publiés sur le site.

const draft = ref<Record<string, string>>({})
const subject = ref('')

/** Champs proposés selon le type, dans l'ordre où ils apparaissent dans l'email. */
const fields = computed(() =>
  kind.value === 'concert'
    ? [
      { key: 'title', label: t('admin.fields.title') },
      { key: 'date', label: t('admin.fields.date'), type: 'date' },
      { key: 'time', label: t('admin.fields.time'), type: 'time' },
      { key: 'location', label: t('admin.fields.location'), select: 'location' },
      { key: 'price_type', label: t('admin.fields.price'), select: 'price' },
      { key: 'artists', label: t('admin.fields.artists') },
      { key: 'image_url', label: t('admin.fields.imageUrl') },
      { key: 'description', label: t('admin.fields.description'), area: true }
    ]
    : [
      { key: 'title', label: t('admin.fields.title') },
      { key: 'published_at', label: t('admin.fields.date'), type: 'date' },
      { key: 'image_url', label: t('admin.fields.imageUrl') },
      { key: 'body', label: t('admin.fields.description'), area: true }
    ]
)

function fillDraft() {
  if (!selectedId.value) { draft.value = {}; subject.value = ''; return }
  if (kind.value === 'concert') {
    const c = concerts.value.find(x => x.id === selectedId.value)
    if (!c) return
    draft.value = {
      title: c.title ?? '', date: c.date ?? '', time: c.time ?? '',
      location: c.location ?? 'saint_maurice', price_type: c.price_type ?? 'free',
      artists: c.artists ?? '', image_url: c.image_url ?? '', description: c.description ?? ''
    }
    subject.value = `Nouveau concert : ${c.title}`
  } else {
    const n = news.value.find(x => x.id === selectedId.value)
    if (!n) return
    draft.value = {
      title: n.title ?? '', published_at: (n.published_at ?? '').slice(0, 10),
      image_url: n.image_url ?? '', body: n.body ?? ''
    }
    subject.value = `Actualité : ${n.title}`
  }
}

watch(selectedId, fillDraft)
watch(kind, () => { selectedId.value = ''; draft.value = {}; subject.value = '' })

// ── Prévisualisation ─────────────────────────────────────────────────────────
// Rendue par le serveur avec le gabarit d'envoi : l'aperçu correspond donc
// exactement à ce qui partira.

const previewHtml = ref('')
const previewing = ref(false)
let previewTimer: ReturnType<typeof setTimeout> | null = null

async function refreshPreview() {
  if (!selectedId.value) { previewHtml.value = ''; return }
  previewing.value = true
  try {
    const res = await $fetch<{ html: string }>('/api/admin/newsletter/preview', {
      method: 'POST',
      body: { type: kind.value, data: { ...draft.value, id: selectedId.value } }
    })
    previewHtml.value = res.html
  } catch {
    previewHtml.value = ''
  } finally {
    previewing.value = false
  }
}

// Le rendu est demandé au serveur : on attend une pause de frappe.
watch([draft, selectedId], () => {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(refreshPreview, 400)
}, { deep: true })

// ── Envoi ────────────────────────────────────────────────────────────────────

const sending = ref(false)
const error = ref('')
const lastSent = ref<number | null>(null)

async function send() {
  if (!selectedId.value || !subscribers.value.length) return
  if (!confirm(t('admin.newsletterConfirm', {
    n: subscribers.value.length, title: draft.value.title || ''
  }))) return

  sending.value = true
  error.value = ''
  try {
    const res = await $fetch<{ ok: boolean; sent: number }>('/api/newsletter/broadcast', {
      method: 'POST',
      body: {
        type: kind.value,
        data: { ...draft.value, id: selectedId.value },
        subject: subject.value
      }
    })
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

    <section class="mb-12">
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

      <!-- Édition + aperçu, côte à côte sur grand écran -->
      <div v-if="selectedId" class="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h3 class="mb-4 text-xs font-bold uppercase tracking-widest text-ink-500">
            {{ t('admin.newsletterEdit') }}
          </h3>
          <p class="mb-5 text-xs text-ink-500">{{ t('admin.newsletterEditHelp') }}</p>

          <div class="space-y-4">
            <div>
              <label class="label">{{ t('admin.newsletterSubject') }}</label>
              <input v-model="subject" class="input">
            </div>

            <div v-for="f in fields" :key="f.key">
              <label class="label">{{ f.label }}</label>
              <select v-if="f.select === 'location'" v-model="draft[f.key]" class="input">
                <option value="saint_maurice">Saint-Maurice</option>
                <option value="saint_etienne">Saint-Étienne</option>
              </select>
              <select v-else-if="f.select === 'price'" v-model="draft[f.key]" class="input">
                <option value="free">{{ t('modal.free') }}</option>
                <option value="paid">{{ t('modal.paid') }}</option>
              </select>
              <textarea
                v-else-if="f.area"
                v-model="draft[f.key]"
                rows="8"
                class="input resize-y leading-relaxed"
              />
              <input v-else v-model="draft[f.key]" :type="f.type || 'text'" class="input">
            </div>
          </div>
        </div>

        <div>
          <h3 class="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-500">
            {{ t('admin.newsletterPreview') }}
            <Icon v-if="previewing" name="heroicons:arrow-path" class="h-3 w-3 animate-spin" />
          </h3>
          <div class="overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800">
            <iframe
              v-if="previewHtml"
              :srcdoc="previewHtml"
              :title="t('admin.newsletterPreview')"
              sandbox=""
              class="h-[720px] w-full bg-[#0a0a0a]"
            />
            <div v-else class="flex h-[720px] items-center justify-center text-sm text-ink-500">
              …
            </div>
          </div>
        </div>
      </div>

      <div v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</div>

      <div class="mt-8 flex flex-wrap items-center gap-4">
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
