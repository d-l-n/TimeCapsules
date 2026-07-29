@echo off
set PATH=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot\bin;%PATH%
npx -y firebase-tools@latest emulators:exec --project timecapsule-theproject --only auth,firestore "set VITE_USE_EMULATOR=true && npx tsx scripts/seed-e2e-emulator.ts && npm run dev"
