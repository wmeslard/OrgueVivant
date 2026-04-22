<script setup lang="ts">
const colorMode = useColorMode()

function toggle() {
  const next = colorMode.value === 'dark' ? 'light' : 'dark'
  colorMode.preference = next
  document.documentElement.classList.toggle('dark', next === 'dark')
}
</script>

<template>
  <button
    aria-label="Switch dark mode"
    class="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
    @click="toggle"
  >
    <Icon name="heroicons:sun-solid" class="hidden h-5 w-5 dark:block" />
    <Icon name="heroicons:moon-solid" class="block h-5 w-5 dark:hidden" />
  </button>
</template>
