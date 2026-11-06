# Dietary questionnaire revision

All clinical and educational strings in this module are `pending_review`; none are represented as Pharm.D or faculty approved. The 2024 ICMR–NIN Dietary Guidelines for Indians reference remains metadata for the education library; this questionnaire is a product-design simplification, not a validated instrument.

## Versioning and question count

- Previous catalog: 34 distinct question definitions: 32 shared questions plus one not-diagnosed-only item and one diagnosed-only item. Each diagnosed or not-diagnosed path showed 33; unknown status showed 32. The previous definitions included two optional portion questions and additional optional context items.
- New not-diagnosed path: 12 questions (11 required shared questions and one optional shared question).
- New unknown-status path: 12 questions (11 required shared questions and one optional shared question).
- New diagnosed path: 13 questions (the same 12 shared questions plus one optional diagnosed-only follow-up).
- The 11 required questions are the initial core; the professional-plan prompt and diagnosed follow-up are optional.
- `DHA-Q-2.0.0` identifies new answers. Existing snapshots without `questionnaireVersion` are rendered with the archived v1 catalog and are not reinterpreted or migrated.
- `DHA-R-2.0.0` identifies the shortened-question recommendation mapping. Saved recommendation text remains in the snapshot; older rows without this field display as the legacy rules version.

## Current question purpose and recommendation traceability

| Current question | Purpose / answer-linked education |
| --- | --- |
| Meal regularity and missed meals | Understand irregular timing; `meal-pattern-review` |
| Breakfast routine | Reflect on reported breakfast variation; `breakfast-routine` |
| Vegetables and leafy greens | Explore produce variety; `vegetables-infrequent` |
| Pulses and legumes | Explore a familiar food group; `pulses-infrequent` |
| Whole fruit | Distinguish whole fruit from drinks; `fruit-infrequent` |
| Cereals and grains | Include rice, millets and whole-grain variety; `wholegrain-variety` |
| Added sugar in foods | Group overlapping solid sweet-food prompts; `added-sugar-foods` |
| Sweetened beverages | Keep drinks distinct from solid foods; `sweet-drinks-often` |
| Fried and packaged/ready-to-eat foods | Consolidate overlapping frequency prompts; `fried-foods`, `packaged-foods` |
| Salt habit | Combine table salt and salty packaged-food awareness; `salt-awareness` |
| Plain-water habit | Preserve a simple self-described hydration prompt; `water-awareness` |
| Existing professional eating plan (optional) | Display a reminder that general education does not replace the plan; `professional-plan-reminder` |
| Difficulty following a professional plan (optional, diagnosed only) | Offer an optional professional-care discussion route; `discuss-food-guidance` |

## Review of all previous v1 question IDs

| Previous question ID | Classification | Reason |
| --- | --- | --- |
| `main_meals` | COMBINE | Rolled into meal regularity to avoid separately measuring meal count. |
| `breakfast_usual` | KEEP / simplify | Retained as the distinct breakfast routine prompt. |
| `lunch_usual` | COMBINE | General lunch timing is captured in meal regularity; no separate recommendation depended on it. |
| `dinner_usual` | COMBINE | General dinner timing is captured in meal regularity; no separate recommendation depended on it. |
| `snacks` | REMOVE | No distinct recommendation used this answer; snack needs vary and this question added fatigue. |
| `skip_meals` | COMBINE | Paired with meal regularity so the question captures timing and missed planned meals together. |
| `rice_cereals` | COMBINE | Paired with millets/whole-grains in the cereal-choice question. |
| `millets_wholegrains` | COMBINE | Paired with cereals while retaining the whole-grain education trigger. |
| `pulses` | KEEP / simplify | Retained as one direct pulses/legumes frequency question. |
| `leafy_vegetables` | COMBINE | Consolidated with other vegetables to avoid overlapping produce prompts. |
| `other_vegetables` | COMBINE | Consolidated with leafy greens into one vegetable question. |
| `whole_fruit` | KEEP / simplify | Retained as a separate whole-fruit question because juice and whole fruit are distinct topics. |
| `milk_curd_alternative` | REMOVE | No distinct answer-based education used this answer in the previous engine. |
| `protein_foods` | REMOVE | No distinct answer-based education used this answer in the previous engine; general food-variety education remains available. |
| `nuts_seeds` | REMOVE | No distinct answer-based education used this answer in the previous engine; retaining it would not alter interpretation. |
| `sweet_tea_coffee` | COMBINE | Grouped with sweets, chocolates and packaged sweet snacks as added-sugar foods. |
| `sweet_drinks` | KEEP / simplify | Retained separately because sweetened drinks differ from solid foods and have their own education. |
| `sweets_desserts` | COMBINE | Grouped with other added-sugar foods. |
| `chocolates` | COMBINE | Grouped with other added-sugar foods. |
| `biscuits_packaged` | COMBINE | Grouped with other added-sugar foods; savoury packaged items are asked with fried/ready-to-eat foods. |
| `sweet_drink_portion` | REMOVE | Optional serving-size estimate had no supported rule and made the questionnaire longer. |
| `sweets_portion` | REMOVE | Optional portion estimate had no supported rule and made the questionnaire longer. |
| `fried_food` | COMBINE | Grouped with packaged/ready-to-eat frequency to reduce overlapping habit prompts. |
| `packaged_savoury` | COMBINE | Grouped with fried/ready-to-eat foods. |
| `salt_table` | COMBINE | Expanded to also ask about very salty packaged foods; one salt-awareness rule remains. |
| `eat_out` | REMOVE | No distinct answer-based rule used it; outside food choices remain covered in general education. |
| `water_habit` | KEEP / simplify | Retained because water habit was a distinct answer-based educational topic. |
| `meal_timing` | COMBINE | Merged with meal skipping and regularity. |
| `cooking_oil_estimate` | REMOVE | Optional household estimate had no distinct recommendation trigger. |
| `cooking_methods` | COMBINE | Consolidated with fried-food frequency to avoid measuring the same cooking pattern twice. |
| `diet_pattern` | REMOVE | Did not change existing education and was not needed to complete the shared assessment. |
| `medical_food_guidance` | KEEP / optional | Retained for all status paths to preserve existing professional meal-plan awareness. |
| `prevention_interest` | REMOVE | Preference did not describe a dietary habit and opened article topics already available in the education library. |
| `difficulty_food_guidance` | CONDITIONAL / optional | Reintroduced as a shorter, diagnosed-only follow-up with a clear care-team discussion purpose. |

## Diabetes measurement input checks

Values are optional and stored in the separate `diabetes-metrics` store, linked to the same session. Broad format bounds (HbA1c 0.1–30%, glucose 1–2000 mg/dL, elapsed post-meal time 0.25–24 hours, duration 0–100 years) only prevent malformed entries; they are not thresholds, classifications, or clinical interpretations. A value requires its own measurement date, and future/invalid dates are rejected. Measurement dates, units and values are preserved verbatim as entered (numeric values normalized as numbers). No measurements yields no metrics snapshot.

Clinical wording, the input bounds, translations, question content and recommendation rules require Pharm.D/faculty review before any approval claim.
