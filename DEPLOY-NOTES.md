# Noctography, deployable file set

Everything in this folder is the published site, minus the light pollution atlas tiles.

## What is missing, and what happens without it

`atlas/2025/` holds 1,033 PNG tiles, and it is not in this archive. The app degrades rather than
breaking: it falls back to the coarse world grid baked into `noctography-engine.js`, so sky
brightness, limiting magnitude and Bortle class still work everywhere, just at lower resolution.
Copy `site/atlas/` back in before publishing.

## Where things go

```
/                       index.html, the landing page
/app/                   index.html, the app itself
/assets/                icons, palette logos, brand mark
/atlas/2025/            MISSING FROM THIS ARCHIVE, copy it back in
*.js                    the engine and its modules, loaded by /app/index.html
llms.txt                plain-text summary for AI tools, linked from both pages
robots.txt, sitemap.xml
.nojekyll               required, or GitHub Pages hides files beginning with an underscore
```

## Changed in this release

- **Log**, a ninth tab. Night-by-night record of what was shot, held in `localStorage` only.
  New file: `noctography-log.js`.
- **Conjunctions.** Planetary positions computed on the device from JPL/Standish Keplerian
  elements. New in `noctography-engine.js`: `planetPos`, `skyBodies`, `conjunctions`.
- **Aurora likelihood** is now marginalised over the forecast's own spread rather than read at its
  central estimate, and is expressed as a count of nights in ten. New: `chanceMarginal`,
  `tenNights`.
- **Satellite feeds** cache orbital elements on the device with a 12 second timeout, a three day
  staleness ceiling, and both feeds starting in parallel. Previously a throttled CelesTrak left
  both cards spinning for half a minute.
- **Looking ahead** moved above the light pollution map on Tonight.
- **`TIDE_RELAY` is now `null`.** The Worker has never answered with a live Admiralty key, so the
  constant no longer claims otherwise. Restore the address once the key is verified.
- **Attribution added** for Photon, OpenStreetMap, the Environment Agency and the UK Hydrographic
  Office, all of which carry attribution requirements and three of which were previously
  uncredited in the sources panel.

- **Landing page copy** revised throughout from your Word edits: 24 blocks, including the hero,
  the share description, the tools intro, five card bodies, three paragraphs of "Why I built it",
  the opening of "How it works", six FAQ answers and the footer. The Log card spans both columns
  and sets its prose in two, so nine cards leave no gap and the measure stays near 44 characters.

## Still outstanding

Written permission to redistribute the converted Lorenz atlas. The sources panel now states the
position plainly, which is honest but not a substitute for asking him.
