<script setup lang="ts">
const props = defineProps<{ modelValue: string | null | undefined }>()
const emit = defineEmits<{ (e: 'update:modelValue', url: string): void }>()

const supabase = useSupabaseClient()
const uploading = ref(false)
const error = ref('')
const dragging = ref(false)
const inputRef = ref<HTMLInputElement>()
const pendingFile = ref<File | null>(null)

const MAX_BYTES = 20 * 1024 * 1024

function validate(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Format non reconnu (JPG, PNG, WebP…)'
  if (file.size > MAX_BYTES) return 'Fichier trop lourd — maximum 20 Mo'
  return null
}

function handleFile(file: File) {
  error.value = ''
  const err = validate(file)
  if (err) { error.value = err; return }
  pendingFile.value = file
}

async function onCropConfirm(blob: Blob) {
  pendingFile.value = null
  uploading.value = true
  error.value = ''
  try {
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

function onCropCancel() {
  pendingFile.value = null
  if (inputRef.value) inputRef.value.value = ''
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
      <!-- Aperçu image existante -->
      <div v-if="modelValue && !uploading" class="flex items-center gap-6 p-4">
        <img
          :src="modelValue"
          alt="Aperçu"
          class="w-24 rounded-lg object-cover shrink-0"
          style="aspect-ratio: 4/5"
        />
        <div class="flex flex-col gap-1">
          <p class="text-sm text-text-secondary">Image enregistrée</p>
          <span class="text-xs text-gold underline underline-offset-2">Cliquer ou glisser pour remplacer</span>
        </div>
      </div>

      <!-- Zone vide -->
      <div v-else-if="!uploading" class="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center">
        <Icon name="heroicons:photo" class="w-10 h-10 text-text-secondary/50" />
        <p class="text-sm text-text-secondary">
          Glissez une image ici ou
          <span class="text-gold underline underline-offset-2">cliquez pour choisir</span>
        </p>
        <p class="text-xs text-text-secondary/40">JPG, PNG, WebP · max 20 Mo</p>
      </div>

      <!-- Upload en cours -->
      <div v-if="uploading" class="flex flex-col items-center justify-center gap-4 py-10">
        <div class="h-8 w-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
        <p class="text-sm text-text-secondary">Upload en cours…</p>
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

    <!-- Modal de recadrage -->
    <ImageCropModal
      :file="pendingFile"
      @confirm="onCropConfirm"
      @cancel="onCropCancel"
    />
  </div>
</template>
