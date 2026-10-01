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
-- vides, aucune ligne n'est dans la corbeille au départ. Les politiques de
-- lecture existantes ne sont pas modifiées.
--
-- pg_cron est déjà activé (voir retention-newsletter.sql). À exécuter dans
-- Supabase → SQL Editor.

alter table public.concerts add column if not exists deleted_at timestamptz;
alter table public.concerts add column if not exists deleted_by text;
alter table public.news     add column if not exists deleted_at timestamptz;
alter table public.news     add column if not exists deleted_by text;

-- Lecture publique : seulement ce qui n'est pas dans la corbeille. Politique
-- « restrictive » : PostgreSQL la combine (ET) avec toutes les politiques de
-- lecture existantes, quel que soit leur nom — en base, elles ne portent pas
-- forcément celui de schema.sql. La clé service, côté serveur, n'y est pas
-- soumise : l'administration voit la corbeille.
drop policy if exists "Corbeille masquée" on public.concerts;
create policy "Corbeille masquée" on public.concerts
  as restrictive for select to anon, authenticated using (deleted_at is null);
drop policy if exists "Corbeille masquée" on public.news;
create policy "Corbeille masquée" on public.news
  as restrictive for select to anon, authenticated using (deleted_at is null);

-- Effacement définitif après trente jours dans la corbeille. Tâches
-- quotidiennes, une par table, à 3 h 23 (après la purge de la newsletter, 3 h 17).
select cron.schedule('corbeille-purge-concerts', '23 3 * * *',
  $$ delete from public.concerts where deleted_at < now() - interval '30 days' $$);
select cron.schedule('corbeille-purge-actualites', '23 3 * * *',
  $$ delete from public.news where deleted_at < now() - interval '30 days' $$);

-- Contrôle (l'éditeur n'affiche que le dernier résultat) : quatre lignes
-- attendues — la politique sur les deux tables, RESTRICTIVE, et les deux
-- tâches actives.
select 'politique' as quoi, tablename || ' · ' || permissive || ' · ' || cmd as detail
  from pg_policies
 where schemaname = 'public' and tablename in ('concerts', 'news') and policyname = 'Corbeille masquée'
union all
select 'tâche', jobname || ' · ' || schedule || ' · ' || case when active then 'active' else 'inactive' end
  from cron.job where jobname like 'corbeille-purge-%';
