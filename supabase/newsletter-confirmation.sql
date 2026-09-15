-- Confirmation d'inscription à la newsletter (double opt-in).
--
-- Une adresse n'est destinataire qu'après un clic sur le lien de confirmation
-- reçu par email. Les abonnés déjà présents sont considérés confirmés : ils
-- recevaient déjà les envois, on ne perd personne.
--
-- Aucune donnée n'est supprimée.
-- À exécuter dans Supabase → SQL Editor, avant de déployer le code.

alter table public.newsletter_subscribers
  add column if not exists confirmed_at timestamptz;

update public.newsletter_subscribers
   set confirmed_at = coalesce(subscribed_at, now())
 where confirmed_at is null;

-- Contrôle
select count(*) filter (where confirmed_at is not null) as confirmes,
       count(*) filter (where confirmed_at is null)     as en_attente
  from public.newsletter_subscribers;
