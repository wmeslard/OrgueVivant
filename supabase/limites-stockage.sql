-- Limites du bucket d'images côté serveur.
--
-- L'espace admin recadre chaque image dans le navigateur et n'envoie qu'un
-- WebP (voir components/ImageCropModal.vue) ; la seule vérification de taille
-- et de type se faisait pourtant côté client. On la double ici : un fichier
-- d'un autre type, ou de plus de 5 Mo, est refusé par Supabase lui-même.
--
-- Aucune donnée n'est modifiée ni supprimée ; les fichiers déjà en place
-- restent servis. À exécuter dans Supabase → SQL Editor.

update storage.buckets
   set file_size_limit    = 5 * 1024 * 1024,
       allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
 where id = 'concert-images';

-- Contrôle
select id, public, file_size_limit, allowed_mime_types
  from storage.buckets
 where id = 'concert-images';
