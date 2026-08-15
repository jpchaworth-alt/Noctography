# Noctography

Field tools for nightscape photography, by [Paul Haworth](https://www.paulhaworthnightscapes.com).
One page, no build step, no server, no API keys. It opens on a phone at the side of a field and
tells you whether tonight is worth it.

Eight screens, reached from a nav rail:

- **Tonight**: a greeting keyed to the actual conditions, the best window to be out, tiles for
  cloud, moon, darkness, Milky Way core, aurora, air and dew, wind and meteors, and a scrolling
  grid of fifteen nights ahead and five behind, each with a star rating.
- **Aurora**: live solar wind from L1, OVATION probability at the site and poleward, camera
  against naked-eye thresholds, arc geometry, light pollution across the poleward horizon,
  storm watches and 27-day recurrence.
- **Meteors**: sixty nights of shower rates against moon, cloud and sky darkness, with an
  hour-by-hour chart and a breakdown for every active shower.
- **Trails**: three star trail patterns with the aim derived from latitude, a session planner
  checked against the dark window, moonset, cloud and dew, a moon-in-frame test, and timelapse
  planning from the same run of frames.
- **Sky**: sixteen subjects ranked for the night on nightscape framing rather than altitude,
  a night scrubber that moves the whole list through time, and a framing view drawing real star
  positions, the Milky Way from galactic geometry and the user's lens over the top.
- **AR**: the same sky drawn over the phone camera, from Sky or from Trails, using the device
  compass and tilt. Runs on the device, offline, nothing uploaded.
- **Pano**: how far to rotate between frames for a given lens, sensor and overlap. The published
  CSS-only calculator, carried over unchanged.
- **Kit**: sensor, megapixels, lens and aperture, saved to the device and read by every other
  screen. Pixel pitch, field of view, and the NPF exposure limit pin-sharp or relaxed.

Everything reads in the dark: six colour schemes, and a night vision mode that turns the whole
app red on black, canvases and charts included. Both are remembered between visits.

## Running it

`site/` is the deployable app: plain static files, no build step. Serve that folder, or point
GitHub Pages at it, and you are done.

```
site/index.html                 static landing page: this is what search engines read
site/app/index.html             the app
site/app/manifest.webmanifest   installs as "Noctography" on a phone home screen
site/support.js                 runtime
site/noctography-engine.js      the model
site/noctography-sat.js         SGP4 propagator and pass finder
site/noctography-plan.js        kit profile, trail recipes and sessions, sky elements catalogue
site/noctography-ar.js          device orientation, camera passthrough and the AR projector
site/pano-calculator.js         panorama calculator, fetched on first open of that tab
site/assets/                    icons and brand mark
site/favicon.png                tab icon
site/noctography-link-preview.png   1200x630 share card
site/robots.txt, sitemap.xml, llms.txt
```

**The landing page is deliberately plain HTML, not the app.** The app renders in JavaScript, and
most AI crawlers. GPTBot, ClaudeBot, PerplexityBot: do not run JavaScript, so to them a
JS-rendered page is blank. `index.html` carries the real prose, headings, and JSON-LD
(`WebApplication`, `Person`, `FAQPage`) in the source. `llms.txt` is the same thing again as
plain text, including the definitions specific to this project. Edit those by hand: they are not
generated from the DC.

Live cloud, aurora and place search need a connection; everything else is computed in the browser.

**Use the multi-file build in production.** `Noctography.html` is a single self-contained file for
offline use and emailing: it inlines everything into one 3.7 MB document, which low-memory Android
phones can fail to render at all ("Aw, snap"). The `site/` build loads the same app as separate
cacheable files, and does not touch `pano-calculator.js` at all until someone opens that tab: 
verified: no request for it during page load, 357 KB fetched on first click. Nothing large is on
the critical path: the header mark is a 128px, 29 KB file, and the 1024px icon is fetched by the OS
only when someone installs the app.

## What is in here

| Path | What it is |
| --- | --- |
| `Noctography.dc.html` | The app: layout, screens, tiles, navigation |
| `noctography-engine.js` | The model, astronomy, shower data, sky brightness, weather, light pollution atlas |
| `noctography-sat.js` | SGP4 orbit propagator and pass finder for the ISS and recent Starlink launches |
| `noctography-plan.js` | The kit profile and its exposure maths, the four star trail recipes and session planner, and the sky elements catalogue with its ranking |
| `noctography-ar.js` | Device orientation and compass handling, camera passthrough, calibration, and the projector the AR overlay aims with |
| `pano-calculator.js` | The panorama rotation calculator, wrapped as `<pano-calculator>` |
| `assets/noctography-icon.png` | App icon, 1024px, home screen and manifest only, never the page |
| `assets/noctography-icon-128.png` | The 44px header mark, sized for it |
| `assets/logo-roundel.png` | Paul Haworth Nightscapes mark, used in the footer |
| `site/` | Deployable static build, this is what gets published |
| `Noctography-offline.dc.html` | Source variant for the single-file build, imports the calculator eagerly so it can be inlined |
| `Noctography.html` | Single-file offline build (generated). Heavy; not for production |

## The model

Every meteor figure comes from one relation, evaluated every 15 minutes through the night,
separately for each active shower and the sporadic background:

```
rate = ZHR(t) × sin(h) × r^(lm − 6.5) × clear × 0.75
```

- **ZHR(t)**, shower strength at this point in its cycle, anchored to solar longitude rather than
  calendar date, with a narrow peak plus a broad component for streams with long wings.
- **sin(h)**: radiant altitude, tapered below 8° for extinction and terrain.
- **r**: population index. An exponent, not a multiplier, which is why one lost magnitude of sky
  darkness roughly halves the rate.
- **lm**: naked-eye limiting magnitude, built in linear brightness units: airglow floor at 22.0,
  artificial ground light from the atlas, twilight, then moonlight (Krisciunas & Schaefer 1991 with
  Kasten & Young airmass, so a setting moon fades rather than snapping off). Thin cloud counts
  twice: it blocks part of the sky and scatters town glow and moonlight back down.
- **clear**: layer-weighted fraction of sky not blocked by cloud.
- **0.75**: perception factor. ZHR assumes a perfect observer watching the whole sky at once.

Shower parameters are hand-encoded from the International Meteor Organization's calendar and
working list, with no outburst or dust-trail predictions. Sky darkness comes from David Lorenz's
2025 light pollution atlas (VIIRS), baked in as two encoded PNGs and used as a continuous
measurement. Bortle class is shown for familiarity only.

**Real-world Bortle** applies the same limiting-magnitude model to the whole sky rather than to a
radiant: atlas brightness, plus moonlight, plus humidity haze, plus town glow scattered back down
by thin cloud, evaluated at the zenith every 15 minutes and reported as the median across the dark
hours. It is what the site actually performs like tonight, not what it reads on a perfect night.

`uploads/meteor-outlook-model.md` holds the full reference for the calculation logic.

## Data

Every source is also listed in the app itself, under "Data sources and credits" in the footer.

| Data | Source | Notes |
| --- | --- | --- |
| Cloud, humidity, temperature, dew point, wind | Open-Meteo forecast | Live, 16 days, hourly, smoothed between samples |
| Historical cloud | Open-Meteo ERA5 archive | 3 previous years, ±3 day window: typical, never a forecast |
| Aurora | NOAA SWPC planetary K index | 3-hourly forecast |
| Place search | Open-Meteo geocoding | |
| Light pollution | Lorenz 2025 atlas | Baked in, static |
| Satellite orbits | CelesTrak TLEs | ISS and last-30-days launches; SGP4 propagated in the browser |
| Sun, moon, radiants | Computed in browser | No library dependency |

## Known limits

Shower parameters are approximations. Outside the British Isles the light pollution grid averages
over roughly 20 km, so a dark site near a city reads brighter than it is: set the class by hand if
you know the site. No horizon obstruction model. Beyond 16 days the cloud figure describes a time
of year, not a night.

## Credits

Design and astrophotography: Paul Haworth Nightscapes, 
[paulhaworthnightscapes.com](https://www.paulhaworthnightscapes.com) ·
[youtube.com/@nightscapejournals](https://www.youtube.com/@nightscapejournals)

If it saves you a cold hour working something out, you can
[say thanks](https://buymeacoffee.com/jpchaworthy).
