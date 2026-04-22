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
  artists text,
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

create policy "Authenticated users manage concerts"
  on concerts for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Seed data (optional)
insert into concerts (title, date, time, location, artists, instruments, description, image_url, duration, price_type, external_link)
values
  ('Récital Bach — Toccata & Fugue', '2026-05-17', '20:30', 'saint_maurice',
   'Élisabeth Joyé', 'Grand orgue Cavaillé-Coll',
   'Un parcours à travers les œuvres majeures de Jean-Sébastien Bach.',
   'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=60',
   '1h15', 'free', null),
  ('Nuit des orgues — Improvisations', '2026-06-21', '21:00', 'saint_etienne',
   'Thierry Escaich', 'Orgue historique',
   'Improvisations libres sur des thèmes proposés par le public.',
   'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=60',
   '1h30', 'paid', 'https://example.com/billetterie');
