<script setup lang="ts">
import type { NewsItem } from '~/composables/useNews'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const isSuperAdmin = computed(() =>
  (user.value?.app_metadata as Record<string, unknown>)?.role === 'super_admin'
)
const { all, fetchNews, createNews, updateNews, deleteNews } = useNews()

await fetchNews()

const editing = ref<Partial<NewsItem> | null>(null)
const saving = ref(false)
const error = ref('')

function blank(): Partial<NewsItem> {
  return { title: '', published_at: new Date().toISOString().slice(0, 10), body: '', author: '', image_url: '' }
}

function newOne() { editing.value = blank() }
function edit(n: NewsItem) {
  editing.value = { ...n, published_at: n.published_at?.slice(0, 10) ?? '' }
}
function cancel() { editing.value = null; error.value = '' }

async function save() {
  if (!editing.value) return
  saving.value = true; error.value = ''
  const isNew = !editing.value.id
  try {
    if (editing.value.title) {
      const { translated: titleEn } = await $fetch<{ translated: string }>('/api/translate', {
        method: 'POST',
        body: { text: editing.value.title }
      })
      editing.value.title_en = titleEn
    }
    if (editing.value.body) {
      const { translated: bodyEn } = await $fetch<{ translated: string }>('/api/translate', {
        method: 'POST',
        body: { text: editing.value.body }
      })
      editing.value.body_en = bodyEn
    }
    if (editing.value.id) {
      await updateNews(editing.value.id, editing.value)
    } else {
      await createNews(editing.value)
    }
    if (isNew) {
      $fetch('/api/newsletter/broadcast', {
        method: 'POST',
        body: { type: 'news', data: editing.value }
      }).catch(() => {})
    }
    editing.value = null
    await fetchNews()
  } catch (e: any) {
    error.value = e.message || 'Erreur'
  } finally {
    saving.value = false
  }
}

async function remove(n: NewsItem) {
  if (!confirm(t('admin.confirmDeleteNews'))) return
  await deleteNews(n.id)
  await fetchNews()
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
      <h2 class="mb-6 font-display text-2xl">{{ editing.id ? t('admin.editingNews') : t('admin.newNews') }}</h2>
      <div class="grid gap-5 md:grid-cols-2">
        <div class="md:col-span-2">
          <label class="label">{{ t('admin.fields.title') }}</label>
          <input v-model="editing.title" required class="input">
        </div>
        <div>
          <label class="label">{{ t('admin.fields.publishedAt') }}</label>
          <input v-model="editing.published_at" type="date" required class="input">
        </div>
        <div>
          <label class="label">
            {{ t('admin.fields.author') }}
            <span class="ml-1 text-ink-400 font-normal">({{ t('admin.optional') }})</span>
          </label>
          <input v-model="editing.author" class="input" :placeholder="t('admin.fields.authorPlaceholder')">
        </div>
        <div class="md:col-span-2">
          <label class="label">
            {{ t('admin.fields.imageUrl') }}
            <span class="ml-1 text-ink-400 font-normal">({{ t('admin.optional') }})</span>
          </label>
          <ImageUpload
            :model-value="editing.image_url || null"
            @update:model-value="editing.image_url = $event || ''"
          />
        </div>
        <div class="md:col-span-2">
          <label class="label">{{ t('admin.fields.body') }}</label>
          <textarea v-model="editing.body" rows="6" required class="input resize-none" />
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
      + Ajouter une actualité
    </button>
    <div class="overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800">
      <table class="w-full text-left text-sm">
        <thead class="bg-ink-50 text-xs uppercase tracking-wider text-ink-500 dark:bg-ink-900">
          <tr>
            <th class="px-4 py-3">{{ t('admin.fields.title') }}</th>
            <th class="px-4 py-3">{{ t('admin.fields.publishedAt') }}</th>
            <th class="px-4 py-3 text-right">{{ t('admin.fields.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in all" :key="n.id" class="border-t border-ink-100 dark:border-ink-800">
            <td class="px-4 py-3 font-medium">{{ n.title }}</td>
            <td class="px-4 py-3">{{ n.published_at }}</td>
            <td class="px-4 py-3 text-right">
              <button class="mr-2 text-sm underline" @click="edit(n)">{{ t('admin.edit') }}</button>
              <button class="text-sm text-red-600 underline" @click="remove(n)">{{ t('admin.delete') }}</button>
            </td>
          </tr>
          <tr v-if="all.length === 0">
            <td colspan="3" class="px-4 py-8 text-center text-ink-400">Aucune actualité</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
