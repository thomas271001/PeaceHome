# Hosting guide

The app is one static file: `dist/index.html`. No server, no build step, no dependencies.
Any static host works. Vercel, Netlify and Cloudflare Pages all find the settings in this folder
(`vercel.json`, `netlify.toml`) or need only "output directory: dist" and no build command.

## Read this first: where the data lives
On any host other than the Claude artifact, screenings are saved in the browser of the phone that
filled them in (localStorage). Each phone has its own list, so the Care team view on your laptop will NOT
see screenings made on a resident's phone. That is fine for stakeholder walkthroughs. It is not enough for a pilot.

For a real pilot you need a small backend and logins. The app keeps all storage in four functions
(`persist`, `syncQueue`, `subscribe`, `saveCfg` in `src/app.template.html`), so the swap is contained.
The record shape is `{ schema, answers, createdAt, lang, assisted, contact, sample }`.

Health data about named residents is personal data under India's DPDP Act, 2023. Until consent wording, who can
see the data, and where it is stored are approved (decision pending with the Peace Home director), use example data only.

## Options
| Host | Best for | Why | Watch out for |
|---|---|---|---|
| Cloudflare Pages | Free public walkthrough link, most headroom | Static bandwidth is unlimited on the free plan. Commercial use is not barred. Easy path to Workers + D1 later if you want a backend on the same account | Free Functions/Workers share 100,000 requests per day |
| Netlify | Simplest drag-and-drop | Drop the `dist` folder on Netlify Drop, you get a link in a minute. Not limited to personal use | Free plan runs on a monthly credit pool; going over pauses the site until the next cycle |
| Vercel | If you already use it or plan Next.js later | Excellent previews and deploy flow. 100 GB transfer a month on Hobby, more than enough here | Hobby is for non-commercial personal use only. A programme run with a clinic or foundation may count as commercial, so check, or use Pro |
| GitHub Pages | Zero extra accounts, version history | Free, simple, code and site in one place | Free Pages needs a public repo on personal accounts. Public repo is fine for this code, but never commit patient data |
| Supabase (add on) | The real pilot backend | Postgres, login and row-level security in one service, so only signed-in staff can read records. Can run in an India region | Needs a code change to `persist`/`subscribe` and real access rules. Not a drop-in |

## Recommendation
1. Now, for stakeholders: Cloudflare Pages or Netlify, with example data only.
2. For the pilot: keep the front end where it is and add Supabase (or Firebase) for storage and staff login.
   Then the Care team view becomes a staff-only page and residents never see other people's records.

## Deploy in a few clicks
- Vercel: `npm i -g vercel`, then `vercel --prod` in this folder. Or import the repo; no build command needed.
- Netlify: drag the `dist` folder onto app.netlify.com/drop.
- Cloudflare Pages: create a project, connect the repo or upload `dist`, build command empty, output directory `dist`.
- GitHub Pages: push the repo, Settings > Pages > deploy from branch, folder `/dist` (or copy `dist/index.html` to `/docs`).

## Troubleshooting
- Netlify "Deploy directory 'dist' does not exist": the host is looking in the wrong folder. This zip puts
  `netlify.toml`, `build.py`, `src/` and `dist/` at the top level, so upload or connect it as is, not inside another folder.
  The config now also runs `python3 build.py`, which creates `dist/index.html` if it is missing.
- If you ever see a blank Publish directory setting, the quickest fix is to upload only `dist/index.html`
  (Netlify Drop or Cloudflare Pages direct upload) and leave build settings empty.

## Netlify, step by step
Pick one:
- **Git (recommended).** Put the contents of this zip at the root of a repo, connect it in Netlify. `netlify.toml` sets
  build command `python3 build.py` and publish directory `dist`. Nothing to type in the Netlify UI.
- **Drag and drop.** Unzip, then drop only the `dist` folder on app.netlify.com/drop. Do not drop the whole zip:
  Drop publishes the root as it is, and the page lives in `dist/`.

What works on Netlify and what does not:
- Works: the full resident flow, English and Malayalam, light and dark, the care team view (open it with `/#care`), CSV export
  (a normal browser download), and editing the scoring rules.
- Device only: everything is saved in that browser. A resident's phone and your laptop do not share screenings, and edited
  rules apply to that device only. That is the data limit described above, and the reason a pilot needs a backend.
- The `/#care` page has no login. On Netlify it only ever shows what is stored in the visitor's own browser, so it exposes
  nothing today. Once a backend is added, put staff login in front of it before any real data goes in.
- Fonts load from Google Fonts. If that is blocked, the app falls back to system fonts and still works.
