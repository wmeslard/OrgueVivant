-- Traduction du titre des concerts.
--
-- Une seule colonne à ajouter. La présentation traduite des artistes
-- (`bio_en`) n'en demande AUCUNE : les artistes vivent déjà dans la colonne
-- `concerts.artists`, de type jsonb, qui n'impose pas de schéma — la nouvelle
-- clé s'y range d'elle-même, comme `name`, `image_url` et `bio`.
--
-- La colonne est nullable : les concerts déjà saisis restent valides et
-- s'affichent en français tant qu'ils n'ont pas été réenregistrés. Le code
-- retombe sur le français dès qu'une traduction manque.
--
-- Aucune donnée n'est modifiée ni supprimée.
--
-- À exécuter dans Supabase → SQL Editor.

alter table public.concerts add column if not exists title_en text;

-- Contrôle : la colonne existe, et l'on voit l'état des traductions.
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'concerts'
   and column_name in ('title', 'title_en', 'description', 'description_en', 'artists');

select
  title,
  title_en is not null            as titre_traduit,
  description_en is not null      as description_traduite,
  (select count(*) from jsonb_array_elements(artists) a
     where a->>'bio_en' is not null and a->>'bio_en' <> '') as bios_traduites,
  jsonb_array_length(artists)                               as nb_artistes
from public.concerts
order by date;
