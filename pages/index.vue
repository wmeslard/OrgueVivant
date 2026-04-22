<script setup lang="ts">
const { t } = useI18n()
const { upcoming, pending, fetchConcerts } = useConcerts()
await fetchConcerts()

const preview = computed(() => upcoming.value.slice(0, 3))
const selected = ref<Concert | null>(null)

useHead({
  title: 'Orgue Vivant — Concerts d\'orgues à Lille',
  meta: [
    { name: 'description', content: t('seo.homeDesc') }
  ]
})

const news = computed(() => [
  { date: '2026-04-01', title: t('news.item1.title'), body: t('news.item1.body') },
  { date: '2026-03-15', title: t('news.item2.title'), body: t('news.item2.body') },
  { date: '2026-02-20', title: t('news.item3.title'), body: t('news.item3.body') }
])
</script>

<template>
  <div>
    <!-- HERO -->
    <section class="relative overflow-hidden">
      <div class="container-apple py-24 md:py-40">
        <div class="animate-fade-up">
          <div class="mb-6 text-xs uppercase tracking-[0.3em] text-accent">
            {{ t('home.eyebrow') }}
          </div>
          <h1 class="heading-hero max-w-4xl">
            {{ t('home.heroTitle1') }}<br>
            <span class="italic text-ink-500 dark:text-ink-400">{{ t('home.heroTitle2') }}</span>
          </h1>
          <p class="mt-8 max-w-2xl text-lg text-ink-600 dark:text-ink-400 md:text-xl">
            {{ t('home.heroSubtitle') }}
          </p>
          <div class="mt-10 flex flex-wrap gap-3">
            <NuxtLink to="/concerts" class="btn-primary">{{ t('home.ctaConcerts') }}</NuxtLink>
            <NuxtLink to="/about" class="btn-ghost">{{ t('home.ctaAbout') }}</NuxtLink>
          </div>
        </div>
      </div>
      <div class="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      <div class="pointer-events-none absolute -bottom-48 -left-48 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
    </section>

    <!-- UPCOMING PREVIEW -->
    <section class="container-apple py-24 md:py-32">
      <div class="mb-12 flex items-end justify-between">
        <div>
          <div class="text-xs uppercase tracking-widest text-accent">{{ t('home.upcomingEyebrow') }}</div>
          <h2 class="heading-section mt-2">{{ t('home.upcomingTitle') }}</h2>
        </div>
        <NuxtLink to="/concerts" class="text-sm underline">{{ t('home.viewAll') }}</NuxtLink>
      </div>

      <div v-if="pending" class="text-ink-500">{{ t('common.loading') }}</div>
      <div v-else-if="preview.length === 0" class="rounded-2xl border border-dashed border-ink-200 p-16 text-center text-ink-500 dark:border-ink-700">
        {{ t('home.noUpcoming') }}
      </div>
      <div v-else class="grid gap-6 md:grid-cols-3">
        <ConcertCard
          v-for="c in preview"
          :key="c.id"
          :concert="c"
          @open="selected = $event"
        />
      </div>
    </section>

    <!-- NEWS -->
    <section class="border-t border-ink-100 bg-ink-50/50 py-24 dark:border-ink-800 dark:bg-ink-900/40 md:py-32">
      <div class="container-apple">
        <div class="mb-12">
          <div class="text-xs uppercase tracking-widest text-accent">{{ t('home.newsEyebrow') }}</div>
          <h2 class="heading-section mt-2">{{ t('home.newsTitle') }}</h2>
        </div>
        <div class="grid gap-8 md:grid-cols-3">
          <article v-for="n in news" :key="n.title" class="border-t border-ink-200 pt-6 dark:border-ink-700">
            <time class="text-xs uppercase tracking-widest text-ink-500">{{ n.date }}</time>
            <h3 class="mt-2 font-display text-2xl font-light">{{ n.title }}</h3>
            <p class="mt-3 text-sm text-ink-600 dark:text-ink-400">{{ n.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section class="container-apple py-24 md:py-32 text-center">
      <h2 class="heading-section mx-auto max-w-2xl">{{ t('home.ctaTitle') }}</h2>
      <p class="mx-auto mt-4 max-w-xl text-ink-600 dark:text-ink-400">{{ t('home.ctaSubtitle') }}</p>
      <NuxtLink to="/concerts" class="btn-primary mt-8">{{ t('home.ctaConcerts') }}</NuxtLink>
    </section>

    <ConcertModal :concert="selected" @close="selected = null" />
  </div>
</template>
