# Dietary habits and nutrition assessment

This module is independent of IDRS and BMI. It does not calculate a dietary risk score, diabetes probability, diagnosis, nutrient intake, or a treatment plan.

## Files

- `model.ts` defines question, answer, article, recommendation and saved snapshot types.
- `content.ts` contains bilingual questions, articles, recommendation wording, content version and source metadata.
- `engine.ts` validates answer completeness and selects answer-linked educational topics deterministically.
- `storage.ts` stores completed, consented records in the separate `dietary-assessments` IndexedDB store.
- `DietaryModule.tsx` implements the guided questionnaire, results, article library, local history and print view.
- `engine.test.ts` covers content completeness, validation, interpretation and historical snapshots.

## Rules

Required questions use the answer options in `DIETARY_QUESTIONS`; optional context and portion-estimate questions may be skipped. “Never” and “Not applicable” are distinct stored responses. No answer is converted to a numeric score.

Answer-triggered suggestions use simple frequency rules (daily or several times per week for “often”; rarely or never for “infrequent”). The engine adds general education only to fill the initial three topics when fewer than three answer-linked topics apply. Suggestions follow questionnaire topic order for navigation clarity; display order is not a measure of danger. Users can view all matched topics.

## Content governance and reference

All content is `pending_review`, version `DHA-1.0.0`, and requires review by the Pharm.D project owner and faculty before public release. The main source is ICMR–National Institute of Nutrition, *Dietary Guidelines for Indians 2024*: [official publication](https://www.nin.res.in/dietaryguidelines/pdfjs/locale/DGI24thJune2024fin.pdf). Wording in the app is original and simplified. Recommendations remain general and direct people to a qualified professional when a specific eating plan or health concern applies.

## Local records and updates

The existing `glucoguide-local` database is upgraded non-destructively from version 2 to 3 by adding a separate `dietary-assessments` store; the `screenings` store and its key path are unchanged. Records are only created when the user chooses “Save this assessment locally”. Each snapshot stores its answers, selected bilingual recommendation content, language, source reference, content version and review status. Content is bundled with the Vite app, so article navigation does not need an API.

The optional report uses the browser print dialog and includes a local Noto Telugu font asset. Verify PDF rendering in the target browser before sharing generated reports.
