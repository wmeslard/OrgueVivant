-- Verrouillage de l'écriture directe sur les tables de contenu.
--
-- Constat (audit du 9 septembre 2026, vérifié sur la base réelle avec un compte
-- `authenticated` sans rôle admin) :
--   concerts : SELECT ok, INSERT refusé, mais UPDATE et DELETE ACCEPTÉS
--   news     : idem, UPDATE et DELETE ACCEPTÉS
-- Un compte authentifié pouvait donc modifier ou supprimer concerts et
-- actualités directement via l'API Supabase, en contournant `requireAdmin()`
-- et la distinction admin / super_admin appliquées par /api/admin/**.
--
-- Portée réelle : les inscriptions publiques Supabase sont désactivées
-- (`disable_signup: true`), seuls les comptes invités existent. Le risque
-- immédiat est donc limité, mais le principe de moindre privilège impose de
-- fermer cet accès : un jeton d'administrateur qui fuiterait suffirait à
-- l'exploiter, et réactiver les inscriptions rendrait la faille exploitable
-- par n'importe qui.
--
-- Correctif : retirer les droits d'écriture aux rôles publics. Sans droit de
-- table, aucune policy ne peut autoriser l'opération — la protection ne dépend
-- donc pas du nom ni du contenu des policies existantes.
--
-- L'administration n'est pas affectée : /api/admin/** utilise la clé
-- `service_role`, qui contourne RLS et n'est pas visée par ces révocations.
--
-- À exécuter dans Supabase → SQL Editor. Aucune donnée n'est supprimée.

-- 1. Policy trop permissive, héritée du schéma initial.
drop policy if exists "Authenticated users manage concerts" on public.concerts;

-- 2. Retrait des droits d'écriture pour les rôles accessibles au navigateur.
revoke insert, update, delete on public.concerts from anon, authenticated;
revoke insert, update, delete on public.news     from anon, authenticated;

-- 3. La lecture publique reste ouverte (site vitrine).
grant select on public.concerts to anon, authenticated;
grant select on public.news     to anon, authenticated;

-- 4. RLS reste actif sur les deux tables.
alter table public.concerts enable row level security;
alter table public.news     enable row level security;

-- 5. Contrôle : les rôles publics ne doivent conserver que SELECT.
select grantee, table_name, string_agg(privilege_type, ', ' order by privilege_type) as droits
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('concerts', 'news', 'newsletter_subscribers')
  and grantee in ('anon', 'authenticated')
group by grantee, table_name
order by table_name, grantee;

-- Non-régression : ./supabase/test-rls-ecriture.sh
