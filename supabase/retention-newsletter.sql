-- Durée de conservation : purge des inscriptions jamais confirmées.
--
-- Une adresse saisie mais non confirmée dans les trente jours n'a pas donné
-- son consentement : elle est effacée, comme l'annonce la politique de
-- confidentialité. Les abonnés confirmés ne sont jamais touchés.
--
-- pg_cron doit être activé (Dashboard → Database → Extensions → pg_cron),
-- puis exécuter ce script dans Supabase → SQL Editor. Tâche quotidienne, 3h17.

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'newsletter-purge-non-confirmes',
  '17 3 * * *',
  $$ delete from public.newsletter_subscribers
      where confirmed_at is null
        and subscribed_at < now() - interval '30 days' $$
);

-- Contrôle : la tâche est enregistrée.
select jobname, schedule, active from cron.job where jobname = 'newsletter-purge-non-confirmes';
