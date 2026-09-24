-- Moments musicaux : jouer à plusieurs
--
-- À exécuter une fois dans Supabase → SQL Editor, après moments-musicaux-soi.sql.
-- Sans effet si on le relance.
--
-- Une séance peut réunir jusqu'à quatre musiciens : la personne inscrite, puis
-- celles qui jouent avec elle, chacune avec son instrument (champ libre). Le site
-- n'en publie que « Prénom N. » et l'instrument. eleve_prenom et eleve_nom
-- restent ceux du premier musicien. Les séances déjà enregistrées gardent une
-- liste vide : elles restent en solo.

alter table moments_seances
  add column if not exists musiciens jsonb not null default '[]'::jsonb
  check (jsonb_typeof(musiciens) = 'array');
