<script setup lang="ts">
import type { Concert } from '~/composables/useConcerts'

definePageMeta({ middleware: 'auth', layout: 'admin' })

const { t } = useI18n()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const isSuperAdmin = computed(() =>
  (user.value?.app_metadata as Record<string, unknown>)?.role === 'super_admin'
)
const { all, fetchConcerts, createConcert, updateConcert, deleteConcert } = useConcerts()

await fetchConcerts()

const editing = ref<Partial<Concert> | null>(null)
const saving = ref(false)
const error = ref('')

function blank(): Partial<Concert> {
  return {
    title: '', date: '', time: '20:00',
    location: 'saint_maurice', artists: '', instruments: '',
    description: '', image_url: '', duration: '', price_type: 'free',
    external_link: ''
  }
}

function newOne() { editing.value = blank() }
function edit(c: Concert) { editing.value = { ...c } }
function cancel() { editing.value = null; error.value = '' }

async function save() {
  if (!editing.value) return
  saving.value = true; error.value = ''
  const isNew = !editing.value.id
  try {
    if (editing.value.external_link) {
      try {
        const u = new URL(editing.value.external_link)
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          throw new Error('Lien externe invalide (http/https uniquement)')
        }
      } catch {
        throw new Error('Lien externe invalide')
      }
    }
    if (editing.value.description) {
      const { translated } = await $fetch<{ translated: string }>('/api/translate', {
        method: 'POST',
        body: { text: editing.value.description }
      })
      editing.value.description_en = translated
    }
    if (editing.value.id) {
      await updateConcert(editing.value.id, editing.value)
    } else {
      await createConcert(editing.value)
    }
    if (isNew) {
      $fetch('/api/newsletter/broadcast', {
        method: 'POST',
        body: { type: 'concert', data: editing.value }
      }).catch(() => {})
    }
    editing.value = null
    await fetchConcerts()
  } catch (e: any) {
    error.value = e.message || 'Error'
  } finally {
    saving.value = false
  }
}

async function remove(c: Concert) {
  if (!confirm(t('admin.confirmDelete'))) return
  await deleteConcert(c.id)
  await fetchConcerts()
}

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

    <!-- Nav tabs -->
    <nav class="mb-8 flex gap-6 border-b border-ink-200 dark:border-ink-800">
      <NuxtLink
        to="/admin/concerts"
        class="pb-3 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900 dark:hover:text-ink-100"
        active-class="border-b-2 border-gold text-ink-900 dark:text-ink-100"
      >
        {{ t('admin.concerts') }}
      </NuxtLink>
      <NuxtLink
        to="/admin/news"
        class="pb-3 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900 dark:hover:text-ink-100"
        active-class="border-b-2 border-gold text-ink-900 dark:text-ink-100"
      >
        {{ t('admin.news') }}
      </NuxtLink>
    </nav>

    <!-- Editor -->
    <form v-if="editing" class="mb-10 rounded-2xl border border-ink-200 p-6 dark:border-ink-800" @submit.prevent="save">
      <h2 class="mb-6 font-display text-2xl">{{ editing.id ? t('admin.editing') : t('admin.new') }}</h2>
      <div class="grid gap-5 md:grid-cols-2">
        <div class="md:col-span-2">
          <label class="label">{{ t('admin.fields.title') }}</label>
          <input v-model="editing.title" required class="input">
        </div>
        <div>
          <label class="label">{{ t('admin.fields.date') }}</label>
          <input v-model="editing.date" type="date" required class="input">
        </div>
        <div>
          <label class="label">{{ t('admin.fields.time') }}</label>
          <input v-model="editing.time" type="time" class="input">
        </div>
        <div>
          <label class="label">{{ t('admin.fields.location') }}</label>
          <select v-model="editing.location" class="input">
            <option value="saint_maurice">Saint-Maurice</option>
            <option value="saint_etienne">Saint-Étienne</option>
          </select>
        </div>
        <div>
          <label class="label">{{ t('admin.fields.price') }}</label>
          <select v-model="editing.price_type" class="input">
            <option value="free">{{ t('modal.free') }}</option>
            <option value="paid">{{ t('modal.paid') }}</option>
          </select>
        </div>
        <div>
          <label class="label">{{ t('admin.fields.artists') }}</label>
          <input v-model="editing.artists" class="input">
        </div>
        <div>
          <label class="label">{{ t('admin.fields.instruments') }}</label>
          <input v-model="editing.instruments" class="input">
        </div>
        <div>
          <label class="label">{{ t('admin.fields.duration') }}</label>
          <input v-model="editing.duration" placeholder="1h30" class="input">
        </div>
        <div>
          <label class="label">{{ t('admin.fields.externalLink') }}</label>
          <input v-model="editing.external_link" type="url" class="input">
        </div>
        <div class="md:col-span-2">
          <label class="label">{{ t('admin.fields.imageUrl') }}</label>
          <ImageUpload
            :model-value="editing.image_url || null"
            @update:model-value="editing.image_url = $event"
          />
        </div>
        <div class="md:col-span-2">
          <label class="label">{{ t('admin.fields.description') }}</label>
          <textarea v-model="editing.description" rows="4" class="input resize-none" />
        </div>
      </div>
      <div v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</div>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn-ghost" @click="cancel">{{ t('admin.cancel') }}</button>
        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? '…' : t('admin.save') }}
        </button>
      </div>
    </form>

    <!-- List -->
    <button
      v-if="!editing"
      class="mb-4 text-sm text-gold hover:text-gold/70 transition-colors"
      @click="newOne"
    >
      + Ajouter un concert
    </button>
    <div class="overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800">
      <table class="w-full text-left text-sm">
        <thead class="bg-ink-50 text-xs uppercase tracking-wider text-ink-500 dark:bg-ink-900">
          <tr>
            <th class="px-4 py-3">{{ t('admin.fields.title') }}</th>
            <th class="px-4 py-3">{{ t('admin.fields.date') }}</th>
            <th class="px-4 py-3">{{ t('admin.fields.location') }}</th>
            <th class="px-4 py-3 text-right">{{ t('admin.fields.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in all" :key="c.id" class="border-t border-ink-100 dark:border-ink-800">
            <td class="px-4 py-3 font-medium">{{ c.title }}</td>
            <td class="px-4 py-3">{{ c.date }} {{ c.time }}</td>
            <td class="px-4 py-3">{{ t(`locations.${c.location}`) }}</td>
            <td class="px-4 py-3 text-right">
              <button class="mr-2 text-sm underline" @click="edit(c)">{{ t('admin.edit') }}</button>
              <button class="text-sm text-red-600 underline" @click="remove(c)">{{ t('admin.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
