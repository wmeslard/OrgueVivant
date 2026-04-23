<script setup lang="ts">
const props = defineProps<{ modelValue: string | null | undefined }>()
const emit = defineEmits<{ (e: 'update:modelValue', url: string): void }>()

const supabase = useSupabaseClient()
const uploading = ref(false)
const error = ref('')
const inputRef = ref<HTMLInputElement>()

const MAX_BYTES = 20 * 1024 * 1024
const TARGET_W = 800
const TARGET_H = 1000

function resizeToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const targetRatio = TARGET_W / TARGET_H
      const srcRatio = img.width / img.height
      let sx: number, sy: number, sw: number, sh: number
      if (srcRatio > targetRatio) {
        // Trop large → rogner les côtés
        sh = img.height
        sw = Math.round(sh * targetRatio)
        sx = Math.round((img.width - sw) / 2)
        sy = 0
      } else {
        // Trop haut → rogner haut/bas
        sw = img.width
        sh = Math.round(sw / targetRatio)
        sx = 0
        sy = Math.round((img.height - sh) / 2)
      }
      const canvas = document.createElement('canvas')
      canvas.width = TARGET_W
      canvas.height = TARGET_H
      canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H)
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('toBlob failed')),
        'image/webp',
        0.85
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Impossible de lire l\'image')) }
    img.src = url
  })
}

async function handleFile(file: File) {
  error.value = ''
  if (!file.type.startsWith('image/')) {
    error.value = 'Format non reconnu (JPG, PNG, WebP…)'
    return
  }
  if (file.size > MAX_BYTES) {
    error.value = 'Fichier trop lourd — maximum 20 Mo'
    return
  }
  uploading.value = true
  try {
    const blob = await resizeToBlob(file)
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
    const { error: uploadErr } = await supabase.storage
      .from('concert-images')
      .upload(filename, blob, { contentType: 'image/webp' })
    if (uploadErr) throw uploadErr
    const { data } = supabase.storage.from('concert-images').getPublicUrl(filename)
    emit('update:modelValue', data.publicUrl)
  } catch (e: any) {
    error.value = e.message || 'Erreur lors de l\'upload'
  } finally {
    uploading.value = false
  }
}

function onInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

const dragging = ref(false)
</script>

<template>
  <div class="space-y-2">
    <div
      class="relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden"
      :class="dragging ? 'border-gold bg-gold/5' : 'border-text-primary/20 hover:border-gold/40'"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop="onDrop"
      @click="inputRef?.click()"
    >
      <!-- Aperçu de l'image actuelle -->
      <div v-if="modelValue && !uploading" class="flex items-start gap-6 p-4">
        <img
          :src="modelValue"
          alt="Aperçu"
          class="w-24 rounded-lg object-cover"
          style="aspect-ratio: 4/5"
        />
        <div class="flex flex-col justify-center gap-2 py-2">
          <p class="text-sm text-text-secondary">Image actuelle (800 × 1000 px, WebP)</p>
          <span class="text-xs text-gold underline underline-offset-2">Cliquer ou glisser pour remplacer</span>
        </div>
      </div>

      <!-- Zone vide -->
      <div v-else-if="!uploading" class="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center">
        <Icon name="heroicons:photo" class="w-10 h-10 text-text-secondary/50" />
        <div class="text-sm text-text-secondary">
          Glissez une image ici ou
          <span class="text-gold underline underline-offset-2">cliquez pour choisir</span>
        </div>
        <p class="text-xs text-text-secondary/40">JPG, PNG, WebP · max 20 Mo · recadrée automatiquement en 4:5</p>
      </div>

      <!-- Overlay upload en cours -->
      <div
        v-if="uploading"
        class="flex flex-col items-center justify-center gap-4 py-10"
      >
        <div class="h-8 w-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
        <p class="text-sm text-text-secondary">Redimensionnement et upload…</p>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

    <input
      ref="inputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onInput"
    />
  </div>
</template>
