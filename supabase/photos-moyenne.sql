-- Albums photos : une taille intermédiaire de chaque photo (1280 px, WebP),
-- pour des couvertures d'album nettes sur les écrans haute définition sans
-- charger la grande image. Le navigateur choisit lui-même entre la vignette et
-- cette taille, selon l'écran.
--
-- Une colonne qui naît vide sur une table existante (ses accès restent ceux
-- d'avant) : aucune donnée n'est modifiée. Tant qu'elle manque, l'admin envoie
-- les photos sans cette taille et le site garde la vignette.
-- À exécuter dans Supabase → SQL Editor.

alter table public.photos add column if not exists chemin_moyenne text;

-- Contrôle : une ligne, chemin_moyenne.
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'photos' and column_name = 'chemin_moyenne';
