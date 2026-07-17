# 🏮 Obliteride Sky — Avi's Obliteride 2026

A tribute site for [Avi's Obliteride ride](https://secure.fredhutch.org/goto/avi2026)
benefiting Fred Hutch Cancer Center. Donors release a glowing lantern into a
night sky — **in honor of** someone (pink, pulsing like a heartbeat),
**in memory of** someone (amber, rising highest), or with a
**special message** (Obliteride orange). Tap any lantern to read its story.

## How it works

1. A visitor clicks **Donate & release a lantern** → the Fred Hutch donation
   page opens in a new tab → back on the site they confirm "I just donated"
   and the tribute form unlocks.
2. Anyone who already donated can unlock the form instantly with the code
   **`Supporter2026`** (set in `js/config.js`).
3. The tribute (name + show/hide toggle, type, message ≤ 280 chars) is saved
   **unapproved**. You approve it from `admin.html`, and it rises into the sky.

With no database configured the site runs in **demo mode** with sample
lanterns, so you can preview everything immediately.

## Setup (~10 minutes)

### 1. Create the free database

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
   ⚠️ First change the admin email in the last policy to the one you'll use.
3. In **Project Settings → API**, copy the **Project URL** and **anon public key**
   into `js/config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). The anon key is
   safe to publish — row-level security limits it to reading approved tributes
   and submitting unapproved ones.

### 2. Publish the site

On GitHub: **Settings → Pages → Deploy from branch** → pick your branch, root
folder. Your site appears at `https://<username>.github.io/Obliteride2026/`.
(Any static host works — Netlify, Cloudflare Pages, etc.)

### 3. Approve tributes

Visit `/admin.html`, enter your admin email, and click the magic link Supabase
emails you (no password). Approve or reject pending tributes; approved ones
appear on the sky within a page refresh.

## Files

| File | Purpose |
|---|---|
| `index.html` + `css/style.css` + `js/app.js` | The lantern sky experience |
| `js/config.js` | All settings: Supabase keys, donation URL, unlock code |
| `admin.html` | Your private approval queue (magic-link login) |
| `supabase/schema.sql` | Database table + security policies |

## Customizing

- **Unlock code / donation link / message length** — `js/config.js`.
- **Colors** — CSS variables at the top of `css/style.css`
  (`--amber`, `--blossom`, `--ember`, sky gradient).
- **Sample lanterns in demo mode** — `DEMO_TRIBUTES` in `js/app.js`.
