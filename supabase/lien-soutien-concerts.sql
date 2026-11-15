-- Lien de soutien d'un concert : la page HelloAsso de l'événement (libre
-- participation), saisie dans l'admin. La fiche du concert l'ouvre depuis le
-- bouton « Soutenir ce concert » ; sans lien, pas de bouton.
--
-- Une colonne qui naît vide : aucune donnée existante n'est modifiée. Les
-- droits de lecture et d'écriture sur la table concerts couvrent la nouvelle
-- colonne (aucun droit par colonne sur cette table).
-- À exécuter dans Supabase → SQL Editor.

alter table public.concerts add column if not exists support_url text;

-- Contrôle : une ligne, support_url, text.
select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'concerts' and column_name = 'support_url';
