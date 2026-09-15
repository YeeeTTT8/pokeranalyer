# Turning on cross-device sync (Supabase) — step by step

The app works with **no setup** (data stays in one browser via localStorage).
To sync across devices you create a free Supabase project and give the app two
public values. This takes ~10 minutes and no coding.

> You need: the two values `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
> The **anon key is public by design** (safe to put in the site). The
> **`service_role` key is secret — never use or paste it anywhere.**

---

## 1. Create the project
1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub or email.
2. **New project**. Pick any name, set a database password (save it somewhere),
   choose the region closest to you, plan **Free**. Wait ~2 min for it to spin up.

## 2. Copy your two keys
1. In the project, open **Project Settings** (gear, bottom-left) → **API**.
2. Copy **Project URL** → this is `VITE_SUPABASE_URL`
   (looks like `https://abcdefgh.supabase.co`).
3. Under **Project API keys**, copy the **`anon` `public`** key →
   this is `VITE_SUPABASE_ANON_KEY`. (Do **not** copy `service_role`.)

## 3. Create the tables
1. Left sidebar → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this repo, copy its entire contents, paste in.
3. Click **Run**. You should see "Success". (It's safe to re-run.)

## 4. Turn on email magic-link login
1. Left sidebar → **Authentication** → **Providers** → **Email**.
2. Make sure **Email** is enabled. Turn **Confirm email** ON (default is fine).
   You can leave "Secure email change" as-is. Magic links work out of the box on
   the free tier's built-in email (rate-limited but fine for personal use).
3. Left sidebar → **Authentication** → **URL Configuration**:
   - **Site URL**: your app's URL. For GitHub Pages that's
     `https://<your-github-username>.github.io/pokeranalyer/`.
   - **Redirect URLs**: add the same URL. For local testing also add
     `http://localhost:5173`.
   Save.

## 5. Give the keys to your deployment
### GitHub Pages (the workflow in this repo)
1. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
2. Add `VITE_SUPABASE_URL` = your Project URL.
3. Add `VITE_SUPABASE_ANON_KEY` = your anon public key.
4. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
5. Merge the PR to `main` (or push to `main`). The workflow builds with the keys
   and deploys. Open the Pages URL — you should see a sign-in screen.

### Local development
1. Copy `.env.example` to `.env` and fill in the two values.
2. `npm install && npm run dev`, open the printed URL.

## 6. First sign-in + bringing your existing data over
1. Open the app, enter your email, click **Email me a sign-in link**, then open
   the link **on that same device**.
2. On first sign-in the app **auto-imports** any sessions/hands stored in *that
   browser's* localStorage into your account (you'll see a banner).
3. **If your old data lives somewhere else** (e.g. you used it at a different URL
   like the preview link — localStorage is per-site, so it can't be read across
   sites): open the old app, go to **Reports → Export JSON backup**, then in the
   synced app go to **Reports → Import JSON** and pick that file. Import skips
   anything already present, so it's safe to run.

That's it — from then on every device you sign into shows the same data, updated
live.

---

## Notes & limits
- **Privacy:** Row Level Security ties every row to your user id, so even though
  the anon key is public, one signed-in user can only read/write their own data.
- **Realtime:** step 3's SQL adds the tables to the realtime publication, so edits
  on one device appear on your others within a second or two.
- **Free tier:** more than enough for a home game. Projects pause after ~1 week of
  zero activity on the free plan; opening the Supabase dashboard resumes them.
- **The Artifact preview cannot sync** — sandboxed artifact pages block network
  calls to Supabase, so that link stays localStorage-only. Use your GitHub Pages
  (or other host) build for sync.
