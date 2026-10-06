-- Programme d'un concert en PDF, téléchargeable depuis la page du concert.
--
-- Une colonne pour l'adresse du fichier, et un espace de stockage réservé aux
-- PDF. L'envoi passe par une autorisation que délivre le serveur après avoir
-- vérifié le rôle admin (server/api/admin/programme-pdf.post.ts) : aucune
-- politique d'écriture n'est donc ouverte sur cet espace. La lecture est
-- publique, comme pour les images des concerts.
--
-- Supabase refuse lui-même tout fichier qui n'est pas un PDF ou qui dépasse
-- 20 Mo. Aucune donnée existante n'est modifiée : la colonne naît vide.
--
-- À exécuter dans Supabase → SQL Editor.

alter table public.concerts add column if not exists programme_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('concert-programmes', 'concert-programmes', true, 20 * 1024 * 1024, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Contrôle : une ligne, public, 20971520 octets, application/pdf.
select id, public, file_size_limit, allowed_mime_types
  from storage.buckets
 where id = 'concert-programmes';
