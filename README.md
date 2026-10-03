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
3. **Workouts** — start / resume / finish, previous performance, browse ~200 exercises by body part, DIY or AI plan builder. **Treadmill** (Cardio) logs incline, speed (mph), and time with scroll wheels. Other cardio still logs minutes and calories. Strength stays sets, reps, and load. Form-video placeholders stay hidden while `SHOW_WORKOUT_VIDEOS` in `src/config.js` is `false` (YouTube links come later; do not self-host video).
4. **More** — account / cloud sync, Add to Home Screen tip, brand, [pepstepguide.com](https://pepstepguide.com), [support@pepstepguide.com](mailto:support@pepstepguide.com), privacy / support / terms, not-medical-advice disclaimer

Public pages (no login), for App Store URLs:

- https://pep-step-app.vercel.app/privacy
- https://pep-step-app.vercel.app/support
- https://pep-step-app.vercel.app/terms

The privacy copy is a **draft for review, not legal advice**. The contact address `derektouhsant@gmail.com` is a placeholder to swap before submission.

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

6. **Account deletion** (required before App Store review). The anon key cannot delete auth users. Apply `supabase/migrations/002_delete_own_account.sql`:
   1. Dashboard → **SQL Editor** → **New query**.
   2. Paste the whole file and run it.
   3. Confirm **Database → Functions** lists `delete_own_account`.

   That function deletes only `auth.uid()`, plus the matching rows in `profiles`, `diary_days`, `custom_foods`, `workout_sessions`, and `workout_plans`. In the app: **More → Account → Delete account**.

   If the SQL editor returns `permission denied for table users`, deploy the Edge Function instead (the app tries the SQL function first, then this function):

   1. Dashboard → **Edge Functions** → **Deploy a new function** → name it `delete-account`.
   2. Paste `supabase/functions/delete-account/index.ts` and deploy. Leave **Verify JWT** on.
   3. Or, with the [Supabase CLI](https://supabase.com/docs/guides/cli): `supabase login`, `supabase link --project-ref YOUR_PROJECT_REF`, then `supabase functions deploy delete-account`.

   The hosted function reads `SUPABASE_SERVICE_ROLE_KEY` from the function environment. Do not copy that key into `.env.local` or Vercel.

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

PepStep is a mobile PWA (manifest, navy `#0A2540` theme color, app icons, and a branded splash). It is built for Safari’s viewport, including safe-area padding for the notch and the home indicator. A short note on Home says the log is not medical advice. If the device is offline, a banner explains that saved logs still work and will sync later.

1. Open the deployed site in **Safari** (not Chrome, and not an in-app browser).
2. Tap the **Share** button.
3. Scroll and tap **Add to Home Screen**, then **Add**.
4. Open the PepStep icon on the Home Screen for a full-screen, branded app.

The More tab (and a first-run banner) repeats these steps in the app.

## iOS app (Capacitor)

The website build is unchanged (`npm run build` → `dist`, deployed by Vercel). The native shell lives in `ios/` and is opened in Xcode on a Mac.

Bundle id: **`com.pepstep.app`**. Change this in `capacitor.config.json` and in Xcode (Signing & Capabilities → Bundle Identifier) **before the first App Store submit** if you want a different id. Apple will not let you change it later for the same app record.

```bash
npm install
npm run build:ios
```

`build:ios` is `vite build` plus `npx cap sync ios`. Then open `ios/App/App.xcodeproj` in Xcode.

### Magic-link return

Inside the iOS app, sign-in emails redirect to `pepstep://auth/callback` (a custom URL scheme registered on the app). The website still redirects to its own origin, same as before.

In Supabase → **Authentication → URL configuration → Redirect URLs**, add:

- `pepstep://auth/callback`
- `https://pep-step-app.vercel.app`
- `https://pep-step-app.vercel.app/**`
- `http://localhost:5173/**` for local Vite

The iPhone must be able to open the mail link. The app exchanges the `code` for a session when iOS opens PepStep.

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
