-- Limites d'envoi d'emails, partagées entre toutes les instances du site.
--
-- Constat : les limites des formulaires publics et du lien de connexion des
-- Moments musicaux vivaient en mémoire, une par instance Vercel, remises à
-- zéro à chaque démarrage. Un tiers pouvait inonder une boîte mail, ou
-- épuiser le quota de Resend (100 emails par jour en offre gratuite) : les
-- rappels des séances et l'avis à l'organiste ne partaient plus.
--
-- Correctif : un compteur par jour et par catégorie d'envoi, et la date du
-- dernier envoi par destinataire, tenus en base. La fonction reserver_envoi
-- vérifie et réserve en une seule instruction par table : deux instances ne
-- peuvent pas envoyer chacune. Les plafonds sont fixés côté serveur
-- (server/utils/envois.ts).
--
-- Les clés de destinataire sont des identifiants (« lien:<uuid de la fiche> »,
-- « newsletter:<uuid de l'abonné> »), jamais une adresse email.
--
-- Aucune donnée existante n'est modifiée ni supprimée. Tant que ce script
-- n'est pas exécuté, le site garde ses limites en mémoire.
--
-- À exécuter dans Supabase → SQL Editor.

create table if not exists public.envois_quota (
  jour      date    not null,
  categorie text    not null,
  nombre    integer not null default 0,
  primary key (jour, categorie)
);

create table if not exists public.envois_recents (
  cle     text        primary key,
  dernier timestamptz not null
);

-- Réservées au serveur : RLS sans politique, et aucun droit pour les rôles
-- publics.
alter table public.envois_quota   enable row level security;
alter table public.envois_recents enable row level security;
revoke all on public.envois_quota, public.envois_recents from anon, authenticated;
grant select, insert, update on public.envois_quota, public.envois_recents to service_role;

-- 'ok' : l'envoi est réservé. 'delai' : ce destinataire a reçu un envoi il y
-- a moins de p_delai. 'quota' : la catégorie a atteint son plafond du jour
-- (jour civil à Paris).
create or replace function public.reserver_envoi(
  p_categorie   text,
  p_limite_jour integer,
  p_cle         text     default null,
  p_delai       interval default null
) returns text
language plpgsql
set search_path = public
as $$
declare
  v_jour date := (now() at time zone 'Europe/Paris')::date;
begin
  if p_cle is not null then
    insert into envois_recents as r (cle, dernier) values (p_cle, now())
    on conflict (cle) do update set dernier = now()
      where r.dernier <= now() - coalesce(p_delai, interval '0');
    if not found then return 'delai'; end if;
  end if;

  insert into envois_quota as q (jour, categorie, nombre) values (v_jour, p_categorie, 1)
  on conflict (jour, categorie) do update set nombre = q.nombre + 1
    where q.nombre < p_limite_jour;
  if not found then return 'quota'; end if;

  return 'ok';
end $$;

-- Sans cela, la clé publique (lisible dans le navigateur) pourrait appeler la
-- fonction et remplir les compteurs pour bloquer les envois légitimes.
revoke execute on function public.reserver_envoi(text, integer, text, interval) from public, anon, authenticated;
grant  execute on function public.reserver_envoi(text, integer, text, interval) to service_role;

-- Contrôle : RLS active sur les deux tables, et seule service_role peut
-- exécuter la fonction.
select c.relname as table_name, c.relrowsecurity as rls_active
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname in ('envois_quota', 'envois_recents');

select grantee, privilege_type
  from information_schema.routine_privileges
 where routine_schema = 'public' and routine_name = 'reserver_envoi';
