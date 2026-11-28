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
3. **Workouts** — start / resume / finish, previous performance, browse ~200 exercises by body part, DIY or AI plan builder, video placeholders. **Treadmill** (Cardio) logs incline, speed (mph), and time with scroll wheels. Other cardio still logs minutes and calories. Strength stays sets, reps, and load.
4. **More** — account / cloud sync, delete account (when signed in), Add to Home Screen tip, brand, [privacy policy](https://pep-step-app.vercel.app/privacy), [pepstepguide.com](https://pepstepguide.com), [support@pepstepguide.com](mailto:support@pepstepguide.com), not-medical-advice disclaimer

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
3. In the same SQL editor, paste `supabase/migrations/002_delete_account.sql` and run it. That adds `delete_own_account()`, which the signed-in user calls from **More → Delete account**. The function deletes that auth user and their PepStep rows. The app never receives the service role key. Until this script has been run, Delete account shows an error and leaves the account and on-device data in place.
4. **Authentication → Providers → Email**: enable Email. Magic links are enough (no password UI in the app).
5. **Authentication → URL configuration**
   - Site URL: your deployed origin (for example `https://your-app.vercel.app`)
   - Redirect URLs: that origin **and** `http://localhost:5173/**` for local Vite. For the iPhone and Android apps, also add `pepstep://auth/callback` (see below).
6. **Settings → API**: copy **Project URL** and **anon public** key into `.env.local`:

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

## iPhone app (Xcode)

The website stays a Vite app. The `ios/` project is a Capacitor 8 shell around that same build so it can run on an iPhone with read-only Apple Health. Derek builds and signs it on a Mac. See the pull request for the full Mac checklist.

```bash
npm install
cp .env.example .env.local
# fill in the same Supabase URL and anon key used on Vercel
npm run build:ios
```

Then open `ios/App/App.xcodeproj` in Xcode (Swift Package Manager, not CocoaPods).

Bundle id in this repo is `com.pepstep.app`. Change `appId` in `capacitor.config.json` and the bundle identifier in Xcode before the first App Store submit if you want a different id.

Magic-link sign-in inside the app returns through the custom URL scheme `pepstep://auth/callback`. In Supabase, **Authentication → URL Configuration → Redirect URLs**, add:

- `pepstep://auth/callback`
- `pepstep://**`

Leave the existing website URLs in place (`https://pep-step-app.vercel.app/**` and `http://localhost:5173/**`). The website still redirects to its own origin. Universal Links are not used: they need a paid Apple Developer account and an Associated Domains file.

Apple Health is iOS-only and read-only. Imported workouts and steps stay on the phone. They are not written into Supabase and they do not replace workouts logged in PepStep. The iOS shell registers the Health plugin on the Capacitor bridge, so tapping the More switch calls HealthKit. Until that request reaches iOS, PepStep does not appear in Settings → Health → Data Access & Devices. If the switch cannot connect, the error text stays under the switch. `NSHealthUpdateUsageDescription` is present because iOS asks for it during the Health permission request; PepStep still sends an empty write list and never saves samples.

## Android app (Android Studio)

The `android/` project is a Capacitor 8 shell around the same Vite build. Application id `com.pepstep.app`, versionCode `1`, versionName `1.0`. `minSdk` is 26 (Health Connect’s floor, Android 8.0). `compileSdk` and `targetSdk` are 36, which is what Google Play requires for new apps and updates as of August 31, 2026.

```bash
npm install
cp .env.example .env.local
# fill in the same Supabase URL and anon key used on Vercel
npm run build:android
```

Open `android/` in Android Studio Otter or newer. A debug install from the IDE does not need an upload keystore.

Magic-link sign-in uses the same custom scheme as iPhone: `pepstep://auth/callback`. The Android manifest handles that URL, and the existing native auth listener finishes the Supabase PKCE exchange. In Supabase redirect URLs, `pepstep://auth/callback` covers both apps. Leave the website URLs in place.

Health Connect is the Android equivalent of Apple Health. The same `@capgo/capacitor-health` plugin reads steps and exercise sessions (walking, running, treadmill). The More switch is labelled **Health Connect** on Android and **Apple Health** on iPhone. Nothing is written. Imported sessions stay on the phone and are not copied to Supabase. Android 14 and later include Health Connect. On earlier versions the switch explains that it needs to be installed from the Play Store. The permission sheet’s privacy link opens `https://pep-step-app.vercel.app/privacy` (`health_connect_privacy_policy_url`). Reads older than about 30 days also ask for Health Connect history access, which matches the 90-day window used on iPhone. If that extra permission is declined, recent steps and sessions still load.

The app manifest keeps only the read permissions PepStep uses and strips the plugin’s unused health permissions (including heart rate, active calories, and every write permission) so the Play Console declaration stays limited to steps, exercise, and history.

### Upload keystore and the Play bundle

Do not commit the keystore or `android/keystore.properties`. Create an upload key once and store it somewhere you can back up. Google Play App Signing holds the app signing key; this keystore only signs what you upload.

From the repo root:

```bash
keytool -genkeypair -v \
  -keystore android/pepstep-upload.keystore \
  -alias pepstep \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
cp android/keystore.properties.example android/keystore.properties
```

Edit `android/keystore.properties` and set `storePassword` and `keyPassword`. `storeFile` is relative to the `android/` directory (`pepstep-upload.keystore` matches the command above). An absolute path works too.

The same four values can come from the environment instead of the properties file:

- `PEPSTEP_UPLOAD_STORE_FILE`
- `PEPSTEP_UPLOAD_STORE_PASSWORD`
- `PEPSTEP_UPLOAD_KEY_ALIAS`
- `PEPSTEP_UPLOAD_KEY_PASSWORD`

Then:

```bash
npm run build:android
cd android
./gradlew bundleRelease
```

The App Bundle is `android/app/build/outputs/bundle/release/app-release.aab`. `bundleRelease` stops with an error if signing is not configured. `./gradlew assembleDebug` does not need the keystore. Its APK is `android/app/build/outputs/apk/debug/app-debug.apk`.

Regenerate the launcher and splash from the iOS artwork with `npx @capacitor/assets generate --android`. Sources are in `assets/` (`icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`), copied from the iOS app icon and splash.

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

The privacy policy is a public page at `/privacy` (https://pep-step-app.vercel.app/privacy). It loads without sign-in. `vercel.json` rewrites that path to the app so the Vite build can render it. The More tab and the sign-in form link to it. Inside the iPhone and Android apps the link opens the same page in the web view. Health Connect’s permission screen uses that URL as its privacy rationale.

## Stack

Vite + vanilla HTML/CSS/JS, wrapped for iPhone and Android with Capacitor 8. Navy / light-blue PepStep palette. No orange or green accents. Optional Supabase Auth (email magic link) and Postgres tables for sync. Apple Health and Health Connect are read-only and stay on device.

## Foods and exercises you add

If a food or exercise is not in the list, type its name and tap **Add “that name”** (or **Add custom** before you search). Name is enough to save. For a food you can also set the serving size (such as 1 cup or 100 g) and the calories, protein, carbs, and fat for that serving. Those numbers scale with how many servings you log. For an exercise you can pick strength or cardio, and a muscle group.

Saved items show up again in search with a small **My item** tag. Edit or delete them from that row. The new item is added to the meal, workout, or plan you were already in.

They stay on the device either way. Signed-in custom foods sync with the tables from `001_pepstep_sync.sql`. Signed-in custom exercises sync after you paste `supabase/migrations/004_custom_exercises.sql` into the Supabase SQL editor and run it. Until that script has been run, those exercises stay on the device and the rest of sync still works.
