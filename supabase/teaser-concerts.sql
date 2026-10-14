-- Teaser vidéo d'un concert : le lien YouTube (un Short, le plus souvent)
-- saisi dans l'admin. Le site l'affiche dans une bulle « Teaser » sur l'accueil
-- et la page Concerts jusqu'au jour du concert.
--
-- Une colonne qui naît vide : aucune donnée existante n'est modifiée.
-- À exécuter dans Supabase → SQL Editor.

alter table public.concerts add column if not exists teaser_url text;

-- Contrôle : une ligne, teaser_url, text.
select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'concerts' and column_name = 'teaser_url';
