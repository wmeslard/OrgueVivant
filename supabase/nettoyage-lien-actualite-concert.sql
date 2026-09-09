-- Nettoyage : suppression du lien actualité → concert.
--
-- Le rapprochement entre une actualité et le concert qu'elle annonce a été
-- retiré du site. Plus aucun code ne lit ni n'écrit `news.concert_id` : la
-- colonne ne sert plus à rien.
--
-- ATTENTION, ce script détruit une donnée. Au moment de sa rédaction, un
-- rattachement existait encore ; il est consigné ici pour mémoire, faute de
-- quoi il disparaîtrait sans trace :
--
--   news d27be3c0-9430-4d31-9442-6a3f5e97bfcd  →  concert b8e10b49-a47e-415e-a34d-3e1b1f5eb8a4
--     « Orgue Vivant ouvre sa saison en musique à Saint-Étienne de Lille »
--
-- Pour le rétablir un jour, il faudrait recréer la colonne puis y réécrire
-- l'identifiant ci-dessus.
--
-- À exécuter dans Supabase → SQL Editor.

-- Contrôle avant : ce que l'on s'apprête à perdre.
select id, title, concert_id from public.news where concert_id is not null;

drop index if exists news_concert_id_idx;
alter table public.news drop column if exists concert_id;

-- Contrôle après : la requête ne doit plus renvoyer aucune ligne.
select column_name
  from information_schema.columns
 where table_schema = 'public' and table_name = 'news' and column_name = 'concert_id';
