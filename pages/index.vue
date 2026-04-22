<script setup lang="ts">
const { t, locale } = useI18n()
const { upcoming, pending, fetchConcerts } = useConcerts()
await fetchConcerts()

const preview = computed(() => upcoming.value.slice(0, 3))
const nextConcert = computed(() => upcoming.value[0] || null)
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

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}
</script>

<template>
  <div>
    <!-- HERO SECTION ULTRA PREMIUM -->
    <section class="relative min-h-screen flex items-center overflow-hidden pt-20">
      <!-- Background Immersif -->
      <div class="absolute inset-0 z-0">
        <div class="absolute inset-0 bg-background/80 z-10"></div>
        <div class="absolute inset-0 bg-gradient-to-tr from-background via-transparent to-gold/10 z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1548777123-e216912df7d8?q=80&w=2070&auto=format&fit=crop" 
          alt="Orgue" 
          class="w-full h-full object-cover scale-110 blur-sm brightness-50"
        />
        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] opacity-20 z-10"></div>
      </div>

      <div class="container-premium relative z-20 w-full">
        <div class="max-w-[1400px] mx-auto">
          <div class="animate-fade-up">
            <div class="inline-flex items-center gap-3 mb-8">
              <span class="h-[1px] w-8 bg-gold"></span>
              <span class="text-xs uppercase tracking-[0.4em] text-gold font-bold">
                {{ t('home.eyebrow') }}
              </span>
            </div>
            
            <h1 class="heading-hero text-text-primary">
              {{ t('home.heroTitle1') }}<br>
              <span class="italic font-display text-gold opacity-90">{{ t('home.heroTitle2') }}</span>
            </h1>
            
            <p class="mt-10 max-w-2xl text-lg md:text-2xl text-text-secondary leading-relaxed font-light">
              {{ t('home.heroSubtitle') }}
            </p>
            
            <div class="mt-12 flex flex-wrap gap-6">
              <NuxtLink to="/concerts" class="btn-premium-primary">
                {{ t('home.ctaConcerts') }}
              </NuxtLink>
              <NuxtLink v-if="nextConcert" @click="selected = nextConcert" class="btn-premium-secondary cursor-pointer">
                {{ t('home.nextConcert') || 'Prochain concert' }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Scroll Indicator -->
      <div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 animate-bounce opacity-30">
        <span class="text-[10px] uppercase tracking-widest text-text-secondary">Scroll</span>
        <div class="h-10 w-[1px] bg-text-secondary"></div>
      </div>
    </section>

    <!-- SECTION PROCHAIN CONCERT -->
    <section v-if="nextConcert" class="relative z-30 -mt-20 pb-20">
      <div class="container-premium">
        <div class="mb-10 flex items-center gap-4">
          <h2 class="text-xs uppercase tracking-[0.3em] text-text-secondary font-bold">
            {{ t('home.upcomingEyebrow') }}
          </h2>
          <div class="h-[1px] flex-1 bg-white/5"></div>
        </div>

        <div class="card-premium group flex flex-col md:flex-row items-stretch min-h-[400px]">
          <div class="md:w-1/2 overflow-hidden relative">
            <img 
              :src="nextConcert.image_url || 'https://images.unsplash.com/photo-1548777123-e216912df7d8?q=80&w=1000'" 
              :alt="nextConcert.title"
              class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div class="absolute inset-0 bg-gradient-to-r from-surface via-transparent to-transparent hidden md:block"></div>
          </div>
          <div class="md:w-1/2 p-10 md:p-16 flex flex-col justify-center">
            <div class="text-gold font-bold tracking-widest text-sm mb-4">
              {{ formatDate(nextConcert.date) }} — {{ nextConcert.time }}
            </div>
            <h2 class="font-display text-4xl md:text-5xl lg:text-6xl font-light mb-6 text-text-primary">
              {{ nextConcert.title }}
            </h2>
            <div class="flex flex-col gap-4 text-text-secondary mb-10">
              <div class="flex items-center gap-3">
                <Icon name="heroicons:map-pin" class="w-5 h-5 text-gold" />
                <span>{{ t(`locations.${nextConcert.location}`) }}</span>
              </div>
              <div v-if="nextConcert.artists" class="flex items-center gap-3">
                <Icon name="heroicons:user" class="w-5 h-5 text-gold" />
                <span>{{ nextConcert.artists }}</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-4">
              <button @click="selected = nextConcert" class="btn-premium-primary !h-12 !px-8">
                {{ t('modal.moreInfo') }}
              </button>
              <button class="btn-premium-secondary !h-12 !px-8 flex items-center gap-2">
                <Icon name="heroicons:calendar" class="w-5 h-5" />
                {{ t('modal.addToCalendar') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION CONCERTS À VENIR -->
    <section class="py-32 bg-background">
      <div class="container-premium">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div class="max-w-2xl">
            <h2 class="heading-section mb-6">{{ t('home.upcomingTitle') }}</h2>
            <p class="text-text-secondary text-lg font-light">
              Découvrez la programmation de la saison 2026. Des moments suspendus au cœur du patrimoine lillois.
            </p>
          </div>
          <NuxtLink to="/concerts" class="group flex items-center gap-3 text-gold tracking-widest text-sm font-bold uppercase">
            {{ t('home.viewAll') }}
            <Icon name="heroicons:arrow-right" class="w-5 h-5 transition-transform group-hover:translate-x-2" />
          </NuxtLink>
        </div>

        <div v-if="pending" class="text-text-secondary flex items-center gap-4">
           <div class="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
           {{ t('common.loading') }}
        </div>
        <div v-else-if="preview.length === 0" class="card-premium p-20 text-center text-text-secondary">
          {{ t('home.noUpcoming') }}
        </div>
        <div v-else class="grid gap-10 md:grid-cols-3">
          <ConcertCard
            v-for="c in preview"
            :key="c.id"
            :concert="c"
            @open="selected = $event"
          />
        </div>
      </div>
    </section>

    <!-- SECTION POURQUOI VENIR -->
    <section class="py-32 bg-surface/30">
      <div class="container-premium">
        <div class="grid md:grid-cols-3 gap-16">
          <div class="flex flex-col items-center text-center group">
            <div class="w-20 h-20 rounded-full border border-gold/20 flex items-center justify-center mb-8 transition-colors group-hover:bg-gold/5">
              <Icon name="heroicons:musical-note" class="w-10 h-10 text-gold" />
            </div>
            <h3 class="font-display text-2xl mb-4 text-text-primary">Entrée libre</h3>
            <p class="text-text-secondary font-light">La musique pour tous. La plupart de nos concerts sont en accès libre pour favoriser la découverte.</p>
          </div>
          <div class="flex flex-col items-center text-center group">
            <div class="w-20 h-20 rounded-full border border-gold/20 flex items-center justify-center mb-8 transition-colors group-hover:bg-gold/5">
              <Icon name="heroicons:building-library" class="w-10 h-10 text-gold" />
            </div>
            <h3 class="font-display text-2xl mb-4 text-text-primary">Lieux patrimoniaux</h3>
            <p class="text-text-secondary font-light">Découvrez les églises Saint-Maurice et Saint-Étienne sous un nouveau jour, portées par le son de l'orgue.</p>
          </div>
          <div class="flex flex-col items-center text-center group">
            <div class="w-20 h-20 rounded-full border border-gold/20 flex items-center justify-center mb-8 transition-colors group-hover:bg-gold/5">
              <Icon name="heroicons:sparkles" class="w-10 h-10 text-gold" />
            </div>
            <h3 class="font-display text-2xl mb-4 text-text-primary">Expérience rare</h3>
            <p class="text-text-secondary font-light">Un moment de sérénité et d'émotion brute. L'instrument-roi dans toute sa majesté.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION PATRIMOINE / STORYTELLING -->
    <section class="relative py-48 overflow-hidden">
      <div class="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1515600406036-7c9b5f0e8d3a?q=80&w=2070&auto=format&fit=crop" 
          alt="Eglise" 
          class="w-full h-full object-cover brightness-[0.3]"
        />
      </div>
      <div class="container-premium relative z-10">
        <div class="max-w-3xl">
          <h2 class="heading-section text-white mb-8">Quand les orgues réveillent la pierre.</h2>
          <p class="text-xl text-text-secondary font-light mb-12 leading-relaxed">
            Au-delà des concerts, c'est un dialogue millénaire entre l'architecture et la musique que nous vous proposons. Chaque note résonne dans l'histoire de Lille, offrant une parenthèse hors du temps au cœur de la ville.
          </p>
          <NuxtLink to="/about" class="btn-premium-primary">
            {{ t('home.ctaAbout') }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- SECTION ACTUALITÉS -->
    <section class="py-32 bg-background">
      <div class="container-premium">
        <div class="mb-20">
          <h2 class="heading-section">{{ t('home.newsTitle') }}</h2>
        </div>
        <div class="grid gap-12 md:grid-cols-3">
          <article v-for="n in news" :key="n.title" class="group flex flex-col h-full border-b border-white/5 pb-10 transition-colors hover:border-gold/30">
            <time class="text-[10px] uppercase tracking-[0.3em] text-gold mb-4 font-bold">{{ n.date }}</time>
            <h3 class="font-display text-3xl font-light mb-6 text-text-primary group-hover:text-gold transition-colors duration-300">{{ n.title }}</h3>
            <p class="text-text-secondary font-light mb-8 flex-1 leading-relaxed">{{ n.body }}</p>
            <NuxtLink to="#" class="text-xs uppercase tracking-widest text-text-primary flex items-center gap-2 group/link">
              Lire la suite
              <Icon name="heroicons:chevron-right" class="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
            </NuxtLink>
          </article>
        </div>
      </div>
    </section>

    <!-- NEWSLETTER PREMIUM -->
    <section class="py-32 border-t border-white/5">
      <div class="container-premium">
        <div class="card-premium p-12 md:p-20 bg-surface flex flex-col items-center text-center">
          <h2 class="font-display text-4xl md:text-5xl font-light mb-6 text-text-primary max-w-2xl">
            Recevez la programmation en avant-première.
          </h2>
          <p class="text-text-secondary text-lg font-light mb-12 max-w-xl">
            Dates, coulisses, artistes invités et nouveautés. Rejoignez notre cercle de passionnés.
          </p>
          <div class="w-full max-w-md">
            <NewsletterSignup />
            <p class="mt-6 text-[10px] text-text-secondary/50 uppercase tracking-widest">
              En vous inscrivant, vous acceptez notre politique de confidentialité.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- STICKY CTA MOBILE -->
    <div class="fixed bottom-6 left-6 right-6 z-40 md:hidden">
      <NuxtLink to="/concerts" class="btn-premium-primary w-full shadow-2xl shadow-black">
        {{ t('home.ctaConcerts') }}
      </NuxtLink>
    </div>

    <ConcertModal :concert="selected" @close="selected = null" />
  </div>
</template>
