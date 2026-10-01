<script setup lang="ts">
/**
 * Corbeille d'un type de contenu (concerts ou actualités), en bas de sa page
 * d'administration. Ce qui est supprimé y reste trente jours, restaurable,
 * puis Supabase l'efface pour de bon (voir supabase/corbeille.sql).
 */
const props = defineProps<{ type: 'concerts' | 'news' }>()
const emit = defineEmits<{ (e: 'restaure'): void }>()

const { t, locale } = useI18n()
const { show: showToast } = useToast()

interface Element { id: string; title: string; date: string | null; deleted_at: string; deleted_by: string | null }
const { data, refresh } = await useFetch<{ installee: boolean; delaiJours: number; elements: Element[] }>(
  '/api/admin/corbeille', { query: { type: props.type }, key: `corbeille-${props.type}` })

const ouvert = ref(false)
const busy = ref(false)
const elements = computed(() => data.value?.elements ?? [])

const jour = (d: string) => new Date(d).toLocaleDateString(locale.value, { day: 'numeric', month: 'long', year: 'numeric' })
function effaceLe(e: Element) {
  const d = new Date(e.deleted_at); d.setDate(d.getDate() + (data.value?.delaiJours ?? 30)); return jour(d.toISOString())
}

async function restaurer(e: Element) {
  busy.value = true
  try {
    await $fetch('/api/admin/corbeille/restaurer', { method: 'POST', body: { type: props.type, id: e.id } })
    await refresh()
    emit('restaure')
    showToast(t('admin.trash.restored'), { type: 'success' })
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Erreur', { type: 'error' })
  } finally { busy.value = false }
}
</script>

<template>
  <section v-if="data" class="mt-12">
    <button
      class="flex items-center gap-2 text-sm text-ink-500 transition-colors hover:text-ink-900 dark:hover:text-ink-100"
      :aria-expanded="ouvert"
      @click="ouvert = !ouvert"
    >
      <Icon name="heroicons:trash" class="h-4 w-4" />
      {{ t('admin.trash.title') }} ({{ elements.length }})
      <Icon name="heroicons:chevron-down" class="h-3.5 w-3.5 transition-transform" :class="ouvert && 'rotate-180'" />
    </button>

    <div v-if="ouvert" class="mt-4">
      <p v-if="!data.installee" class="text-sm text-ink-500">{{ t('admin.trash.notInstalled') }}</p>
      <template v-else>
        <p class="mb-4 text-sm text-ink-500">{{ t('admin.trash.hint', { n: data.delaiJours }) }}</p>
        <p v-if="!elements.length" class="text-sm text-ink-400">{{ t('admin.trash.empty') }}</p>
        <ul v-else class="space-y-2">
          <li
            v-for="e in elements"
            :key="e.id"
            class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-ink-200 px-4 py-3 text-sm dark:border-ink-800"
          >
            <div class="min-w-0">
              <div class="font-medium">
                {{ e.title }}<span v-if="e.date" class="ml-2 font-normal text-ink-500">{{ jour(e.date) }}</span>
              </div>
              <div class="mt-0.5 text-xs text-ink-500">
                {{ t('admin.trash.deletedOn', { date: jour(e.deleted_at) }) }}<template v-if="e.deleted_by"> {{ t('admin.trash.by', { who: e.deleted_by }) }}</template>
                · {{ t('admin.trash.purgeOn', { date: effaceLe(e) }) }}
              </div>
            </div>
            <button class="btn-ghost !py-1.5 !text-xs" :disabled="busy" @click="restaurer(e)">{{ t('admin.trash.restore') }}</button>
          </li>
        </ul>
      </template>
    </div>
  </section>
</template>
