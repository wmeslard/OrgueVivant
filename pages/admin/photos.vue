<script setup lang="ts">
/**
 * Albums photos : créer un album, y déposer des photos (plusieurs à la fois),
 * choisir la couverture, ranger, légender, publier. Chaque photo est réduite
 * dans le navigateur (utils/reduirePhoto.ts), puis envoyée directement à
 * Supabase avec une autorisation que délivre le serveur après avoir vérifié le
 * rôle admin.
 */
import { reduirePhoto } from '~/utils/reduirePhoto'

definePageMeta({ middleware: 'auth', layout: 'admin' })

interface Album {
  id: string; titre: string; date: string | null; concert_id: string | null
  couverture_id: string | null; publie: boolean; nombre: number; couverture: string | null
}
interface Photo { id: string; url: string; url_vignette: string; legende: string | null; ordre: number }
interface Envoi { nom: string; etat: 'attente' | 'reduction' | 'envoi' | 'ok' | 'erreur'; message?: string; fichier: File; albumId: string }

const { t } = useI18n()
const supabase = useSupabaseClient()
const { show: showToast } = useToast()

const { data, error: erreurListe, refresh } = await useFetch<{ albums: Album[]; concerts: { id: string; title: string; date: string }[] }>('/api/admin/photos')

const busy = ref(false)
const choisi = ref<Album | null>(null)
const photos = ref<Photo[]>([])
const fiche = reactive({ titre: '', date: '', concert_id: '' })
const nouveauTitre = ref('')
const legendeEnCours = ref<{ id: string; texte: string } | null>(null)

const messageErreur = (e: any) => e?.data?.statusMessage || e?.message || 'Erreur'

/** L'action en cours, pour mettre la roue sur le seul bouton cliqué. */
const enCours = ref<string | null>(null)

async function action(fn: () => Promise<unknown>, message?: string, cle?: string) {
  busy.value = true; enCours.value = cle ?? null
  try {
    await fn()
    if (message) showToast(message, { type: 'success' })
  } catch (e) {
    showToast(messageErreur(e), { type: 'error' })
  } finally { busy.value = false; enCours.value = null }
}

async function ouvrir(id: string) {
  const r = await $fetch<{ album: Album; photos: Photo[] }>(`/api/admin/photos/${id}`)
  choisi.value = { ...r.album, nombre: r.photos.length, couverture: null }
  photos.value = r.photos
  Object.assign(fiche, { titre: r.album.titre, date: r.album.date ?? '', concert_id: r.album.concert_id ?? '' })
}

async function creer() {
  if (!nouveauTitre.value.trim()) return
  await action(async () => {
    const album = await $fetch<Album>('/api/admin/photos', { method: 'POST', body: { titre: nouveauTitre.value } })
    nouveauTitre.value = ''
    await refresh()
    await ouvrir(album.id)
  }, 'Album créé, en brouillon.', 'creer')
}

const patch = (body: Record<string, unknown>) =>
  $fetch(`/api/admin/photos/${choisi.value!.id}`, { method: 'PATCH', body })

async function enregistrerFiche() {
  await action(async () => {
    await patch({ titre: fiche.titre, date: fiche.date || null, concert_id: fiche.concert_id || null })
    await refresh(); await ouvrir(choisi.value!.id)
  }, 'Album enregistré.', 'fiche')
}

async function basculerPublication() {
  const publie = !choisi.value!.publie
  await action(async () => {
    await patch({ publie }); choisi.value!.publie = publie; await refresh()
  }, publie ? 'Album publié.' : 'Album repassé en brouillon.', 'publication')
}

async function supprimerAlbum() {
  const a = choisi.value!
  if (!confirm(`Supprimer l'album « ${a.titre} » et ses ${photos.value.length} photo(s) ?\n\nC'est définitif.`)) return
  await action(async () => {
    await $fetch(`/api/admin/photos/${a.id}`, { method: 'DELETE' })
    choisi.value = null; photos.value = []; await refresh()
  }, 'Album supprimé.')
}

// ── Envoi des photos ─────────────────────────────────────────────────────────

const envois = ref<Envoi[]>([])
const survol = ref(false)
const champ = ref<HTMLInputElement>()
let fileActive = false

function ajouter(fichiers: FileList | File[] | null | undefined) {
  if (!choisi.value) return
  // Chaque photo garde l'album où elle a été déposée, même si l'on en ouvre un autre pendant l'envoi.
  for (const f of Array.from(fichiers ?? [])) envois.value.push({ nom: f.name, etat: 'attente', fichier: f, albumId: choisi.value.id })
  if (champ.value) champ.value.value = ''
  traiter()
}

async function envoyer(e: Envoi) {
  const albumId = e.albumId
  if (e.fichier.size > 60 * 1024 * 1024) throw new Error('Fichier trop lourd (60 Mo au maximum)')
  e.etat = 'reduction'
  const r = await reduirePhoto(e.fichier)
  e.etat = 'envoi'
  const a = await $fetch<{ chemin: string; chemin_vignette: string; jeton: string; jeton_vignette: string }>(
    `/api/admin/photos/${albumId}/envoi`, { method: 'POST', body: { format: r.format } })
  const type = r.format === 'webp' ? 'image/webp' : 'image/jpeg'
  const espace = supabase.storage.from('photos')
  const [g, v] = await Promise.all([
    espace.uploadToSignedUrl(a.chemin, a.jeton, r.grande, { contentType: type }),
    espace.uploadToSignedUrl(a.chemin_vignette, a.jeton_vignette, r.vignette, { contentType: type })
  ])
  if (g.error) throw g.error
  if (v.error) throw v.error
  const photo = await $fetch<Photo>(`/api/admin/photos/${albumId}/photos`, {
    method: 'POST', body: { chemin: a.chemin, chemin_vignette: a.chemin_vignette, largeur: r.largeur, hauteur: r.hauteur }
  })
  if (choisi.value?.id === albumId) photos.value.push(photo)
  e.etat = 'ok'
}

/** Une photo après l'autre : la réduction demande de la mémoire, surtout sur téléphone. */
async function traiter() {
  if (fileActive) return
  fileActive = true
  try {
    let e: Envoi | undefined
    while ((e = envois.value.find(x => x.etat === 'attente'))) {
      try { await envoyer(e) } catch (err) { e.etat = 'erreur'; e.message = messageErreur(err) }
    }
  } finally {
    fileActive = false
    await refresh()
    // La première photo d'un album en devient la couverture (côté serveur) : on l'affiche aussitôt.
    if (choisi.value && !choisi.value.couverture_id && photos.value[0]) choisi.value.couverture_id = photos.value[0].id
  }
}

const envoisVisibles = computed(() => envois.value.filter(e => e.etat !== 'ok').concat(envois.value.filter(e => e.etat === 'ok').slice(-3)))
const libelle: Record<Envoi['etat'], string> = { attente: 'En attente', reduction: 'Réduction…', envoi: 'Envoi…', ok: 'Envoyée', erreur: 'Erreur' }

// ── Photos de l'album ────────────────────────────────────────────────────────

async function couverture(p: Photo) {
  await action(async () => { await patch({ couverture_id: p.id }); choisi.value!.couverture_id = p.id; await refresh() }, 'Couverture choisie.')
}

async function deplacer(i: number, sens: -1 | 1) {
  const j = i + sens
  if (j < 0 || j >= photos.value.length) return
  const liste = [...photos.value];
  [liste[i], liste[j]] = [liste[j], liste[i]]
  const avant = photos.value
  photos.value = liste
  try { await patch({ ordre: liste.map(p => p.id) }) } catch (e) {
    photos.value = avant; showToast(messageErreur(e), { type: 'error' })
  }
}

async function enregistrerLegende() {
  const l = legendeEnCours.value
  if (!l) return
  await action(async () => {
    await $fetch(`/api/admin/photos/photo/${l.id}`, { method: 'PATCH', body: { legende: l.texte } })
    const p = photos.value.find(x => x.id === l.id)
    if (p) p.legende = l.texte.trim() || null
    legendeEnCours.value = null
  }, 'Légende enregistrée.')
}

async function supprimerPhoto(p: Photo) {
  if (!confirm('Supprimer cette photo ? C\'est définitif.')) return
  await action(async () => {
    await $fetch(`/api/admin/photos/photo/${p.id}`, { method: 'DELETE' })
    photos.value = photos.value.filter(x => x.id !== p.id)
    if (choisi.value?.couverture_id === p.id) choisi.value.couverture_id = null
    await refresh()
  }, 'Photo supprimée.')
}

const dateCourte = (d: string | null) =>
  d ? new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sans date'
</script>

<template>
  <div class="container-apple py-20">
    <AdminHeader :titre="t('admin.photos')" />
    <AdminNav />

    <p v-if="erreurListe" class="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-300">
      {{ erreurListe.data?.statusMessage || erreurListe.message }}
    </p>

    <div v-else class="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
      <!-- Albums -->
      <aside>
        <form class="mb-4 flex gap-2" @submit.prevent="creer">
          <input v-model="nouveauTitre" maxlength="160" class="input" placeholder="Titre du nouvel album" aria-label="Titre du nouvel album">
          <button class="btn-primary shrink-0 !px-4" :disabled="busy || !nouveauTitre.trim()"><Icon v-if="enCours === 'creer'" name="heroicons:arrow-path" class="mr-2 h-4 w-4 animate-spin" />Créer</button>
        </form>
        <p v-if="!data?.albums.length" class="text-sm text-ink-500">Aucun album pour le moment.</p>
        <ul class="space-y-2">
          <li v-for="a in data?.albums" :key="a.id">
            <button
              class="flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors"
              :class="choisi?.id === a.id ? 'border-gold/60 bg-white/[.03]' : 'border-ink-200 hover:border-ink-400 dark:border-ink-800'"
              @click="ouvrir(a.id)"
            >
              <img v-if="a.couverture" :src="a.couverture" alt="" class="h-14 w-14 shrink-0 rounded-lg object-cover">
              <span v-else class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-ink-100 dark:bg-ink-900">
                <Icon name="heroicons:photo" class="h-6 w-6 text-ink-400" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium">{{ a.titre }}</span>
                <span class="block text-xs text-ink-500">{{ dateCourte(a.date) }} · {{ a.nombre }} photo{{ a.nombre > 1 ? 's' : '' }}</span>
              </span>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                :class="a.publie ? 'bg-emerald-500/15 text-emerald-400' : 'bg-ink-200 text-ink-600 dark:bg-white/10 dark:text-ink-300'"
              >{{ a.publie ? 'Publié' : 'Brouillon' }}</span>
            </button>
          </li>
        </ul>
      </aside>

      <!-- Album ouvert -->
      <section v-if="choisi">
        <form class="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.6fr)]" @submit.prevent="enregistrerFiche">
          <div>
            <label class="label" for="al-titre">Titre</label>
            <input id="al-titre" v-model="fiche.titre" required maxlength="160" class="input">
          </div>
          <div>
            <label class="label" for="al-date">Date <span class="font-normal text-ink-400">(facultative)</span></label>
            <input id="al-date" v-model="fiche.date" type="date" class="input">
          </div>
          <div>
            <label class="label" for="al-concert">Concert lié <span class="font-normal text-ink-400">(facultatif)</span></label>
            <select id="al-concert" v-model="fiche.concert_id" class="input">
              <option value="">Aucun</option>
              <option v-for="c in data?.concerts" :key="c.id" :value="c.id">{{ c.title }} — {{ dateCourte(c.date) }}</option>
            </select>
          </div>
          <div class="flex flex-wrap items-center gap-3 md:col-span-3">
            <button class="btn-primary" :disabled="busy"><Icon v-if="enCours === 'fiche'" name="heroicons:arrow-path" class="mr-2 h-4 w-4 animate-spin" />Enregistrer</button>
            <button type="button" class="btn-ghost" :disabled="busy" @click="basculerPublication">
              <Icon v-if="enCours === 'publication'" name="heroicons:arrow-path" class="mr-2 h-4 w-4 animate-spin" />
              {{ choisi.publie ? 'Repasser en brouillon' : 'Publier' }}
            </button>
            <button type="button" class="ml-auto text-sm text-rose-400 hover:text-rose-300" :disabled="busy" @click="supprimerAlbum">Supprimer l'album</button>
          </div>
        </form>
        <p class="mt-3 text-xs text-ink-500">
          {{ choisi.publie ? 'Publié.' : 'Brouillon : visible ici seulement.' }}
          La rubrique Photos du site n'est pas encore en ligne : un album publié n'y apparaîtra qu'à son ouverture.
        </p>

        <!-- Dépôt -->
        <div
          class="mt-6 flex cursor-pointer flex-col gap-4 rounded-2xl border-2 border-dashed p-6 transition-colors md:flex-row md:items-center"
          :class="survol ? 'border-gold bg-gold/5' : 'border-ink-300 hover:border-gold/50 dark:border-ink-700'"
          role="button"
          tabindex="0"
          @click="champ?.click()"
          @keydown.enter="champ?.click()"
          @dragover.prevent="survol = true"
          @dragleave="survol = false"
          @drop.prevent="survol = false; ajouter($event.dataTransfer?.files)"
        >
          <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold/10">
            <Icon name="heroicons:photo" class="h-7 w-7 text-gold" />
          </span>
          <span class="flex-1">
            <span class="block font-medium">Glissez vos photos ici, ou cliquez pour les choisir</span>
            <span class="mt-1 block text-sm text-ink-500">Plusieurs à la fois · JPEG, PNG, WebP, et HEIC dans Safari · réduites automatiquement pour le web</span>
          </span>
          <ul v-if="envoisVisibles.length" class="w-full space-y-1.5 text-xs md:w-72" @click.stop>
            <li v-for="(e, i) in envoisVisibles" :key="i" class="flex items-center gap-3">
              <span class="w-32 truncate text-ink-500">{{ e.nom }}</span>
              <span :class="e.etat === 'erreur' ? 'text-rose-400' : e.etat === 'ok' ? 'text-emerald-400' : 'text-gold'">{{ libelle[e.etat] }}</span>
              <span v-if="e.message" class="min-w-0 flex-1 truncate text-rose-400" :title="e.message">{{ e.message }}</span>
            </li>
          </ul>
        </div>
        <input ref="champ" type="file" multiple accept="image/*,.heic,.heif" class="hidden" @change="ajouter(($event.target as HTMLInputElement).files)">

        <!-- Photos -->
        <p class="mb-3 mt-8 text-sm text-ink-500">{{ photos.length }} photo{{ photos.length > 1 ? 's' : '' }} · ← → pour ranger</p>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <figure v-for="(p, i) in photos" :key="p.id" class="group">
            <div class="relative overflow-hidden rounded-xl">
              <img :src="p.url_vignette" :alt="p.legende || ''" loading="lazy" class="aspect-square w-full object-cover">
              <span v-if="choisi.couverture_id === p.id" class="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-background">Couverture</span>
            </div>
            <figcaption class="mt-1.5 text-xs">
              <form v-if="legendeEnCours?.id === p.id" class="flex gap-1" @submit.prevent="enregistrerLegende">
                <input v-model="legendeEnCours.texte" maxlength="300" class="input !px-2 !py-1 text-xs" placeholder="Légende" aria-label="Légende">
                <button class="text-gold">OK</button>
              </form>
              <p v-else-if="p.legende" class="mb-1 line-clamp-2 text-ink-500">{{ p.legende }}</p>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-500">
                <button :disabled="i === 0" class="hover:text-gold disabled:opacity-30" aria-label="Avancer" @click="deplacer(i, -1)">←</button>
                <button :disabled="i === photos.length - 1" class="hover:text-gold disabled:opacity-30" aria-label="Reculer" @click="deplacer(i, 1)">→</button>
                <button v-if="choisi.couverture_id !== p.id" class="hover:text-gold" @click="couverture(p)">Couverture</button>
                <button class="hover:text-gold" @click="legendeEnCours = { id: p.id, texte: p.legende ?? '' }">Légende</button>
                <button class="text-rose-400 hover:text-rose-300" @click="supprimerPhoto(p)">Supprimer</button>
              </div>
            </figcaption>
          </figure>
        </div>
      </section>

      <p v-else class="text-sm text-ink-500">Choisissez un album, ou créez-en un.</p>
    </div>
  </div>
</template>
