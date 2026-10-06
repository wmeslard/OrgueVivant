<script setup lang="ts">
/**
 * Le PDF du programme d'un concert : déposer, remplacer, retirer. Le fichier
 * part directement vers Supabase, avec une autorisation que le serveur délivre
 * après avoir vérifié le rôle admin (server/api/admin/programme-pdf.post.ts).
 */
defineProps<{ modelValue: string | null | undefined }>()
const emit = defineEmits<{ (e: 'update:modelValue', url: string | null): void }>()

const supabase = useSupabaseClient()
const envoi = ref(false)
const erreur = ref('')
const survol = ref(false)
const champ = ref<HTMLInputElement>()

const MAX_OCTETS = 20 * 1024 * 1024

async function envoyer(fichier: File) {
  erreur.value = ''
  if (fichier.type !== 'application/pdf') { erreur.value = 'Le programme doit être un fichier PDF.'; return }
  if (fichier.size > MAX_OCTETS) { erreur.value = 'Fichier trop lourd — 20 Mo au maximum.'; return }
  envoi.value = true
  try {
    const { chemin, jeton, url } = await $fetch<{ chemin: string; jeton: string; url: string }>(
      '/api/admin/programme-pdf', { method: 'POST' })
    const { error } = await supabase.storage.from('concert-programmes')
      .uploadToSignedUrl(chemin, jeton, fichier, { contentType: 'application/pdf' })
    if (error) throw error
    emit('update:modelValue', url)
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || e?.message || 'Envoi impossible'
  } finally {
    envoi.value = false
    if (champ.value) champ.value.value = ''
  }
}

function choisi(e: Event) {
  const fichier = (e.target as HTMLInputElement).files?.[0]
  if (fichier) envoyer(fichier)
}
function depose(e: DragEvent) {
  survol.value = false
  const fichier = e.dataTransfer?.files?.[0]
  if (fichier) envoyer(fichier)
}
</script>

<template>
  <div class="space-y-2">
    <div
      class="cursor-pointer rounded-xl border-2 border-dashed transition-colors"
      :class="survol ? 'border-gold bg-gold/5' : 'border-text-primary/20 hover:border-gold/40'"
      @dragover.prevent="survol = true"
      @dragleave="survol = false"
      @drop.prevent="depose"
      @click="champ?.click()"
    >
      <div v-if="envoi" class="flex items-center justify-center gap-3 py-6">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        <p class="text-sm text-text-secondary">Envoi du PDF…</p>
      </div>

      <!-- Programme déjà déposé -->
      <div v-else-if="modelValue" class="flex flex-wrap items-center gap-4 p-4">
        <Icon name="heroicons:document-text" class="h-8 w-8 shrink-0 text-gold" />
        <div class="flex flex-1 flex-col gap-1">
          <p class="text-sm text-text-secondary">Programme enregistré</p>
          <span class="text-xs text-gold underline underline-offset-2">Cliquer ou glisser pour remplacer</span>
        </div>
        <a :href="modelValue" target="_blank" rel="noopener" class="text-sm underline" @click.stop>Voir</a>
        <button type="button" class="text-sm text-red-600 underline" @click.stop="emit('update:modelValue', null)">Retirer</button>
      </div>

      <div v-else class="flex flex-col items-center justify-center gap-2 px-6 py-6 text-center">
        <Icon name="heroicons:document-arrow-up" class="h-8 w-8 text-text-secondary/50" />
        <p class="text-sm text-text-secondary">
          Glissez le PDF du programme ici ou
          <span class="text-gold underline underline-offset-2">cliquez pour choisir</span>
        </p>
        <p class="text-xs text-text-secondary/40">PDF · max 20 Mo · facultatif</p>
      </div>
    </div>

    <p v-if="erreur" class="text-sm text-red-500">{{ erreur }}</p>
    <input ref="champ" type="file" accept="application/pdf" class="hidden" @change="choisi">
  </div>
</template>
