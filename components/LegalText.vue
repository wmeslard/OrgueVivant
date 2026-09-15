<script setup lang="ts">
/**
 * Rend un bloc de texte juridique stocké dans les traductions.
 *
 * Convention minimale, lisible dans le JSON : une ligne vide sépare les
 * alinéas ; un alinéa dont chaque ligne commence par « – » devient une liste ;
 * un alinéa qui s'ouvre par « Terme — » met le terme en évidence. Cela évite
 * du HTML dans les fichiers de langue tout en donnant la structure d'un texte
 * légal classique.
 */
const props = defineProps<{ text: string }>()

interface Bloc { type: 'p' | 'ul'; lines: string[]; term?: string }

const blocs = computed<Bloc[]>(() =>
  props.text.split(/\n\s*\n/).map(chunk => {
    const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length && lines.every(l => l.startsWith('– ')))
      return { type: 'ul', lines: lines.map(l => l.slice(2)) }
    const m = lines[0]?.match(/^([^—]{2,60}) — (.*)$/)
    if (m) return { type: 'p', term: m[1], lines: [m[2], ...lines.slice(1)] }
    return { type: 'p', lines }
  })
)
</script>

<template>
  <div class="space-y-4 leading-relaxed text-ink-700 dark:text-ink-300">
    <template v-for="(b, i) in blocs" :key="i">
      <ul v-if="b.type === 'ul'" class="list-disc space-y-1.5 pl-6 marker:text-gold">
        <li v-for="(l, j) in b.lines" :key="j">{{ l }}</li>
      </ul>
      <p v-else>
        <strong v-if="b.term" class="font-medium text-text-primary">{{ b.term }} — </strong>
        <template v-for="(l, j) in b.lines" :key="j">{{ l }}<br v-if="j < b.lines.length - 1"></template>
      </p>
    </template>
  </div>
</template>
