-- Verrouillage de la table des abonnés à la newsletter.
--
-- Constat : la clé « anon », publiquement lisible dans le bundle envoyé à
-- chaque visiteur, pouvait lire cette table. N'importe qui pouvait donc
-- récupérer l'ensemble des adresses email, ainsi que les jetons de
-- désinscription, et désinscrire tout le monde.
--
-- Correctif : activer RLS et ne laisser AUCUNE politique. Les rôles `anon` et
-- `authenticated` n'ont alors plus aucun droit sur la table. La clé
-- `service_role`, utilisée uniquement côté serveur par les points d'entrée du
-- site, contourne RLS par conception : inscription, désinscription et envoi de
-- la newsletter continuent de fonctionner sans modification du code.
--
-- À exécuter dans Supabase → SQL Editor.

-- 1. Supprimer toute politique existante, quel que soit son nom.
do $$
declare pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'newsletter_subscribers'
  loop
    execute format('drop policy %I on public.newsletter_subscribers', pol.policyname);
  end loop;
end $$;

-- 2. Activer RLS. Sans politique, tout accès non privilégié est refusé.
alter table public.newsletter_subscribers enable row level security;

-- 3. Retirer les droits de table éventuellement accordés aux rôles publics,
--    RLS ne s'appliquant qu'aux droits déjà octroyés.
revoke all on public.newsletter_subscribers from anon, authenticated;

-- 4. Contrôle : doit renvoyer rls_active = true et zéro politique.
select
  c.relname                                as table_name,
  c.relrowsecurity                         as rls_active,
  (select count(*) from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'newsletter_subscribers') as nb_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'newsletter_subscribers';
