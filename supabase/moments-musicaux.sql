-- Moments musicaux : les professeurs inscrivent leurs élèves.
--
-- Les professeurs entrent par un lien secret que l'association leur transmet :
-- ni compte, ni mot de passe, ni validation. Ils se présentent une fois, puis
-- inscrivent leurs élèves sur les créneaux libres. Les élèves — souvent
-- mineurs — n'ont rien à créer, et le site ne publie d'eux que « Prénom N. ».
--
--   moments_lien           la clé du lien partagé (une seule ligne)
--   moments_professeurs    les professeurs entrés par le lien — DONNÉES PERSONNELLES
--   moments_seances        les créneaux réservés, avec l'élève et son professeur
--   moments_horaires       les horaires d'ouverture de l'orgue : règles par
--                          défaut (chaque semaine) et règles temporaires
--
-- Aucun droit pour les rôles `anon` et `authenticated`, comme pour la
-- newsletter : toutes les lectures et écritures passent par /api/moments/** et
-- /api/admin/moments/**, côté serveur avec la clé `service_role`.
--
-- Schéma complet, pour une base neuve : à exécuter dans Supabase → SQL Editor.
-- La base de production, créée avec une version antérieure, se met à jour avec
-- moments-musicaux-lien.sql, moments-musicaux-regles.sql, moments-musicaux-soi.sql puis
-- moments-musicaux-musiciens.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- Le lien partagé
-- ─────────────────────────────────────────────────────────────────────────────
-- Régénérer la clé (depuis l'administration) invalide l'ancien lien et les
-- accès ouverts avec lui.

create table if not exists moments_lien (
  id       smallint primary key default 1 check (id = 1),
  cle      text not null,
  cree_at  timestamptz not null default now()
);

-- 122 bits d'aléa : la clé ne se devine pas.
insert into moments_lien (cle)
select replace(gen_random_uuid()::text, '-', '')
where not exists (select 1 from moments_lien);

-- ─────────────────────────────────────────────────────────────────────────────
-- Professeurs — DONNÉES PERSONNELLES
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists moments_professeurs (
  id                    uuid primary key default gen_random_uuid(),
  prenom                text not null,
  nom                   text not null,
  -- En minuscules : reconnaît le professeur d'un appareil à l'autre.
  email                 text not null,
  conservatoire         text,
  -- Un professeur désactivé n'entre plus dans l'espace ; les séances à venir
  -- de ses élèves sont annulées.
  actif                 boolean not null default true,
  -- Suivi d'usage pour l'administration : qui vient, qui n'est jamais revenu.
  derniere_connexion_at timestamptz,
  created_at            timestamptz not null default now()
);

create unique index if not exists moments_professeurs_email_idx on moments_professeurs (email);

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
  -- Professeur qui a inscrit l'élève, ou null si c'est l'association. Connu
  -- de l'administration seule : le site public n'affiche que l'élève.
  professeur_id  uuid references moments_professeurs (id) on delete cascade,
  eleve_prenom   text not null,
  eleve_nom      text not null,
  -- Facultatif : si l'élève a une adresse, il reçoit la confirmation.
  eleve_email    text,
  programme      text,
  -- Vrai quand la personne entrée par le lien joue elle-même.
  pour_soi       boolean not null default false,
  -- Tous les musiciens, la personne inscrite en premier : [{prenom, nom,
  -- instrument}], quatre au plus. Vide pour une séance en solo d'avant.
  musiciens      jsonb not null default '[]'::jsonb check (jsonb_typeof(musiciens) = 'array'),
  statut         moments_statut_seance not null default 'reservee',
  annulee_par    text check (annulee_par in ('professeur', 'admin')),
  annulee_at     timestamptz,
  created_at     timestamptz not null default now()
);

-- Un seul élève par créneau : l'unicité ne porte que sur les séances actives,
-- une annulation libère le créneau.
create unique index if not exists moments_seances_creneau_actif_idx
  on moments_seances (date, heure_debut) where statut = 'reservee';
create index if not exists moments_seances_professeur_idx on moments_seances (professeur_id, date);
create index if not exists moments_seances_date_idx on moments_seances (date) where statut = 'reservee';

-- ─────────────────────────────────────────────────────────────────────────────
-- Horaires d'ouverture de l'orgue
-- ─────────────────────────────────────────────────────────────────────────────
-- Deux sortes de lignes, modifiables depuis l'administration :
--   `ouverture` : les heures où l'orgue peut être joué ;
--   `blocage`   : ce qui s'y oppose — messes, confessions, travaux, autre.
-- Une règle est soit « par défaut » (chaque semaine, un jour donné, sans
-- dates), soit temporaire (du … au …, un jour de la semaine ou tous les jours
-- si jour_semaine est null). Une fermeture complète est un blocage temporaire
-- de 0 h à 24 h. Les horaires de la paroisse changent ; ils sont donc en base
-- et non dans le code, pour être corrigés sans redéploiement.

create type moments_type_horaire as enum ('ouverture', 'blocage');

create table if not exists moments_horaires (
  id            uuid primary key default gen_random_uuid(),
  -- 0 = dimanche, 1 = lundi, … 6 = samedi (convention JavaScript) ; null :
  -- tous les jours de la période, pour une règle temporaire.
  jour_semaine  smallint check (jour_semaine between 0 and 6),
  type          moments_type_horaire not null,
  heure_debut   time not null,
  heure_fin     time not null,
  check (heure_fin > heure_debut),
  motif         text,
  -- Règle temporaire : du … au … (inclus). Sans dates, la règle vaut chaque semaine.
  date_debut    date,
  date_fin      date,
  constraint moments_horaires_portee_check check (
    (date_debut is null and date_fin is null and jour_semaine is not null)
    or (date_debut is not null and date_fin is not null and date_fin >= date_debut)
  ),
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

alter table moments_lien        enable row level security;
alter table moments_professeurs enable row level security;
alter table moments_seances     enable row level security;
alter table moments_horaires    enable row level security;

revoke all on moments_lien        from anon, authenticated;
revoke all on moments_professeurs from anon, authenticated;
revoke all on moments_seances     from anon, authenticated;
revoke all on moments_horaires    from anon, authenticated;
