-- Moments musicaux : accès des professeurs par lien partagé
--
-- À exécuter une fois dans Supabase → SQL Editor, après moments-musicaux.sql.
-- Sans effet si on le relance.
--
-- Les professeurs n'ont plus de compte ni de demande d'accès à faire valider :
-- quiconque ouvre le lien se présente (prénom, nom, email) et entre dans
-- l'espace. Le lien se régénère depuis l'administration ; l'ancien cesse alors
-- de fonctionner, y compris dans les navigateurs qui l'avaient déjà ouvert.
--
-- Aucune donnée n'est supprimée : les professeurs déjà enregistrés restent, et
-- moments_demandes, qui n'est plus alimentée, reste en place.

-- ─────────────────────────────────────────────────────────────────────────────
-- Le lien : une seule ligne, dont la clé termine l'adresse partagée
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists moments_lien (
  id       smallint primary key default 1 check (id = 1),
  cle      text not null,
  cree_at  timestamptz not null default now()
);

-- 122 bits d'aléa : la clé ne se devine pas.
insert into moments_lien (cle)
select replace(gen_random_uuid()::text, '-', '')
where not exists (select 1 from moments_lien);

alter table moments_lien enable row level security;
revoke all on moments_lien from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Professeurs sans compte Supabase
-- ─────────────────────────────────────────────────────────────────────────────
-- L'identifiant n'est plus celui d'un compte : il est tiré au hasard. L'email,
-- enregistré en minuscules, reconnaît le professeur d'un appareil à l'autre.

alter table moments_professeurs drop constraint if exists moments_professeurs_id_fkey;
alter table moments_professeurs alter column id set default gen_random_uuid();
update moments_professeurs set email = lower(trim(email)) where email <> lower(trim(email));
create unique index if not exists moments_professeurs_email_idx on moments_professeurs (email);
