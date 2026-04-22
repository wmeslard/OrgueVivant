# Orgue Vivant

Minimalist, Apple-inspired website showcasing organ concerts in downtown Lille (Saint-Maurice & Saint-Étienne churches).

## Stack

- **Nuxt 3** (Vue 3 Composition API) — chosen over plain Vite for SSR, first-class SEO, built-in routing/middleware, and the `@nuxtjs/sitemap` & `@nuxtjs/supabase` ecosystem.
- **TailwindCSS** with a bespoke Apple-inspired design system (Fraunces display + Inter body).
- **Supabase** — Postgres database + auth for the admin panel.
- **Nuxt i18n** — French (default) + English.
- **Nodemailer** — contact form via Node.js server route.
- **Vercel** hosting, **GitHub Actions** CI.

## File tree

```
.
├── .github/workflows/ci.yml
├── assets/css/main.css
├── components/
│   ├── AppHeader.vue
│   ├── AppFooter.vue
│   ├── ConcertCard.vue
│   ├── ConcertModal.vue
│   ├── CookieBanner.vue
│   ├── DarkModeToggle.vue
│   ├── LanguageToggle.vue
│   ├── NewsletterSignup.vue
│   └── SocialShare.vue
├── composables/
│   ├── useConcerts.ts
│   └── useIcs.ts
├── layouts/default.vue
├── locales/{fr,en}.json
├── middleware/auth.ts
├── pages/
│   ├── index.vue
│   ├── concerts.vue
│   ├── about.vue
│   ├── contact.vue
│   ├── legal.vue
│   ├── privacy.vue
│   └── admin/{index,login}.vue
├── public/{robots.txt,favicon.svg}
├── server/api/contact.post.ts
├── supabase/schema.sql
├── app.vue, nuxt.config.ts, tailwind.config.js, package.json …
```

## Getting started

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env
# Fill SUPABASE_URL / SUPABASE_KEY (from supabase.com), and SMTP_* for the contact form.

# 3. Dev server
npm run dev   # → http://localhost:3000
```

Without Supabase configured, the concerts page uses realistic mock data so the UI is fully explorable.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste `supabase/schema.sql` → run. This creates the `concerts` table (with enums, RLS, indexes, and seed rows).
3. In **Authentication → Users**, invite your admin email; set a password.
4. Copy the **Project URL** and **anon key** into `.env`.

## Admin panel

- Navigate to `/admin` → redirects to `/admin/login`.
- Sign in with the Supabase user you created. The dashboard lets you create, edit and delete concerts, and paste an image URL (or a Supabase Storage URL if you want uploads later).

## Deploying to Vercel

1. Push to GitHub.
2. In Vercel, **Import Project** → select the repo. Framework is auto-detected as Nuxt.
3. Set env vars (`SUPABASE_URL`, `SUPABASE_KEY`, `SMTP_*`, `CONTACT_TO`, `SITE_URL`).
4. Deploy. The GitHub Action (`.github/workflows/ci.yml`) runs lint + build on every push; Vercel auto-deploys on push to `main`.

## Features checklist

- ✅ Home, Concerts (upcoming/past tabs), About, Contact
- ✅ Concert modal with full details, ICS export, social share
- ✅ Admin panel (Supabase auth, CRUD)
- ✅ Contact form → Nodemailer SMTP
- ✅ FR/EN i18n with persisted preference
- ✅ Dark mode toggle (persisted via `@nuxtjs/color-mode`)
- ✅ Cookie banner, legal & privacy pages (GDPR)
- ✅ SEO: meta tags, OG, sitemap.xml, robots.txt, semantic HTML
- ✅ Newsletter signup (UI), .ics export, social sharing
- ✅ CI/CD: GitHub Actions → Vercel

## Notes

- The app is mobile-first and responsive down to 320px.
- All copy lives in `locales/{fr,en}.json` — adding a language is a matter of dropping a third file.
- `useConcerts` gracefully falls back to mock data when Supabase is unreachable, so the first-run experience is always showing content.
