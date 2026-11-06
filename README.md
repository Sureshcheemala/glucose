# GlucoGuide prototype

Offline-first, bilingual diabetes risk screening education for faculty demonstration. This application is a screening and education aid, not a diagnostic or glucose-monitoring device.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). First visit/cache population needs an internet connection for the initial page load. The app shell and production assets are cached by the service worker; core IDRS/BMI/recommendation logic is local.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

## Pharm.D review build

Run `npm run build` and publish the contents of `dist/` to a static hosting provider with HTTPS enabled. Publish at the site root so the service worker at `/sw.js` can control the application and cache its local assets. Do not upload `node_modules`, source files, `.env` files, or local browser history. The build contains the English and Telugu education catalog in its bundled assets. The Health Education library and Settings identify the medical education and Telugu translations as pending Pharm.D/faculty review; GlucoGuide is not a substitute for professional medical advice. Screening history is stored locally in the browser and is not part of the build output.

To create a ZIP containing only the production output, run this PowerShell command from the project root after building:

```powershell
Compress-Archive -Path .\dist\* -DestinationPath .\GlucoGuide-review.zip -Force
```

The archive contains the files and asset folders inside `dist/` at its root. It does not include source files or `node_modules`.

## Structure

- `src/idrs/scoring.ts` — IDRS types, scoring rules, risk category cutoffs and source metadata.
- `src/idrs/validation.ts` — per-question validation and documented collection bounds (age 18–120 years; waist 40–200 cm; age step 1 year, waist step 0.1 cm).
- `src/recommendations/engine.ts` — answer-triggered recommendation selection, three-card initial guide, result factor explanations, and screening snapshots.
- `src/content/model.ts` — typed article, recommendation, source, review-status and historical snapshot models.
- `src/content/articles.ts` — local bilingual article library, categories, route aliases and source metadata.
- `src/content/recommendations.ts` — deterministic recommendation text, answer triggers and risk-category guidance.
- `src/localization/education.ts` — compatibility exports for the centralized offline article catalog.
- `src/bmi.ts` — independent adult BMI calculation and classification.
- `src/history/db.ts` — local IndexedDB history, comparison logic and versioned recommendation snapshots. Database version 2 keeps existing records/store intact; legacy rows remain readable.
- `src/localization/words.ts` — English and Telugu UI dictionary.
- `src/localization/date.ts` — Indian-locale date formatting.
- `src/App.tsx` — routed screens and interactions.
- `src/style.css` — responsive visual system and component styling.
- `public/sw.js` — offline cache strategy; Vite injects production asset paths at build time.
- `public/manifest.webmanifest` — install metadata.
- `public/fonts/NotoSansTelugu-Regular.ttf` — embedded Telugu report font (OFL).

## IDRS reference

Score configuration follows Mohan V, Deepa R, Deepa M, Somannavar S, Datta M. “A simplified Indian Diabetes Risk Score for screening for undiagnosed diabetic subjects.” *J Assoc Physicians India*. 2005;53:759–763. [PubMed record](https://pubmed.ncbi.nlm.nih.gov/16334618/). Four physical-activity bands and wording are cross-checked against the [Madras Diabetes Research Foundation IDRS reference](https://new.mdrf.in/department/Diabetology.html). Prototype rules are centralized in `src/idrs/scoring.ts` for faculty review.

BMI uses adult WHO categories: underweight `<18.5`, healthy range `18.5–24.9`, overweight `25–29.9`, and obesity `≥30 kg/m²`. BMI is not part of IDRS.

The education library contains six everyday categories and ten diabetes learning topics. Articles are local bilingual content with examples, misconceptions where relevant, key takeaways, references, versions and `pending_review` status. The answer-based health guide shows three recommendations initially and expands to all applicable recommendations on request. Recommendation snapshots store screening ID/date, language, score/category, recorded answers and factor scores, initial and selected IDs, actual recommendation text, overall guidance, source references, content version and review status. New rule/content versions do not rewrite saved recommendations. All new clinical education and Telugu medical translations require Pharm.D/faculty review; no new content is marked approved.

The report opens a localized, print-ready page and uses the browser's **Save as PDF** flow. It embeds the Noto Sans Telugu font so Telugu report text remains available offline after the app has been cached. This prototype relies on the browser print dialog instead of creating a PDF file directly.

Text size can be set to Standard, Large, or Extra Large in Settings and is saved locally. History comparisons show recorded answers and factor scores for both dates; they describe recorded score/input differences only and do not establish clinical change.

## Data and limitations

No backend, accounts, cloud database, or patient-data sync. Saved screenings remain in browser IndexedDB until the user deletes them. Telugu UI and report copy are prototype translations and require Pharm.D review before public or clinical use. The production service worker precaches generated static assets and presents an update-ready state; it retains IndexedDB history across app cache updates. First use needs a network connection to populate the cache. Offline close/reopen, installability, IndexedDB persistence across browser relaunch, update activation, and PDF saving in the browser print dialog still require device-level verification. The Vite development server is intended for connected development, not offline validation.

