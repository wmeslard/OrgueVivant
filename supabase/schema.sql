-- Orgue Vivant — Supabase schema

create extension if not exists "pgcrypto";

create type concert_location as enum ('saint_maurice', 'saint_etienne');
create type concert_price as enum ('free', 'paid');

create table if not exists concerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time time,
  location concert_location not null,
  artists jsonb not null default '[]'::jsonb,
  instruments text,
  description text,
  image_url text,
  duration text,
  price_type concert_price not null default 'free',
  external_link text,
  created_at timestamptz not null default now()
);

create index if not exists concerts_date_idx on concerts (date);

-- Row level security: public read, authenticated write.
alter table concerts enable row level security;

create policy "Public can read concerts"
  on concerts for select
  using (true);

-- Aucune policy d'écriture pour anon / authenticated : un audit du 9 septembre
-- 2026 a montré qu'un simple compte authentifié pouvait modifier et supprimer
-- des concerts directement via l'API, en contournant requireAdmin(). Les droits
-- d'écriture ont été révoqués (voir rls-ecriture.sql). L'administration passe
-- par /api/admin/**, qui utilise la clé service_role et contourne RLS.

-- Seed data (optional)
insert into concerts (title, date, time, location, artists, instruments, description, image_url, duration, price_type, external_link)
values
  ('Récital Bach — Toccata & Fugue', '2026-05-17', '20:30', 'saint_maurice',
   '[{"name":"Élisabeth Joyé"}]'::jsonb, 'Grand orgue Cavaillé-Coll',
   'Un parcours à travers les œuvres majeures de Jean-Sébastien Bach.',
   'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=60',
   '1h15', 'free', null),
  ('Nuit des orgues — Improvisations', '2026-06-21', '21:00', 'saint_etienne',
   '[{"name":"Thierry Escaich"}]'::jsonb, 'Orgue historique',
   'Improvisations libres sur des thèmes proposés par le public.',
   'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=60',
   '1h30', 'paid', 'https://example.com/billetterie');

-- ─────────────────────────────────────────────────────────────────────────────
-- Actualités
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists news (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  title_en     text not null,
  body         text not null,
  body_en      text not null,
  author       text,
  image_url    text,
  published_at timestamptz default now(),
  created_at   timestamptz default now()
);

alter table news enable row level security;

-- Contenu éditorial, public par nature.
create policy "Public can read news"
  on news for select
  to anon, authenticated
  using (true);

-- L'écriture passe par les points d'entrée serveur, qui utilisent la clé
-- `service_role` : celle-ci contourne RLS, aucune politique n'est requise.
-- Les droits d'écriture des rôles publics sont révoqués (voir rls-ecriture.sql).

-- ─────────────────────────────────────────────────────────────────────────────
-- Abonnés à la newsletter — DONNÉES PERSONNELLES
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists newsletter_subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null unique,
  -- 24 octets aléatoires en hexadécimal : jeton non devinable, porté par le
  -- lien de désinscription de chaque email envoyé.
  unsubscribe_token text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  subscribed_at     timestamptz default now()
);

-- AUCUNE politique, volontairement : la clé « anon » est publiquement lisible
-- dans le code envoyé à chaque visiteur. Lui laisser le moindre droit exposait
-- l'intégralité des adresses et des jetons de désinscription.
-- Un audit du 8 septembre 2026 a confirmé cette fuite avant correction.
--
-- Les points d'entrée /api/newsletter/* tournent côté serveur avec la clé
-- `service_role`, qui contourne RLS : inscription, désinscription et diffusion
-- fonctionnent sans qu'aucun droit public ne soit nécessaire.
alter table newsletter_subscribers enable row level security;
revoke all on newsletter_subscribers from anon, authenticated;

-- Non-régression : ./supabase/test-fuite-emails.sh
