# Gifted Brainz Tutorial — v10.5.7 Final QA unified CBT package

## Deployment (GitHub → Netlify)

Repository layout: static site in `public/`, backend in `netlify/functions/`.

Netlify settings — Base directory `.`, **Build command `node scripts/verify-netlify.mjs`**, **Publish directory `public`**, Functions directory `netlify/functions`, Node 20. `netlify.toml` already declares all of these.

This version uses the Netlify serverless API and Netlify Blobs as the central source of truth. **Do not deploy this package with Netlify Drop.** A drag-and-drop deployment does not publish the serverless function, and `/api/*` then falls through to the HTML page — which is what produces "the server returned a web page instead of data" on login.

Use a Git-connected Netlify site or Netlify CLI so `netlify/functions/api.js` is deployed.

After deploying, check `/api/ping` (dependency-free deploy probe), then `/api/health`, then `/diagnostics.html`. Full step-by-step instructions are in `GITHUB_DEPLOYMENT_FIRST.txt`.


## Required central storage

The API deliberately refuses to fall back to per-instance/local storage in Netlify production. This prevents the exact problem where a request appears on one device but not another.

The site must have working Netlify Blobs access. The function uses the site-wide store named `gifted-brainz`.

## Included CBT content

The question set is original UTME-style practice content; it is not an official JAMB/UTME paper.

- 5 subjects
- 5 CBTs per subject
- 40 questions per CBT
- Mathematics: 50 minutes
- English, Physics, Chemistry, Biology: 40 minutes
- 200 question-bank items per subject
- 1,000 question-bank items total
- Physics/Chemistry/Biology: 8 Roman-numeral I–IV questions per CBT (20%)
- English/Mathematics: no Roman-numeral requirement
- Admin editing of bank questions and individual CBT questions
- Duplicate-question protection and server-side Roman I–IV validation
- English passage questions carry a Passage Group ID and shared passage text
- Cross-instance save verification retries a write if another admin wins a simultaneous write race

## Uploads

File uploads now show a visible percentage progress indicator globally, including material attachments, question images, imported question documents and update packages.

## Learning materials

Save/publish actions now show explicit progress and success/failure states. Published state is stored centrally.

## Zero-state performance

Students with no CBT attempts are represented as `0%`, not `undefined`.
