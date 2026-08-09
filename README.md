# Noctography

Field tools for nightscape photography, by [Paul Haworth](https://www.paulhaworthnightscapes.com).
One page, no build step, no server, no API keys. It opens on a phone at the side of a field and
tells you whether tonight is worth it.

Two tools so far, with room for more:

- **Tonight** — a greeting keyed to the actual conditions, the best window to be out, and tiles for
  cloud, moon, darkness, Milky Way core, aurora, air and dew, wind, and tonight's meteors.
- **Meteor outlook** — sixty nights of shower rates against moon, cloud and sky darkness, with an
  hour-by-hour chart and a breakdown for every active shower.
- **Panorama calculator** — how far to rotate between frames for a given lens, sensor and overlap.
  The published CSS-only calculator, carried over unchanged.

Everything reads in the dark: a night vision mode turns the whole app red on black, and it is
remembered between visits.

## Running it

Open `Noctography.dc.html` in a browser. Nothing to install.

For a single file you can email, drop on a phone home screen, or embed, use the bundled build:

```
Noctography.html      # everything inlined — engine, calculator, light pollution atlas, brand mark
```

Live cloud, aurora and place search need a connection; everything else is computed in the browser.

## What is in here

| Path | What it is |
| --- | --- |
| `Noctography.dc.html` | The app: layout, screens, tiles, navigation |
| `noctography-engine.js` | The model — astronomy, shower data, sky brightness, weather, light pollution atlas |
| `pano-calculator.js` | The panorama rotation calculator, wrapped as `<pano-calculator>` |
| `assets/logo-roundel.png` | Brand mark |
| `Noctography.html` | Bundled single-file build (generated, gitignored) |

## The model

Every meteor figure comes from one relation, evaluated every 15 minutes through the night,
separately for each active shower and the sporadic background:

```
rate = ZHR(t) × sin(h) × r^(lm − 6.5) × clear × 0.75
```

- **ZHR(t)** — shower strength at this point in its cycle, anchored to solar longitude rather than
  calendar date, with a narrow peak plus a broad component for streams with long wings.
- **sin(h)** — radiant altitude, tapered below 8° for extinction and terrain.
- **r** — population index. An exponent, not a multiplier, which is why one lost magnitude of sky
  darkness roughly halves the rate.
- **lm** — naked-eye limiting magnitude, built in linear brightness units: airglow floor at 22.0,
  artificial ground light from the atlas, twilight, then moonlight (Krisciunas & Schaefer 1991 with
  Kasten & Young airmass, so a setting moon fades rather than snapping off). Thin cloud counts
  twice — it blocks part of the sky and scatters town glow and moonlight back down.
- **clear** — layer-weighted fraction of sky not blocked by cloud.
- **0.75** — perception factor. ZHR assumes a perfect observer watching the whole sky at once.

Shower parameters are hand-encoded from the International Meteor Organization's calendar and
working list, with no outburst or dust-trail predictions. Sky darkness comes from David Lorenz's
2025 light pollution atlas (VIIRS), baked in as two encoded PNGs and used as a continuous
measurement — Bortle class is shown for familiarity only.

`uploads/meteor-outlook-model.md` holds the full reference for the calculation logic.

## Data

| Data | Source | Notes |
| --- | --- | --- |
| Cloud, humidity, temperature, dew point, wind | Open-Meteo forecast | Live, 16 days, hourly, smoothed between samples |
| Historical cloud | Open-Meteo ERA5 archive | 3 previous years, ±3 day window — typical, never a forecast |
| Aurora | NOAA SWPC planetary K index | 3-hourly forecast |
| Place search | Open-Meteo geocoding | |
| Light pollution | Lorenz 2025 atlas | Baked in, static |
| Sun, moon, radiants | Computed in browser | No library dependency |

## Known limits

Shower parameters are approximations. Outside the British Isles the light pollution grid averages
over roughly 20 km, so a dark site near a city reads brighter than it is — set the class by hand if
you know the site. No horizon obstruction model. Beyond 16 days the cloud figure describes a time
of year, not a night.

## Credits

Design and astrophotography: Paul Haworth Nightscapes —
[paulhaworthnightscapes.com](https://www.paulhaworthnightscapes.com) ·
[youtube.com/@nightscapejournals](https://www.youtube.com/@nightscapejournals)

If it saves you a cold hour working something out, you can
[say thanks](https://buymeacoffee.com/jpchaworthy).
