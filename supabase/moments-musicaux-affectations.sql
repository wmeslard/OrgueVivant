-- Moments musicaux : Louis-Paul Courtois, quand personne n'est inscrit
--
-- À exécuter une fois dans Supabase → SQL Editor, après moments-musicaux-musiciens.sql.
-- Sans effet si on le relance.
--
-- Les Moments musicaux ont lieu un jeudi sur deux. Deux jours avant, si
-- personne ne s'est inscrit, Louis-Paul Courtois est affecté à la séance et
-- prévenu par email (tâche quotidienne /api/cron/moments). Son nom n'est publié
-- sur le site qu'à partir de là.
--
--   moments_reglages      une ligne : l'adresse de Louis-Paul Courtois, réglée
--                         depuis l'administration (jamais dans le code, public)
--   moments_affectations  les jeudis où il joue faute d'inscrit, et quand il a
--                         été prévenu

create table if not exists moments_reglages (
  id               smallint primary key default 1 check (id = 1),
  email_organiste  text
);
insert into moments_reglages (id) values (1) on conflict (id) do nothing;

create table if not exists moments_affectations (
  date        date primary key,
  -- Null tant que l'email n'est pas parti (adresse pas encore renseignée).
  notifie_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- Même régime que les autres tables : accès par le serveur seulement.
alter table moments_reglages     enable row level security;
alter table moments_affectations enable row level security;
revoke all on moments_reglages     from anon, authenticated;
revoke all on moments_affectations from anon, authenticated;
