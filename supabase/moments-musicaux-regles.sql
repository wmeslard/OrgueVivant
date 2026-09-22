-- Moments musicaux : règles d'ouverture temporaires, inscriptions par l'association
--
-- À exécuter une fois dans Supabase → SQL Editor, après moments-musicaux-lien.sql.
-- Sans effet si on le relance. Une base neuve n'en a pas besoin :
-- moments-musicaux.sql y crée directement le schéma final.

-- ─────────────────────────────────────────────────────────────────────────────
-- Règles temporaires
-- ─────────────────────────────────────────────────────────────────────────────
-- Une règle d'horaires est soit « par défaut » (chaque semaine, sans dates),
-- soit temporaire (du … au …). Une règle temporaire peut viser un jour de la
-- semaine ou tous les jours de la période. Une fermeture complète de l'orgue
-- est une règle temporaire de blocage de 0 h à 24 h : la table des fermetures
-- disparaît, ses éventuelles lignes deviennent des règles temporaires.

alter table moments_horaires add column if not exists date_debut date;
alter table moments_horaires add column if not exists date_fin   date;
alter table moments_horaires alter column jour_semaine drop not null;

alter table moments_horaires drop constraint if exists moments_horaires_portee_check;
alter table moments_horaires add constraint moments_horaires_portee_check check (
  (date_debut is null and date_fin is null and jour_semaine is not null)
  or (date_debut is not null and date_fin is not null and date_fin >= date_debut)
);

do $$
begin
  if to_regclass('public.moments_fermetures') is not null then
    insert into moments_horaires (jour_semaine, type, heure_debut, heure_fin, motif, date_debut, date_fin)
    select null, 'blocage', time '00:00', time '24:00', coalesce(motif, 'Orgue indisponible'), date_debut, date_fin
    from moments_fermetures;
    drop table moments_fermetures;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Séances inscrites par l'association, sans professeur
-- ─────────────────────────────────────────────────────────────────────────────

alter table moments_seances alter column professeur_id drop not null;
