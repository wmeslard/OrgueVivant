-- Moments musicaux : rappel la veille
--
-- À exécuter une fois dans Supabase → SQL Editor, après moments-musicaux-affectations.sql.
-- Sans effet si on le relance.
--
-- La tâche quotidienne (/api/cron/moments) envoie, la veille de chaque séance
-- inscrite, un rappel à la personne qui l'a inscrite. Cette colonne note
-- l'envoi, pour qu'il ne parte qu'une fois même si la tâche est relancée.

alter table moments_seances add column if not exists rappel_at timestamptz;
