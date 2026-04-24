<script setup lang="ts">
import type Cropper from 'cropperjs'

const props = defineProps<{ file: File | null }>()
const emit = defineEmits<{
  (e: 'confirm', blob: Blob): void
  (e: 'cancel'): void
}>()

const imgRef = ref<HTMLImageElement>()
const previewRef = ref<HTMLDivElement>()
let cropper: Cropper | null = null
const objectUrl = ref('')

// Scroll lock
watch(() => props.file, async (file) => {
  if (file) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
    return
  }

  const { default: CropperClass } = await import('cropperjs')
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = URL.createObjectURL(file)
  await nextTick()
  cropper?.destroy()
  cropper = null
  if (!imgRef.value) return
  cropper = new CropperClass(imgRef.value, {
    aspectRatio: 4 / 5,
    viewMode: 1,
    autoCropArea: 0.95,
    movable: true,
    zoomable: true,
    rotatable: false,
    scalable: false,
    background: false,
    preview: previewRef.value ?? undefined,
  })
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  cropper?.destroy()
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})

function confirm() {
  if (!cropper) return
  const canvas = cropper.getCroppedCanvas({
    width: 800,
    height: 1000,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  })
  canvas.toBlob(blob => {
    if (blob) emit('confirm', blob)
  }, 'image/webp', 0.85)
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-apple"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-apple"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="file" class="fixed inset-0 z-[200] flex flex-col bg-background/98 backdrop-blur-xl overflow-hidden">

      <!-- Header compact -->
      <div class="flex items-center justify-between px-6 py-3 border-b border-text-primary/10 shrink-0">
        <div class="flex items-center gap-4">
          <p class="text-[10px] uppercase tracking-[0.3em] text-gold font-bold">Recadrage</p>
          <span class="text-text-primary/20">·</span>
          <p class="text-sm font-light text-text-secondary">Ratio 4:5 — 800 × 1000 px</p>
        </div>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-surface hover:bg-gold hover:text-background transition-all duration-300"
          @click="$emit('cancel')"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>

      <!-- Corps — flex-1 + min-h-0 pour rester dans la fenêtre -->
      <div class="flex flex-1 gap-6 p-5 overflow-hidden min-h-0">

        <!-- Zone cropper principale -->
        <div class="flex-1 overflow-hidden rounded-xl bg-surface min-h-0">
          <img
            ref="imgRef"
            :src="objectUrl"
            alt="Image à recadrer"
            class="block max-w-full"
            style="opacity: 0; max-height: 100%"
          />
        </div>

        <!-- Colonne aperçu -->
        <div class="w-44 shrink-0 flex flex-col gap-4 overflow-hidden">
          <div class="flex flex-col min-h-0">
            <p class="text-[10px] uppercase tracking-[0.3em] text-gold font-bold mb-2 shrink-0">Aperçu</p>
            <div
              ref="previewRef"
              class="w-full overflow-hidden rounded-lg bg-surface border border-text-primary/10 shrink-0"
              style="aspect-ratio: 4 / 5"
            />
          </div>

          <div class="rounded-lg bg-surface border border-text-primary/5 p-3 space-y-1 shrink-0">
            <p class="text-[10px] uppercase tracking-widest text-text-secondary font-bold mb-1.5">Conseils</p>
            <p class="text-[11px] text-text-secondary/60">Glisser pour déplacer.</p>
            <p class="text-[11px] text-text-secondary/60">Molette pour zoomer.</p>
            <p class="text-[11px] text-text-secondary/60">Coins pour redimensionner.</p>
          </div>
        </div>
      </div>

      <!-- Footer compact -->
      <div class="flex items-center justify-end gap-3 px-6 py-3 border-t border-text-primary/10 shrink-0">
        <button type="button" class="btn-premium-secondary !h-10 !w-auto !px-5 !text-sm" @click="$emit('cancel')">
          Annuler
        </button>
        <button type="button" class="btn-premium-primary !h-10 !w-auto !px-6 !text-sm" @click="confirm">
          Rogner et enregistrer
        </button>
      </div>

    </div>
  </Transition>
</template>

<style>
@import 'cropperjs/dist/cropper.css';
</style>
