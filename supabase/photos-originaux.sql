-- Albums photos : on garde aussi le fichier d'origine de chaque photo, en
-- pleine définition et dans son format (JPEG, HEIC, PNG…), pour le zoom et le
-- téléchargement. La copie légère (WebP) et la vignette restent pour
-- l'affichage.
--
-- Une colonne qui naît vide (les photos déjà envoyées n'ont pas d'original) et
-- un espace de stockage élargi : 50 Mo par fichier, les formats d'origine des
-- téléphones et appareils photo. Rien d'existant n'est modifié ni supprimé.
-- À exécuter dans Supabase → SQL Editor.

alter table public.photos add column if not exists chemin_original text;

update storage.buckets
   set file_size_limit    = 50 * 1024 * 1024,
       allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/avif', 'image/tiff']
 where id = 'photos';

-- Contrôle : la colonne, puis l'espace (52428800 octets, sept formats).
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'photos' and column_name = 'chemin_original';
select id, file_size_limit, allowed_mime_types from storage.buckets where id = 'photos';
