# PepStep

Mobile-first web app for **PepStep Guide & Research** ([pepstepguide.com](https://pepstepguide.com)).

**Put a Pep in Your Step.** *Longevity is Movement.*

Family owned · Veteran owned.

## What this app is

PepStep here is **Diary + Workouts + More** only.

Peptide catalog, logbook, reminders, shop, and regimen tools are **intentionally excluded**. Those belong in a future separate app.

## Tabs

1. **Diary** (default) — calorie ring, macro bars, meals, water cups, editable goals, sample foods + custom entries
2. **Workouts** — start / resume / finish, previous performance, browse ~200 exercises by body part, DIY or AI plan builder, video placeholders
3. **More** — brand, [pepstepguide.com](https://pepstepguide.com), [support@pepstepguide.com](mailto:support@pepstepguide.com), not-medical-advice disclaimer

All diary, goal, workout, and plan data stays in the browser via `localStorage`.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Production preview:

```bash
npm run build
npm run preview
```

Optional data check (food + exercise counts):

```bash
npm run check-data
```

## Deploy on Vercel

This is a Vite static app. Import the GitHub repo in Vercel (or run `npx vercel`).

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

No server and no environment variables. Client-side only.

## Stack

Vite + vanilla HTML/CSS/JS. Navy / light-blue PepStep palette. No orange or green accents.
