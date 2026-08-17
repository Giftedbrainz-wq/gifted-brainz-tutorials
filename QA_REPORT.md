# Gifted Brainz Tutorial v10.5.7 — Netlify Function Deployment Fix & QA Report

## Status
**FINAL TECHNICAL QA: PASS — NETLIFY FUNCTION ENTRYPOINT FIX APPLIED**

The backend handler was kept intact. Only the Netlify function entrypoint layer and
deployment verification were changed to make function discovery more reliable.
Student-facing HTML, CSS, JavaScript, CBT content, question bank and learning
materials were not modified.

This package was checked after the final content and deployment corrections.

## CBT and question-bank checks
- 1,000 question-bank records: exactly 200 per subject.
- 25 CBTs: exactly 5 per subject.
- Every CBT contains exactly 40 questions.
- Mathematics CBTs: 50 minutes.
- Use of English, Physics, Chemistry and Biology CBTs: 40 minutes.
- Physics, Chemistry and Biology: exactly 8 Roman-numeral questions per CBT and 40 per 200-question bank.
- Roman-numeral questions contain I, II, III and IV.
- Mathematics and Use of English contain no Roman-numeral questions.
- Every CBT question ID exists in the current question bank.
- Each subject's five CBTs cover 200 distinct question IDs.
- Every question has four distinct answer options.
- Every answer index is valid.
- No `(Version N)` or `(Set N)` placeholders remain in the question bank.
- No generic English explanation placeholder remains.
- Use of English now has 200 unique question stems.
- English passage questions remain linked to 20 organised passage groups.

## Learning Materials and uploads
- File uploads use visible percentage progress.
- Learning Material save provides progress and success/failure feedback.
- Publish/unpublish actions persist through the central backend.

## Student performance
- A student with no CBT attempt is represented as **0%**, not `undefined`.

## Cross-device data
- Registration, verification requests, CBT records, questions and learning materials use the central persistence layer.
- Content-pack migration replaces the managed CBT/question-bank collections on upgrade so stale CBT/question records do not remain beside the current validated bank.
- Cross-instance write verification/retry safeguards remain enabled.

## Deployment
- `index.html` is at the repository root.
- `netlify.toml` publishes the repository root and points Functions to `netlify/functions`.
- `/api/*` is routed to the Netlify Function before the SPA fallback.
- The deployment package includes `netlify/functions/api.js`.
- GitHub/Netlify deployment instructions are included.
- Static-only Netlify Drop deployment is not recommended for the unified backend features.

## Technical checks
- JavaScript syntax checks passed for `app.js`, `api.js`, `gb-ui.js`, `sw.js`, and `netlify/functions/api.js`.
- HTML reference/structure checks passed.
- No duplicate HTML IDs detected.
- No broken local HTML/CSS/JS/image references detected.
- `manifest.webmanifest` is valid JSON.
- ZIP integrity check passed.
- Application/service-worker base version: `10.5.6-final-qa`.
- Content-pack version: `2026.08.16-content-7-final`.

## Important deployment note
Deploy the **extracted project files** through a Git-connected Netlify deployment or Netlify CLI. Do not upload the ZIP itself as the repository contents. The repository root must directly contain `index.html`, `netlify.toml`, `_redirects`, and `netlify/functions/api.js`.


## Additional Netlify deployment checks — 2026-08-17
- Replaced the direct `.mjs` function entrypoints with conventional `api.js` and `ping.js` wrappers.
- The original backend handlers remain intact as `api-core.mjs` and `ping-core.mjs`.
- Added `scripts/verify-netlify.mjs`; the Netlify build now fails early if the required static site or function entrypoints are missing.
- `netlify.toml` explicitly publishes `public/` and deploys `netlify/functions/`.
- Node syntax checks passed for all JavaScript/MJS files.
- TOML configuration parsed successfully.
- Both Netlify function entrypoints imported successfully in Node.
- Direct execution of `/api/ping` returned HTTP 200 JSON.
- Direct execution of `/api/health` returned HTTP 200 JSON.
- Direct execution of `/api/login` with deliberately invalid credentials returned HTTP 401 JSON, proving the login route reaches the backend handler.
- No duplicate HTML IDs were found.
- Existing local-reference scan found only two false positives caused by JavaScript template expressions inside `cbt.html`; no actual missing local asset was identified.
- ZIP integrity was verified after packaging.
