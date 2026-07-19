# Time Capsules

Personal TV show & movie tracking history dashboard. Migrates data from a TV Time GDPR export, enriches it with TMDB metadata and IMDb ratings.

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
