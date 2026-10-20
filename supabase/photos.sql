-- Albums photos, gérés depuis l'admin (onglet Photos).
--
-- Écriture : seulement par le serveur, après vérification du rôle admin
-- (server/api/admin/photos/**), avec la clé de service. Aucune politique
-- d'écriture n'est ouverte, ni sur les tables ni sur l'espace de stockage :
-- le navigateur de l'admin envoie chaque fichier avec une autorisation à usage
-- unique que le serveur lui délivre, comme pour les programmes en PDF.
--
-- Lecture publique : uniquement les albums publiés et leurs photos, pour la
-- future rubrique du site. Un album en brouillon n'est visible que dans l'admin.
--
-- Fichiers : espace « photos », public en lecture comme celui des images des
-- concerts ; WebP ou JPEG, 8 Mo au plus ; noms aléatoires.
--
-- Rien d'existant n'est modifié. À exécuter dans Supabase → SQL Editor.

create table if not exists public.photo_albums (
  id            uuid primary key default gen_random_uuid(),
  titre         text not null,
  date          date,
  concert_id    uuid references public.concerts(id) on delete set null,
  couverture_id uuid,
  publie        boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.photos (
  id              uuid primary key default gen_random_uuid(),
  album_id        uuid not null references public.photo_albums(id) on delete cascade,
  chemin          text not null,
  chemin_vignette text not null,
  largeur         integer,
  hauteur         integer,
  legende         text,
  ordre           integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists photos_album_ordre on public.photos (album_id, ordre);

do $$ begin
  alter table public.photo_albums add constraint photo_albums_couverture_fk
    foreign key (couverture_id) references public.photos(id) on delete set null;
exception when duplicate_object then null;
end $$;

alter table public.photo_albums enable row level security;
alter table public.photos       enable row level security;

drop policy if exists "Lecture des albums publiés" on public.photo_albums;
create policy "Lecture des albums publiés" on public.photo_albums
  for select using (publie);

drop policy if exists "Lecture des photos des albums publiés" on public.photos;
create policy "Lecture des photos des albums publiés" on public.photos
  for select using (exists (select 1 from public.photo_albums a where a.id = album_id and a.publie));

revoke insert, update, delete on public.photo_albums, public.photos from anon, authenticated;

-- Droits explicites (Supabase ne les accorde plus d'office aux tables créées
-- après le 30 octobre 2026) : lecture pour les rôles publics, filtrée par les
-- politiques ci-dessus ; écriture pour la clé de service seulement.
grant select on public.photo_albums, public.photos to anon, authenticated;
grant select, insert, update, delete on public.photo_albums, public.photos to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 8 * 1024 * 1024, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Contrôle : deux tables avec RLS, deux politiques de lecture, un espace public.
select relname, relrowsecurity from pg_class where relname in ('photo_albums', 'photos');
select tablename, policyname, cmd from pg_policies where tablename in ('photo_albums', 'photos');
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'photos';
