# Deploying sooalim.com on Vercel

The site is a static Vite build. `vercel.json` sets the build command, the `dist/` output folder and
the SPA fallback (unknown paths serve `index.html`, so links like `/lab/some-model` load directly).

## 1. Create the Vercel project (one time)

1. Sign in at vercel.com with GitHub.
2. **Add New → Project**, import the `iq84/Claude` repository, and keep the detected settings.
3. Deploy. Vercel gives you a `*.vercel.app` URL; check that the Home and About pages load.

Every push to `main` then deploys to production, and other branches get preview URLs.

## 2. Connect the GoDaddy domain

1. In Vercel: **Project → Settings → Domains**, add `sooalim.com` and `www.sooalim.com`. Choose to
   redirect one to the other (e.g. `www` → `sooalim.com`).
2. Vercel shows the DNS records each domain needs. **Use the values on that screen**; Vercel says
   they can differ per project. Typically they are:
   - `sooalim.com` (apex): an **A** record, host `@`, value `76.76.21.21`
   - `www.sooalim.com`: a **CNAME** record, host `www`, value shown by Vercel
3. In GoDaddy: **My Products → Domains → sooalim.com → DNS**.
   - Edit the existing `@` **A** record (GoDaddy usually has a "Parked" one) to Vercel's value, and
     delete any other `@` A records.
   - Edit the `www` **CNAME** to Vercel's value.
   - Leave email-related records (MX, TXT/SPF, DKIM) alone.
   - If GoDaddy domain **forwarding** is turned on, turn it off; it overrides these records.
4. Wait for DNS to propagate (minutes to a few hours). Vercel's Domains page turns green and issues
   the HTTPS certificate automatically.
