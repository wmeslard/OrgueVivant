<script setup lang="ts">
const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 z-[300] flex flex-col gap-2 items-end" aria-live="polite">
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-2xl min-w-[220px] max-w-xs"
          :class="{
            'bg-ink-900 text-white dark:bg-white dark:text-ink-900': toast.type === 'success',
            'bg-red-600 text-white': toast.type === 'error',
            'bg-surface border border-white/10 text-text-primary': toast.type === 'info',
          }"
        >
          <Icon
            :name="toast.type === 'success' ? 'heroicons:check-circle' : toast.type === 'error' ? 'heroicons:x-circle' : 'heroicons:information-circle'"
            class="w-5 h-5 shrink-0"
          />
          <span class="flex-1">{{ toast.message }}</span>
          <button
            v-if="toast.undo"
            class="text-xs underline underline-offset-2 opacity-80 hover:opacity-100 shrink-0"
            @click="() => { toast.undo?.(); dismiss(toast.id) }"
          >
            Annuler
          </button>
          <button class="opacity-50 hover:opacity-100 shrink-0" @click="dismiss(toast.id)">
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
