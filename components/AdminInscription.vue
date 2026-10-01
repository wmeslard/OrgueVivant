<script setup lang="ts">
/**
 * Fiche d'inscription de l'association, ouverte depuis un jeudi de l'onglet
 * « Jeudis » : un à quatre musiciens, l'email facultatif de la personne
 * inscrite (confirmation et rappel) et la description. L'association n'est pas
 * tenue par le délai d'inscription ; si Louis-Paul Courtois était affecté à ce
 * jeudi, le serveur le prévient qu'il ne joue plus.
 */
import {
  CRENEAU_REGULIER, INSTRUMENT_PAR_DEFAUT, MAX_MUSICIENS, heureFr, nomsPublics, parseYmd, type Musicien
} from '~/utils/moments'

const props = defineProps<{ date: string | null }>()
const emit = defineEmits<{ (e: 'fermer'): void; (e: 'inscrit'): void; (e: 'echec'): void }>()

const { t } = useI18n()

const vide = (instrument = ''): Musicien => ({ prenom: '', nom: '', instrument })
const form = reactive({ musiciens: [vide(INSTRUMENT_PAR_DEFAUT)], eleve_email: '', programme: '', consentement: false })
const envoi = ref(false)
const erreur = ref('')

watch(() => props.date, (date) => {
  if (!date) return
  Object.assign(form, { musiciens: [vide(INSTRUMENT_PAR_DEFAUT)], eleve_email: '', programme: '', consentement: false })
  erreur.value = ''
})

const rempli = (m: Musicien) => !!(m.prenom.trim() || m.nom.trim())
const apercuNom = computed(() => nomsPublics(form.musiciens.filter(m => m.prenom.trim())) || '—')

function jourLong(date: string) {
  const s = parseYmd(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^(\S+) 1 /, '$1 1er ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

async function inscrire() {
  if (!props.date) return
  erreur.value = ''
  const musiciens = form.musiciens.filter((m, i) => i === 0 || rempli(m))
  if (musiciens.some(m => !m.prenom.trim() || !m.nom.trim())) { erreur.value = t('momentsAcces.errorRequired'); return }
  if (form.eleve_email && !/^\S+@\S+\.\S+$/.test(form.eleve_email)) { erreur.value = t('momentsAcces.errorEmail'); return }
  if (!form.consentement) { erreur.value = t('momentsEspace.errorConsent'); return }
  envoi.value = true
  try {
    await $fetch('/api/admin/moments/seances', {
      method: 'POST',
      body: { date: props.date, heure_debut: CRENEAU_REGULIER, musiciens, eleve_email: form.eleve_email, programme: form.programme }
    })
    emit('inscrit')
  } catch (e: any) {
    erreur.value = e?.data?.statusMessage || t('momentsAcces.errorGeneric')
    // Le jeudi vient peut-être d'être pris ou bloqué : le parent recharge.
    emit('echec')
  } finally { envoi.value = false }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="date" class="fixed inset-0 z-[200] overflow-y-auto bg-black/70">
      <!-- Centrée à l'écran ; sur un écran trop bas, elle défile au lieu d'être coupée -->
      <div class="flex min-h-full items-center justify-center p-4" @click.self="emit('fermer')">
        <div class="card-premium w-full max-w-md p-7">
          <h2 class="font-display text-2xl font-light text-text-primary">{{ jourLong(date) }}</h2>
          <p class="mt-1 text-sm text-text-secondary">
            {{ heureFr(CRENEAU_REGULIER) }} · {{ t('moments.place') }}
          </p>

          <MomentsTuileMusicien
            v-for="(m, i) in form.musiciens"
            :key="i"
            v-model="form.musiciens[i]"
            :class="i ? 'mt-3' : 'mt-6'"
            :titre="t('momentsEspace.musicianN', { n: i + 1 })"
            :ident="`a${i}`"
            :retirable="i > 0"
            @retirer="form.musiciens.splice(i, 1)"
          />
          <button
            v-if="form.musiciens.length < MAX_MUSICIENS"
            type="button"
            class="mt-3 text-sm text-gold underline-offset-4 hover:underline"
            @click="form.musiciens.push(vide())"
          >
            {{ t('momentsEspace.addMusician') }}
          </button>
          <p class="mt-1.5 text-xs text-text-secondary">{{ t('momentsEspace.studentNameHint', { nom: apercuNom }) }}</p>

          <label class="label mt-5" for="ee">
            {{ t('momentsEspace.studentEmail') }}
            <span class="ml-1 font-normal text-text-secondary">({{ t('momentsAcces.optional') }})</span>
          </label>
          <input id="ee" v-model="form.eleve_email" type="email" maxlength="254" class="input">
          <p class="mt-1.5 text-xs text-text-secondary">{{ t('momentsEspace.studentEmailHint') }}</p>

          <label class="label mt-5" for="prog">
            {{ t('momentsEspace.programme') }}
            <span class="ml-1 font-normal text-text-secondary">({{ t('momentsAcces.optional') }})</span>
          </label>
          <textarea id="prog" v-model="form.programme" rows="3" maxlength="600" class="input resize-y" />
          <p class="mt-1.5 text-xs text-text-secondary">{{ t('momentsEspace.programmeHint') }}</p>

          <label class="mt-5 flex items-start gap-3 text-sm text-text-secondary">
            <input v-model="form.consentement" type="checkbox" class="mt-1 h-4 w-4 shrink-0 accent-gold">
            <span>{{ t(form.musiciens.length > 1 ? 'momentsEspace.consentPlural' : 'momentsEspace.consent') }}</span>
          </label>

          <p v-if="erreur" class="mt-3 text-sm text-red-400">{{ erreur }}</p>
          <div class="mt-6 flex justify-end gap-3">
            <button class="btn-ghost" @click="emit('fermer')">{{ t('momentsEspace.cancel') }}</button>
            <button class="btn-primary" :disabled="envoi" @click="inscrire">
              <Icon v-if="envoi" name="heroicons:arrow-path" class="mr-2 h-4 w-4 animate-spin" />
              {{ t('momentsEspace.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
