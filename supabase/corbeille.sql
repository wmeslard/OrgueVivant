-- Corbeille des concerts et des actualités.
--
-- Supprimer un concert ou une actualité dans l'administration ne l'efface plus :
-- la ligne reçoit une date de suppression (`deleted_at`) et le nom de qui l'a
-- supprimée (`deleted_by`). La politique de lecture publique ne montre que les
-- lignes sans date de suppression : le site, le sitemap et les listes de
-- l'administration cessent aussitôt de les voir. On les restaure depuis la
-- corbeille, en bas des pages Concerts et Actualités de l'administration.
--
-- Trente jours après, une tâche quotidienne les efface pour de bon (même délai
-- que DELAI_CORBEILLE_JOURS dans server/utils/corbeille.ts).
--
-- Les données existantes ne sont pas touchées : les deux colonnes naissent
-- vides, aucune ligne n'est dans la corbeille au départ.
--
-- pg_cron est déjà activé (voir retention-newsletter.sql). À exécuter dans
-- Supabase → SQL Editor.

alter table public.concerts add column if not exists deleted_at timestamptz;
alter table public.concerts add column if not exists deleted_by text;
alter table public.news     add column if not exists deleted_at timestamptz;
alter table public.news     add column if not exists deleted_by text;

-- Lecture publique : seulement ce qui n'est pas dans la corbeille.
alter policy "Public can read concerts" on public.concerts using (deleted_at is null);
alter policy "Public can read news"     on public.news     using (deleted_at is null);

-- Effacement définitif après trente jours dans la corbeille. Tâches
-- quotidiennes, une par table, à 3 h 23 (après la purge de la newsletter, 3 h 17).
select cron.schedule('corbeille-purge-concerts', '23 3 * * *',
  $$ delete from public.concerts where deleted_at < now() - interval '30 days' $$);
select cron.schedule('corbeille-purge-actualites', '23 3 * * *',
  $$ delete from public.news where deleted_at < now() - interval '30 days' $$);

-- Contrôles.
-- 1. Une seule politique de lecture par table, avec le filtre `deleted_at is null`.
--    Une autre politique de lecture sans ce filtre laisserait voir la corbeille.
select tablename, policyname, cmd, qual
  from pg_policies
 where schemaname = 'public' and tablename in ('concerts', 'news');
-- 2. Les deux tâches sont enregistrées.
select jobname, schedule, active from cron.job where jobname like 'corbeille-purge-%';
