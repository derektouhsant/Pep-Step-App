# PepStep

Mobile-first web app for **PepStep Guide & Research** ([pepstepguide.com](https://pepstepguide.com)).

**Put a Pep in Your Step.** *Longevity is Movement.*

Family owned · Veteran owned.

## What this app is

PepStep here is **Home + Diary + Workouts + More** only.

Peptide catalog, logbook, reminders, shop, and regimen tools are **intentionally excluded**. Those belong in a future separate app.

## Tabs

1. **Home** (default) — today overview of diary nutrition (calories left, macros, water, meal snapshot) and workouts (none / in progress / finished), plus a light 7-day movement glance from existing logs. Cards and CTAs jump into Diary or Workouts.
2. **Diary** — calorie ring, macro bars, meals, water cups, editable goals, sample foods + custom entries
3. **Workouts** — start / resume / finish, previous performance, browse ~200 exercises by body part, DIY or AI plan builder, video placeholders
4. **More** — account / cloud sync, Add to Home Screen tip, brand, [pepstepguide.com](https://pepstepguide.com), [support@pepstepguide.com](mailto:support@pepstepguide.com), not-medical-advice disclaimer

## Offline vs cloud

**Logged out (default):** diary, goals, workouts, and plans stay in this browser via `localStorage`. You can use the whole app without an account.

**Logged in:** the same data is also written to your Supabase project. Signing in on another phone or browser profile loads (and merges) that history.

On login, PepStep unions diary days, meal items, custom foods, plans, and workout history by id. Goals keep any non-default values from either side. If this device already has data from a *different* account, it loads the newly signed-in account from the cloud instead of mixing the two.

There is **no service worker**. Offline use is the localStorage copy; sync correctness is prioritized over a cached shell that could serve stale diary data in Vite or iOS standalone.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Without env vars the app still runs in offline `localStorage` mode. Account UI in **More** will say cloud sync is not configured.

Production preview:

```bash
npm run build
npm run preview
```

Checks:

```bash
npm run check-data
npm run check-sync
```

## Set up Supabase (cloud sync)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard open **SQL Editor**, paste `supabase/migrations/001_pepstep_sync.sql`, and run it. That creates tables plus row-level security so each user can only read/write their own rows.
3. **Authentication → Providers → Email**: enable Email. Magic links are enough (no password UI in the app).
4. **Authentication → URL configuration**
   - Site URL: your deployed origin (for example `https://your-app.vercel.app`)
   - Redirect URLs: that origin **and** `http://localhost:5173/**` for local Vite
5. **Settings → API**: copy **Project URL** and **anon public** key into `.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Never put the `service_role` key in this app. The anon key is a public client key; RLS is what protects user data.

Restart `npm run dev` after changing env vars.

## Test sync on two browsers

1. Browser A: open the app → **More** → enter your email → **Email me a magic link**.
2. Open the mail, tap the link (it should return to the same origin). **More** should show **Synced**.
3. **Diary**: add a food and some water. Wait until the status pill reads **Synced** (or tap **Sync now**).
4. **Workouts**: start a workout or save a plan if you want those covered too.
5. Browser B (another browser, a second Chrome profile, or a private window): sign in with the **same email** via a new magic link.
6. After sign-in, Diary and Workouts should show the same history.

Magic links are one-time: each browser/profile needs its own email. Check spam if the message does not arrive.

## iPhone: Add to Home Screen

PepStep is a mobile PWA (manifest, navy `#0A2540` theme color, 180px apple-touch-icon). It is built for Safari’s viewport, including safe-area padding above the home indicator.

1. Open the deployed site in **Safari** (not Chrome, and not an in-app browser).
2. Tap the **Share** button.
3. Scroll and tap **Add to Home Screen**, then **Add**.
4. Open the PepStep icon on the Home Screen for a full-screen, branded app.

The More tab (and a first-run banner) repeats these steps in the app.

## Deploy on Vercel

This is a Vite static app. Import the GitHub repo in Vercel (or run `npx vercel`).

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project environment variables, then redeploy. Also add the Vercel origin to Supabase redirect URLs.

## Stack

Vite + vanilla HTML/CSS/JS. Navy / light-blue PepStep palette. No orange or green accents. Optional Supabase Auth (email magic link) and Postgres tables for sync.
