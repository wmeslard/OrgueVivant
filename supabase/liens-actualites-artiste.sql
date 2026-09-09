-- Deux évolutions du schéma, sans perte de données.
--
-- 1. concerts.artists passe de `text` à `jsonb` : au lieu d'une ligne unique
--    (« Salomé Gamot, orgue »), le champ devient une liste d'artistes, chacun
--    avec son nom, sa photo et sa présentation. Format :
--      [{ "name": "...", "image_url": "...", "bio": "..." }]
--    Le petit champ texte de l'espace admin disparaît : cette liste le
--    remplace, et la ligne courte affichée dans les listes et les emails est
--    reconstruite à partir des noms.
--
-- 2. news.concert_id rattache une actualité au concert qu'elle annonce, pour
--    la faire remonter dans la carte du prochain concert sur la page d'accueil.
--
-- ORDRE D'EXÉCUTION : déployer le code AVANT de lancer ce script. Le code sait
-- lire les deux formats, donc rien ne casse pendant l'intervalle ; l'ancien
-- code, lui, afficherait « [object Object] » face à la colonne convertie.
--
-- Aucune donnée n'est supprimée : le texte d'origine est d'abord recopié dans
-- `artists_text`, qui reste en base comme filet de sécurité.

-- 1a. Archive du texte d'origine.
alter table public.concerts add column if not exists artists_text text;

update public.concerts
   set artists_text = artists::text
 where artists_text is null;

-- 1b. Conversion. Le `do` rend le script rejouable : si la colonne est déjà en
--     jsonb, il n'y a rien à faire.
do $$
begin
  if (select data_type from information_schema.columns
       where table_schema = 'public' and table_name = 'concerts'
         and column_name = 'artists') = 'text' then

    alter table public.concerts alter column artists drop default;

    alter table public.concerts
      alter column artists type jsonb
      using (
        case
          when coalesce(trim(artists), '') = '' then '[]'::jsonb
          else jsonb_build_array(
                 jsonb_build_object('name', trim(artists), 'image_url', '', 'bio', ''))
        end
      );

    update public.concerts set artists = '[]'::jsonb where artists is null;

    alter table public.concerts
      alter column artists set default '[]'::jsonb,
      alter column artists set not null;
  end if;
end $$;

-- 2. Lien actualité → concert.
--    `on delete set null` : supprimer un concert ne doit pas supprimer
--    l'actualité qui en parlait, seulement défaire le lien.
alter table public.news add column if not exists concert_id uuid
  references public.concerts(id) on delete set null;

create index if not exists news_concert_id_idx on public.news(concert_id);

-- Contrôle
select table_name, column_name, data_type, column_default
  from information_schema.columns
 where table_schema = 'public'
   and (table_name, column_name) in
       (('concerts','artists'), ('concerts','artists_text'), ('news','concert_id'));

select id, title, artists_text, artists from public.concerts order by date desc limit 10;
