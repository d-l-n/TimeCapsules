# Time Capsules

Personal TV show & movie tracking history dashboard. Built from an imported viewing history, enriches it with TMDB metadata and IMDb ratings.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + PWA
- **Database:** Firebase Firestore (free tier)
- **Hosting:** Cloudflare Pages (free tier)

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with your Firebase config values (from Firebase Console > Project Settings > General > Your apps > Web app).

For data import, you also need a Firebase **service account** (Project Settings > Service Accounts > Generate key) and save it as `service-account.json` in the project root.

## Data Pipeline (run locally)

```bash
npm run import:csv       # Import all CSVs to Firestore
npm run enrich:tmdb      # Enrich with TMDB (needs API key)
npm run merge:imdb       # Merge IMDb ratings
npm run qa:validate      # Check data integrity
```

## Development

```bash
npm run dev
```

## Deploy to Cloudflare Pages

```bash
npm run pages:deploy
```

Or connect your Git repo to Cloudflare Pages directly (build command: `npm run build`, output dir: `dist`).

## QR Login (pairing)

Login via QR (WhatsApp-Web style): show a QR on a PC/tablet, scan it with a phone
that already has a session, confirm, and the PC signs in. 100% free tier
(Cloudflare Pages Functions + KV + Firebase Auth custom tokens).

### How it works

1. `/qr` creates a pairing id, stores it in KV (3 min TTL) and renders a QR pointing to `/pair?code=<id>`.
2. The phone scans the QR, opens `/pair`, and confirms with its Firebase session.
3. `POST /api/pair/<id>/confirm` validates the phone's ID token (Google Identity Toolkit) and issues a Firebase **custom token** signed with your service account.
4. The PC polls `GET /api/pair/<id>`, receives the custom token and signs in with `signInWithCustomToken`.

### One-time setup

1. **Create the KV namespace** (replace the id in `wrangler.toml`):

   ```bash
   npx wrangler kv namespace create PAIRINGS
   ```

2. **Service account**: Firebase Console → Project Settings → Service accounts → *Generate new private key*. The JSON contains `client_email`, `private_key` and the API key (Project Settings → General → Web apps → `apiKey`).

3. **Set the secrets** (never commit them):

   ```bash
   npx wrangler pages secret put FIREBASE_CLIENT_EMAIL
   npx wrangler pages secret put FIREBASE_PRIVATE_KEY
   npx wrangler pages secret put FIREBASE_API_KEY
   ```

   For `FIREBASE_PRIVATE_KEY`, paste the whole `private_key` value (including `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` lines).

4. **Deploy**: `npm run pages:deploy` (or `npx wrangler pages deploy dist`).

### Local development

```bash
# terminal 1 — the API (Pages Functions) with local secrets from .dev.vars
npm run dev:api

# terminal 2 — the Vite app (proxies /api to 8788)
npm run dev
```

Create `.dev.vars` at the project root with the same three `FIREBASE_*` variables.

## Firebase Security Rules

For a personal app:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
