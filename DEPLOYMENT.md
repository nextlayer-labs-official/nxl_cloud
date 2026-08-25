# Deploying Nextlayer Cloud (staging/VPS)

This covers getting the app running on a fresh Ubuntu VPS with MySQL and pm2
already installed. It's written from an actual deployment run, including the
mistakes — the Troubleshooting section at the bottom covers every error you're
likely to hit.

## 1. Prerequisites

Node 20+:
```bash
node -v   # if missing or too old:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

MySQL and pm2 should already be installed. If not:
```bash
sudo apt-get install -y mysql-server
sudo npm install -g pm2
```

## 2. Clone & install

```bash
git clone <repo-url> ~/nxlcloud
cd ~/nxlcloud
npm install   # installs everything + auto-runs prisma generate/build (postinstall)
```

## 3. MySQL database

**Use an alphanumeric-only password.** Special characters (`@ # % / : ? &`)
break the connection string later unless URL-encoded — just avoid the problem
entirely.

```bash
sudo mysql -e "CREATE DATABASE nextlayer_cloud_dev; CREATE USER 'nxl'@'localhost' IDENTIFIED BY 'SimplePass123'; GRANT ALL PRIVILEGES ON nextlayer_cloud_dev.* TO 'nxl'@'localhost'; FLUSH PRIVILEGES;"
```

## 4. Root `.env`

This is the **single source of truth** for the backend — `apps/api` reads it
automatically via `@nextlayer/database` (no separate `apps/api/.env` needed).

```bash
cp .env.example .env
nano .env
```

Set:
- `DATABASE_URL="mysql://nxl:SimplePass123@127.0.0.1:3306/nextlayer_cloud_dev"`
- `WEB_ORIGIN="http://<vps-ip-or-domain>:<web-port>"` — must be the exact
  address browsers will load the site from, port included. This also
  controls CORS on the API, so it must match exactly.

Wasabi / Razorpay / SMTP are optional for staging — the app boots and
degrades gracefully without them:
- No Wasabi → file metadata works, but upload/download URLs won't resolve.
- No Razorpay → `GET /billing/plans` works, checkout returns a clean 503.
- No SMTP → registration/reset/invite emails are skipped and logged instead
  of sent, so those flows won't be end-to-end testable for real users. Use
  test-mode Razorpay keys for staging (not live), and a real SMTP provider
  (or Mailtrap) if you want colleagues to actually receive emails.

## 5. Web app's own env — the #1 source of confusing errors

Next.js does **not** read the root `.env`. It only reads env files from its
own folder, and **bakes `NEXT_PUBLIC_*` values into the browser bundle at
build time.**

```bash
echo 'NEXT_PUBLIC_API_URL="http://<vps-ip-or-domain>:3001"' > apps/web/.env.local
```

**This must be the address your colleagues' browsers can reach — never
`localhost`.** `localhost` in this file means "the visitor's own laptop,"
not your server, since it runs client-side. Getting this wrong is exactly
what causes "Couldn't reach the server" on login from any other machine.

**Any time you change this file, you must rebuild** (`npm run build:web`) —
restarting alone won't pick it up, since it's compiled into the bundle, not
read at runtime.

## 6. Migrate + seed

```bash
npm run migrate:deploy --workspace=@nextlayer/database
npm run db:seed
```

Confirm it prints a final `Seeded: { ... }` line — if it looks interrupted
or errors, re-run it before continuing.

This creates 3 billing plans, a demo org ("Acme Labs"), and **one login you
can actually use**:

- **Admin panel** (`/admin/login`): `admin@nextlayer.cloud` / `Admin12345`
  (or whatever `ADMIN_SEED_PASSWORD` was set to in `.env` before seeding).

The 3 demo *customer* users (Alex Chen, Jordan Lee, Sam Rivera) are seeded
**without a password** — they exist only to populate demo org data, and
can't log in. To test the actual customer portal, sign up a fresh account
at `/register` — that's the real path your colleagues will use too.

## 7. Build both apps

```bash
npm run build:api
npm run build:web
```

Both must complete without errors and produce `apps/api/dist/main.js` and
`apps/web/.next/`. If pm2 says "Script not found" or "Could not find a
production build," one of these didn't run or didn't finish — see
Troubleshooting.

## 8. Run with pm2

Use `ecosystem.config.js` at the repo root (already set up with your ports):

```js
module.exports = {
  apps: [
    { name: "nxl-api", script: "apps/api/dist/main.js", env: { PORT: 3001 } },
    { name: "nxl-web", script: "npm", args: "start --prefix apps/web", env: { PORT: 4001 } },
  ],
};
```

```bash
pm2 delete all   # clears out any partial/failed runs from earlier attempts
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the printed command to enable on boot
```

`pm2 delete all` before starting fresh matters more than it looks — if an
earlier `pm2 start` attempt half-succeeded (e.g. `nxl-web` came up before
`nxl-api` errored), just re-running `pm2 start ecosystem.config.js` can
leave stale/duplicate process entries around instead of replacing them.

## 9. Firewall

```bash
sudo ufw allow 3001
sudo ufw allow 4001
sudo ufw status
```

If `ufw` shows "inactive," check that port 22 (SSH) is allowed before
enabling it, or you'll lock yourself out.

## 10. Verify

```bash
curl http://localhost:3001/health
curl -I http://localhost:4001
pm2 status
pm2 logs
```

From another machine, open `http://<vps-ip>:4001` in a browser and try
`/register`, then `/admin/login` with the seeded admin credentials.

---

## Troubleshooting

**`migrate deploy` fails partway through with error P3018**
A migration failed mid-way, and Prisma now refuses to apply any further
migrations until that's resolved — you can't just re-run it and continue.
On a fresh/empty staging database with nothing to lose, the simplest fix is
to wipe it and start clean rather than trying to hand-repair migration
state:
```bash
sudo mysql -e "DROP DATABASE nextlayer_cloud_dev; CREATE DATABASE nextlayer_cloud_dev; GRANT ALL PRIVILEGES ON nextlayer_cloud_dev.* TO 'nxl'@'localhost'; FLUSH PRIVILEGES;"
git pull   # picks up any migration fixes
npm run migrate:deploy --workspace=@nextlayer/database
```
If it fails on a *different* migration than last time, that's a distinct
bug in that migration file, not the same issue recurring — check the exact
error and table/column it names.

**`Error: Script not found: .../apps/api/dist/main.js`**
`npm run build:api` was never run (or failed). Run it, check it completes
cleanly, then `pm2 restart nxl-api`.

**`Could not find a production build in the '.next' directory`**
Same thing for the web app — run `npm run build:web`, then
`pm2 restart nxl-web`.

**Login says "Couldn't reach the server. Please try again."**
`NEXT_PUBLIC_API_URL` in `apps/web/.env.local` is pointing at `localhost`
(or the wrong address) — see step 5. Fix it, then **rebuild**
(`npm run build:web`) and `pm2 restart nxl-web`. A restart alone will not
pick up the change.

**`error parsing connection string, format must be 'mariadb://...'`**
`DATABASE_URL` in the root `.env` has an unescaped special character in the
password (`@ # % / : ? &`), which breaks `user:password@host` parsing.
Either URL-encode the character (`@` → `%40`, `#` → `%23`, etc.) or just
change the MySQL password to something alphanumeric-only:
```bash
sudo mysql -e "ALTER USER 'nxl'@'localhost' IDENTIFIED BY 'SimplePass123'; FLUSH PRIVILEGES;"
```
Then update `.env` and `pm2 restart nxl-api` (env changes need a restart,
not a rebuild, for the API).

**Any `.env` change to the API doesn't seem to apply**
`pm2 restart nxl-api` — env vars are read at process start, not live-reloaded.

**Any `NEXT_PUBLIC_*` change to the web app doesn't seem to apply**
You need `npm run build:web` **then** `pm2 restart nxl-web` — a restart
alone reuses the old compiled bundle.
