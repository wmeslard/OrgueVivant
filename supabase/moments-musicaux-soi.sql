-- Moments musicaux : inscription par soi-même
--
-- À exécuter une fois dans Supabase → SQL Editor, après moments-musicaux-regles.sql.
-- Sans effet si on le relance.
--
-- Une personne qui a le lien peut désormais jouer elle-même, et non plus
-- seulement inscrire ses élèves. La séance le note : le site public n'affiche
-- alors pas la mention « Élève », et l'administration voit une inscription
-- personnelle plutôt qu'un élève inscrit par son professeur. Les séances déjà
-- enregistrées restent des inscriptions d'élèves.

alter table moments_seances add column if not exists pour_soi boolean not null default false;
