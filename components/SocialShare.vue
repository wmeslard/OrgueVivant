<script setup lang="ts">
const props = defineProps<{ title: string; url: string }>()

const encodedUrl = computed(() => encodeURIComponent(props.url))
const encodedTitle = computed(() => encodeURIComponent(props.title))

const links = computed(() => [
  { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl.value}` },
  { name: 'Twitter', href: `https://twitter.com/intent/tweet?url=${encodedUrl.value}&text=${encodedTitle.value}` },
  { name: 'Email', href: `mailto:?subject=${encodedTitle.value}&body=${encodedUrl.value}` }
])
</script>

<template>
  <div class="flex items-center gap-2">
    <a
      v-for="l in links"
      :key="l.name"
      :href="l.href"
      target="_blank"
      rel="noopener"
      :aria-label="`Share on ${l.name}`"
      class="rounded-full border border-ink-200 px-3 py-1.5 text-xs text-ink-600 transition-colors hover:border-ink-400 dark:border-ink-700 dark:text-ink-300"
    >
      {{ l.name }}
    </a>
  </div>
</template>
