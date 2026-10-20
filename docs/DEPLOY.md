# Deploying sooalim.com on GitHub Pages

The site is a static Vite build hosted free on GitHub Pages. `.github/workflows/deploy.yml` lints,
tests, builds and deploys on every push to `main`. The build reads its base path from GitHub, so it
works both at `https://iq84.github.io/Claude/` and, once the custom domain is set, at
`https://sooalim.com/`. After that, GitHub redirects the `github.io` address to `sooalim.com`.

Unknown paths (e.g. `/lab/some-model`) are served by `404.html`, a copy of `index.html`, so deep links
load the app.

## 1. Turn on GitHub Pages (one time)

1. On GitHub, open **iq84/Claude → Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Open the **Actions** tab, select **Deploy to GitHub Pages**, and **Re-run** the latest run (or
   push any commit). The first run before this setting fails at "configure-pages"; that's expected.
4. When it's green, the site is live at `https://iq84.github.io/Claude/`.

## 2. Verify the domain with GitHub (recommended, one time)

This stops anyone else from pointing a GitHub Pages site at your domain.

1. GitHub → your profile picture → **Settings → Pages → Add a domain**, enter `sooalim.com`.
2. GitHub shows a **TXT** record (host like `_github-pages-challenge-iq84`). Add it in GoDaddy
   (step 4) and click **Verify** once DNS has updated.

## 3. Add the custom domain to the repo

Do this **before** changing DNS (GitHub's recommendation).

1. **iq84/Claude → Settings → Pages → Custom domain**: enter `sooalim.com` and **Save**.
2. Leave the page open; the DNS check goes green after step 4 propagates.

## 4. Point GoDaddy DNS at GitHub

GoDaddy → **My Products → Domains → sooalim.com → DNS**:

| Type  | Name          | Value                            |
| ----- | ------------- | -------------------------------- |
| A     | @             | 185.199.108.153                  |
| A     | @             | 185.199.109.153                  |
| A     | @             | 185.199.110.153                  |
| A     | @             | 185.199.111.153                  |
| CNAME | www           | iq84.github.io                   |
| TXT   | (from step 2) | (verification value from GitHub) |

Optional IPv6 (AAAA, name `@`): `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`,
`2606:50c0:8003::153`.

Also:

- **Delete** any other `@` A records (GoDaddy's default "Parked" record) and any existing `www` record
  that conflicts with the CNAME above.
- **Turn off GoDaddy Forwarding** for the domain if it's on. Forwarding overrides these records and
  can't serve HTTPS for GitHub Pages.
- Leave email records (MX, SPF/DKIM TXT) alone.

DNS usually updates within an hour; it can take up to 24 hours.

## 5. Turn on HTTPS

Back in **Settings → Pages**, once the DNS check passes, tick **Enforce HTTPS**. GitHub issues the
certificate automatically (this can take a few minutes after DNS is correct; the box is greyed out
until then).

## Result

- `https://sooalim.com` serves the site.
- `https://www.sooalim.com` redirects to `https://sooalim.com`.
- `https://iq84.github.io/Claude/` redirects to `https://sooalim.com`.

## Checking DNS

```bash
dig sooalim.com +noall +answer        # should list the four 185.199.x.153 addresses
dig www.sooalim.com +noall +answer    # should show a CNAME to iq84.github.io
```

On Windows: `Resolve-DnsName sooalim.com`.
