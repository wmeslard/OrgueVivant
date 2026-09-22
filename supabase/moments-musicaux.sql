-- Moments musicaux ouverts aux élèves organistes.
--
-- Quatre tables, toutes additives : rien de l'existant n'est modifié.
--
--   moments_parametres     le jeton du lien privé de candidature (une ligne)
--   moments_candidatures   les candidatures reçues — DONNÉES PERSONNELLES
--   moments_eleves         les élèves acceptés, liés à leur compte Supabase
--   moments_seances        les séances réservées par les élèves
--   moments_fermetures     les périodes où l'orgue est indisponible
--
-- Aucun droit pour les rôles `anon` et `authenticated`, comme pour la
-- newsletter : toutes les lectures et écritures passent par /api/moments/** et
-- /api/admin/moments/**, côté serveur avec la clé `service_role`. Le site
-- public n'expose que la date, le prénom et l'initiale de l'élève.
--
-- À exécuter dans Supabase → SQL Editor. Aucune donnée n'est supprimée.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Lien privé de candidature
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists moments_parametres (
  id                 int primary key default 1 check (id = 1),
  -- 24 octets aléatoires en hexadécimal : le lien de candidature n'est pas
  -- devinable ; on le régénère depuis l'admin si jamais il circule trop.
  jeton_candidature  text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  updated_at         timestamptz not null default now()
);

insert into moments_parametres (id) values (1) on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Candidatures — DONNÉES PERSONNELLES
-- ─────────────────────────────────────────────────────────────────────────────

create type moments_statut_candidature as enum ('en_attente', 'acceptee', 'refusee');

create table if not exists moments_candidatures (
  id                      uuid primary key default gen_random_uuid(),
  prenom                  text not null,
  nom                     text not null,
  email                   text not null,
  telephone               text,
  conservatoire           text,
  professeur              text,
  niveau                  text,
  presentation            text,
  repertoire              text,
  -- Accord explicite pour afficher « Prénom N. » sur le site et dans l'agenda.
  consentement_publication boolean not null default false,
  statut                  moments_statut_candidature not null default 'en_attente',
  -- Message envoyé au candidat avec la décision.
  message_reponse         text,
  decided_at              timestamptz,
  created_at              timestamptz not null default now()
);

create index if not exists moments_candidatures_statut_idx on moments_candidatures (statut, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Élèves acceptés
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists moments_eleves (
  -- Identifiant du compte Supabase créé à l'acceptation (rôle `eleve`).
  id              uuid primary key references auth.users (id) on delete cascade,
  candidature_id  uuid references moments_candidatures (id) on delete set null,
  prenom          text not null,
  nom             text not null,
  email           text not null,
  -- Un élève désactivé ne peut plus se connecter au calendrier ; ses
  -- réservations à venir sont annulées.
  actif           boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Séances réservées
-- ─────────────────────────────────────────────────────────────────────────────

create type moments_statut_seance as enum ('reservee', 'annulee');

create table if not exists moments_seances (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  -- Créneau unique pour l'instant : 13 h 15 – 13 h 45.
  heure_debut   time not null default '13:15',
  heure_fin     time not null default '13:45',
  eleve_id      uuid not null references moments_eleves (id) on delete cascade,
  programme     text,
  statut        moments_statut_seance not null default 'reservee',
  -- Qui a annulé : l'élève lui-même ou l'association.
  annulee_par   text check (annulee_par in ('eleve', 'admin')),
  annulee_at    timestamptz,
  created_at    timestamptz not null default now()
);

-- Un seul élève par jour : l'unicité ne porte que sur les séances actives,
-- une séance annulée libère la date.
create unique index if not exists moments_seances_date_active_idx
  on moments_seances (date) where statut = 'reservee';
create index if not exists moments_seances_eleve_idx on moments_seances (eleve_id, date);

-- ─────────────────────────────────────────────────────────────────────────────
-- Périodes d'indisponibilité de l'orgue
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
-- Droits : rien pour les rôles publics
-- ─────────────────────────────────────────────────────────────────────────────

alter table moments_parametres   enable row level security;
alter table moments_candidatures enable row level security;
alter table moments_eleves       enable row level security;
alter table moments_seances      enable row level security;
alter table moments_fermetures   enable row level security;

revoke all on moments_parametres   from anon, authenticated;
revoke all on moments_candidatures from anon, authenticated;
revoke all on moments_eleves       from anon, authenticated;
revoke all on moments_seances      from anon, authenticated;
revoke all on moments_fermetures   from anon, authenticated;

-- Conservation : les candidatures refusées sont supprimées après six mois
-- (voir docs/registre-des-traitements.md). À planifier avec pg_cron :
--   select cron.schedule('moments-candidatures-refusees', '0 4 * * 1',
--     $$delete from public.moments_candidatures
--       where statut = 'refusee' and decided_at < now() - interval '6 months'$$);
