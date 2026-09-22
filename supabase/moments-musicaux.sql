-- Moments musicaux : les professeurs inscrivent leurs élèves.
--
-- Le titulaire du compte est le professeur, pas l'élève : il inscrit plusieurs
-- élèves, revient plusieurs fois dans l'année, et reste l'interlocuteur de
-- l'association. Les élèves — souvent mineurs — n'ont ni compte ni mot de
-- passe, et le site ne publie d'eux que « Prénom N. ».
--
--   moments_demandes       demandes d'accès des professeurs — DONNÉES PERSONNELLES
--   moments_professeurs    les professeurs validés, liés à leur compte Supabase
--   moments_seances        les créneaux réservés, avec l'élève et son professeur
--   moments_fermetures     les périodes exceptionnelles d'indisponibilité
--   moments_horaires       l'emploi du temps hebdomadaire de l'orgue
--
-- Aucun droit pour les rôles `anon` et `authenticated`, comme pour la
-- newsletter : toutes les lectures et écritures passent par /api/moments/** et
-- /api/admin/moments/**, côté serveur avec la clé `service_role`.
--
-- À exécuter dans Supabase → SQL Editor.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Reprise d'une première version, jamais mise en service
-- ─────────────────────────────────────────────────────────────────────────────
-- Une version antérieure faisait candidater les élèves eux-mêmes. Elle n'a
-- jamais servi : ces tables sont vides, aucune donnée n'est perdue.
drop table if exists moments_seances      cascade;
drop table if exists moments_eleves       cascade;
drop table if exists moments_candidatures cascade;
drop table if exists moments_parametres   cascade;
drop type  if exists moments_statut_candidature;
drop type  if exists moments_statut_seance;

-- ─────────────────────────────────────────────────────────────────────────────
-- Demandes d'accès des professeurs — DONNÉES PERSONNELLES
-- ─────────────────────────────────────────────────────────────────────────────

create type moments_statut_demande as enum ('en_attente', 'acceptee', 'refusee');

create table if not exists moments_demandes (
  id               uuid primary key default gen_random_uuid(),
  prenom           text not null,
  nom              text not null,
  email            text not null,
  telephone        text,
  conservatoire    text,
  -- Quelques mots libres : classe, nombre d'élèves concernés, période visée.
  message          text,
  statut           moments_statut_demande not null default 'en_attente',
  -- Message envoyé au professeur avec la décision.
  message_reponse  text,
  decided_at       timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists moments_demandes_statut_idx on moments_demandes (statut, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Professeurs validés
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists moments_professeurs (
  -- Identifiant du compte Supabase créé à la validation (rôle `professeur`).
  id                    uuid primary key references auth.users (id) on delete cascade,
  demande_id            uuid references moments_demandes (id) on delete set null,
  prenom                text not null,
  nom                   text not null,
  email                 text not null,
  conservatoire         text,
  -- Un professeur désactivé ne peut plus se connecter ; les séances déjà
  -- inscrites pour ses élèves sont annulées.
  actif                 boolean not null default true,
  -- Suivi d'usage pour l'administration : qui se connecte, qui n'est jamais venu.
  derniere_connexion_at timestamptz,
  created_at            timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Créneaux réservés
-- ─────────────────────────────────────────────────────────────────────────────

create type moments_statut_seance as enum ('reservee', 'annulee');

create table if not exists moments_seances (
  id             uuid primary key default gen_random_uuid(),
  date           date not null,
  heure_debut    time not null,
  heure_fin      time not null,
  check (heure_fin > heure_debut),
  -- Professeur qui a inscrit l'élève. Connu de l'administration seule : le
  -- site public n'affiche que l'élève.
  professeur_id  uuid not null references moments_professeurs (id) on delete cascade,
  eleve_prenom   text not null,
  eleve_nom      text not null,
  -- Facultatif : si l'élève a une adresse, il reçoit la confirmation et le rappel.
  eleve_email    text,
  programme      text,
  statut         moments_statut_seance not null default 'reservee',
  annulee_par    text check (annulee_par in ('professeur', 'admin')),
  annulee_at     timestamptz,
  -- Horodatage du rappel de la veille, pour ne pas l'envoyer deux fois.
  rappel_envoye_at timestamptz,
  created_at     timestamptz not null default now()
);

-- Un seul élève par créneau : l'unicité ne porte que sur les séances actives,
-- une annulation libère le créneau.
create unique index if not exists moments_seances_creneau_actif_idx
  on moments_seances (date, heure_debut) where statut = 'reservee';
create index if not exists moments_seances_professeur_idx on moments_seances (professeur_id, date);
create index if not exists moments_seances_date_idx on moments_seances (date) where statut = 'reservee';

-- ─────────────────────────────────────────────────────────────────────────────
-- Périodes exceptionnelles d'indisponibilité (travaux, accord, fermeture)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists moments_fermetures (
  id          uuid primary key default gen_random_uuid(),
  date_debut  date not null,
  date_fin    date not null check (date_fin >= date_debut),
  motif       text,
  created_at  timestamptz not null default now()
);

create index if not exists moments_fermetures_dates_idx on moments_fermetures (date_debut, date_fin);

-- ─────────────────────────────────────────────────────────────────────────────
-- Emploi du temps hebdomadaire de l'orgue
-- ─────────────────────────────────────────────────────────────────────────────
-- Deux sortes de lignes, modifiables depuis l'administration :
--   `ouverture` : les heures où l'orgue peut être joué ce jour-là ;
--   `blocage`   : ce qui s'y oppose — messes, confessions, autre.
-- Les horaires de la paroisse changent ; ils sont donc en base et non dans le
-- code, pour être corrigés sans redéploiement.

create type moments_type_horaire as enum ('ouverture', 'blocage');

create table if not exists moments_horaires (
  id            uuid primary key default gen_random_uuid(),
  -- 0 = dimanche, 1 = lundi, … 6 = samedi (convention JavaScript).
  jour_semaine  smallint not null check (jour_semaine between 0 and 6),
  type          moments_type_horaire not null,
  heure_debut   time not null,
  heure_fin     time not null,
  check (heure_fin > heure_debut),
  motif         text,
  created_at    timestamptz not null default now()
);

create index if not exists moments_horaires_jour_idx on moments_horaires (jour_semaine, type);

-- Valeurs de départ. À vérifier auprès de la paroisse avant l'ouverture aux
-- professeurs — elles viennent du site du doyenné de Lille (septembre 2026) :
--   messes à Saint-Maurice : du mardi au samedi à 12 h 15 ; dimanche 10 h 30 et 18 h 30
--   confessions            : du lundi au vendredi 15 h 30 – 17 h 30, samedi 13 h – 17 h 30
-- L'ouverture proposée (11 h – 15 h 30, du lundi au samedi) garde au rendez-vous
-- son caractère de pause musicale de la mi-journée ; l'élargir se fait en
-- modifiant ces lignes.
insert into moments_horaires (jour_semaine, type, heure_debut, heure_fin, motif)
select * from (values
  (1, 'ouverture'::moments_type_horaire, time '11:00', time '15:30', null),
  (2, 'ouverture'::moments_type_horaire, time '11:00', time '15:30', null),
  (3, 'ouverture'::moments_type_horaire, time '11:00', time '15:30', null),
  (4, 'ouverture'::moments_type_horaire, time '11:00', time '15:30', null),
  (5, 'ouverture'::moments_type_horaire, time '11:00', time '15:30', null),
  (6, 'ouverture'::moments_type_horaire, time '11:00', time '15:30', null),
  (2, 'blocage'::moments_type_horaire,   time '12:00', time '13:00', 'Messe de semaine'),
  (3, 'blocage'::moments_type_horaire,   time '12:00', time '13:00', 'Messe de semaine'),
  (4, 'blocage'::moments_type_horaire,   time '12:00', time '13:00', 'Messe de semaine'),
  (5, 'blocage'::moments_type_horaire,   time '12:00', time '13:00', 'Messe de semaine'),
  (6, 'blocage'::moments_type_horaire,   time '12:00', time '13:00', 'Messe de semaine'),
  (1, 'blocage'::moments_type_horaire,   time '15:30', time '17:30', 'Confessions'),
  (2, 'blocage'::moments_type_horaire,   time '15:30', time '17:30', 'Confessions'),
  (3, 'blocage'::moments_type_horaire,   time '15:30', time '17:30', 'Confessions'),
  (4, 'blocage'::moments_type_horaire,   time '15:30', time '17:30', 'Confessions'),
  (5, 'blocage'::moments_type_horaire,   time '15:30', time '17:30', 'Confessions'),
  (6, 'blocage'::moments_type_horaire,   time '13:00', time '17:30', 'Confessions')
) as v
where not exists (select 1 from moments_horaires);

-- ─────────────────────────────────────────────────────────────────────────────
-- Droits : rien pour les rôles publics
-- ─────────────────────────────────────────────────────────────────────────────

alter table moments_demandes    enable row level security;
alter table moments_professeurs enable row level security;
alter table moments_seances     enable row level security;
alter table moments_fermetures  enable row level security;
alter table moments_horaires    enable row level security;

revoke all on moments_demandes    from anon, authenticated;
revoke all on moments_professeurs from anon, authenticated;
revoke all on moments_seances     from anon, authenticated;
revoke all on moments_fermetures  from anon, authenticated;
revoke all on moments_horaires    from anon, authenticated;

-- Conservation : les demandes refusées sont supprimées après six mois
-- (voir docs/registre-des-traitements.md). À planifier avec pg_cron :
--   select cron.schedule('moments-demandes-refusees', '0 4 * * 1',
--     $$delete from public.moments_demandes
--       where statut = 'refusee' and decided_at < now() - interval '6 months'$$);
