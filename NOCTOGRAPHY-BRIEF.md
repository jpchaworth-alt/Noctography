# Noctography — product & audience brief

*Reference document for marketing content generation. Everything below is accurate to the shipped product as of August 2026.*

---

## 1. The one-line version

**Noctography is a free, browser-based planning tool for nightscape and landscape astrophotography. It answers one question: is tonight worth going out for, and if so, when?**

- Site: `https://www.noctography.net` (landing page) → `/app/` (the tool itself)
- Made by: Paul Haworth, landscape astrophotographer and filmmaker, Cambridgeshire Fens, UK
- Cost: free, no account, no tracking, no paywall. Optional Buy Me a Coffee.
- Support link: `https://buymeacoffee.com/jpchaworthy`
- Related brands: `paulhaworthnightscapes.com`, `youtube.com/@nightscapejournals` (Nightscape Journals)

---

## 2. The problem it solves

The information a nightscape photographer needs before driving out already exists — but it is scattered across six sites: one for cloud, one for the moon, a light pollution map, a meteor calendar, a satellite tracker, an aurora forecast. None of them answer the actual question being asked at 5pm on a Tuesday: *is tonight worth it?*

Noctography pulls the forecast, computes the astronomy on the user's own device, and gives a straight answer — then, if the answer is yes, tells them when the sky will be darkest, where the Milky Way core will sit, whether to pack dew straps, and whether mist is going to ruin it anyway.

**Key emotional truth for marketing:** the product saves a cold, wasted hour — either standing in a field under cloud, or hunched over a phone in the dark doing arithmetic.

---

## 3. What it actually does

### Tonight (the main screen)
A plain-English verdict at the top, the best observing window of the coming night, then twelve tiles:

| Tile | What it tells you |
|---|---|
| Cloud | Cover through the dark hours, not a daily average |
| Temperature & dew point | Including how close the two are |
| Wind | Speed and whether it will shake a tripod |
| Sunset / sunrise | For the coming night |
| Moon | Phase, illumination, rise and set |
| Darkness window | When the sun is more than 18° below the horizon |
| Real-world Bortle | See definition below — the headline original metric |
| Meteors | Realistic meteors-per-hour, not quoted ZHR |
| Aurora | Peak NOAA Kp for that night only |
| Milky Way | Core altitude and when it is usefully high |
| ISS | Visible passes only — bright enough to actually notice |
| Starlink | Recent train passes, same brightness filter |

Plus a **mist and fog risk warning** when the three conditions for radiation fog line up.

### Looking ahead
The next ten nights compared side by side — cloud, moon, real-world Bortle, meteors, aurora, sun and moon times — ranked with clear sky first, best night called out with the reason stated plainly.

### Meteor outlook
Sixty nights of shower activity plotted against moon, cloud and sky darkness. An hour-by-hour smoothed rate chart for any chosen night. A per-shower breakdown with radiant position, and a focal-length selector for framing the radiant.

### Panorama rotation calculator
Degrees of rotation between frames for a given focal length, sensor size, orientation and overlap — plus shot counts for 180° and 360° sweeps. Built to be used in the field, in the dark, with cold hands.

### Night vision mode
One tap turns the entire app red-on-black to preserve dark adaptation. Applies app-wide, remembered between visits.

### Installable
Add to home screen on iOS/Android and it behaves like a native app — full screen, its own icon, no browser chrome. It needs a connection each time it opens (there is no offline cache), and updates arrive silently: publish a new build and everyone has it the next time they open the app.

---

## 4. The original ideas worth marketing

These are Noctography's genuinely differentiated concepts. Lead with them.

**Real-world Bortle.** The Bortle class a site *actually performs at* on a given night, rather than at its theoretical best. Starts from the light pollution atlas value, then adds moonlight, humidity haze, and town glow scattered back down by thin cloud, evaluated at the zenith through the dark hours, converted back into a Bortle class. *A Bortle 3 site under a gibbous moon genuinely performs like a Bortle 5 one — and that's the number worth planning against.* No other tool does this.

**Honest meteor rates.** Everyone quotes ZHR. ZHR assumes a perfect observer under a perfect sky with the radiant directly overhead — a number nobody has ever experienced. Noctography computes what you can actually expect to see: `ZHR(t) × sin(radiant altitude) × r^(limiting magnitude − 6.5) × clear-sky fraction × 0.75`, every 15 minutes through the night. A shower quoted at 100/hour is realistically 25/hour from a rural mid-latitude site.

**Mist and fog risk.** Radiation fog forms on exactly the nights that look most promising. Noctography flags when air is near dew point, wind is under ~10 km/h, and the sky is largely clear.

**Everything runs on the device.** No server decides anything. Location never leaves the phone. No account, no email capture, no analytics.

**Brightness-filtered satellite passes.** ISS and Starlink trains propagated with SGP4 in the browser — only surfacing passes bright enough to actually notice, rather than every technically-visible pass.

---

## 5. Audience

### Primary: the serious hobbyist nightscape photographer
Owns a full-frame or APS-C camera and a fast wide lens. Drives 30–90 minutes to a dark site. Plans around the new moon. Has been caught out by cloud, moonlight and mist enough times to want a better answer. Currently juggles Clear Outside, Photopills, Stellarium, a light pollution map and a weather app.

**What they want:** a fast, credible verdict, and numbers they can check.

### Secondary: the astro-curious beginner
Has just bought their first proper camera, or a tripod for their phone. Doesn't yet know what Bortle means, has never heard of astronomical twilight, and finds existing tools intimidatingly technical. Reads "is tonight worth it?" and immediately understands.

**What they want:** to be told, in plain English, whether to go out tonight — and to learn the vocabulary painlessly.

### Tertiary: visual astronomers and meteor observers
Not photographers at all. Own a telescope or just a deckchair. Care about darkness window, moon interference, Kp and meteor rates. The meteor outlook is a standalone draw for this group.

### Fourth: talk audiences and camera clubs
Paul speaks to camera clubs, astronomy societies, observatories, Dark Sky Discovery sites, nature reserves and wildlife trusts. Noctography is a natural giveaway at the end of a talk — a free, useful thing with his name on it that keeps working long after the evening ends.

### Geographic scope
**Global, both hemispheres.** The app reads the light pollution atlas, forecast and sky for any location the user chooses. Marketing should never imply it is UK-only — the only British thing about it is Paul. Southern-hemisphere users get correct Milky Way core seasons and altitudes (the core climbs far higher and the season shifts).

---

## 6. Use cases

1. **The 5pm decision.** Home from work, cloud looks borderline. Thirty seconds on the phone gives a yes or no and a time window.
2. **Choosing the night.** Which of the next ten nights is worth booking a babysitter for. Looking ahead ranks them.
3. **Planning a meteor shower session.** When does the radiant climb high, does the moon interfere, and what rate is realistic. Sixty-night view for planning trips months out.
4. **Milky Way core planning.** Is the core up, how high, and does that overlap with real darkness at my latitude.
5. **On-site panorama maths.** In a field, in the dark, working out rotation between frames for a 360° nightscape pano.
6. **Deciding whether to pack dew straps.** Temperature vs. dew point on the Tonight screen.
7. **Aurora alerting for mid-latitudes.** Peak Kp for the coming night only, rather than a rolling three-day feed.
8. **Catching an ISS or Starlink pass** for a deliberate trail shot — or knowing one is coming so it doesn't ruin a stack.
9. **Teaching.** A camera club leader using the tiles to explain why last month's outing failed.

---

## 7. Voice and tone

Match the Paul Haworth Nightscapes house voice:

- **First person, warm, specific, unshowy.** "I'm Paul Haworth." "I built the thing I wanted." Never "we", never a corporate brand voice.
- **Story before spec.** Lead with the night, not the settings.
- **Honest, slightly self-deprecating.** "The occasional mishap." "A drive home." Nothing oversold.
- **British English, sentence case, en dashes.** Colour, tranquility, kit, torch. Dates as `24 January 2026`.
- **Numbers are data.** Always mono, always with real units: `20s`, `f/2.8`, `ISO 3200`, `Kp 6`, `24mm`.
- **No emoji. Ever.**
- **Modest CTAs.** "Have a look at tonight." "Open Noctography." Never "Buy now", never exclamation marks — except the site's long-standing "Free stuff!", which stays.

**Words to avoid:** stunning, breathtaking, epic, game-changing, revolutionary, seamless, powerful, unlock, elevate.
**Words that recur naturally:** tranquility, dark-adapted, the fens, worth the drive, cold hands, straight answer.

---

## 8. Visual identity

- **Colours:** Russian Violet `#160F47` (canvas), Space Cadet `#363162`, Ultra Violet `#4D4C7D`, Orange Peel `#FAA338` (the *only* warm accent — one primary action per view), White Smoke `#F5F5F5`. Deep surface `#050418`.
- **Type:** Cormorant Garamond (serif display, titles), Barlow (300–700, everything functional), Barlow Condensed 600 (poster/talk titles, ALL CAPS), JetBrains Mono (all data and exposure values).
- **Signature move:** 12px uppercase eyebrow labels at `0.22em` letter-spacing.
- **Imagery:** real nightscape photography or plain violet — nothing in between. No illustrated star fields, no fake grain, no gradients as decoration. Cool-to-neutral skies (3900K house white balance), genuinely dark shadows, warm foreground light only where a torch or town put it. Silhouettes read pure black.
- **Night vision theme:** red-on-black, available as a token scope throughout.

---

## 9. Proof points and credibility

Data sources, all credited inside the app:

- **Open-Meteo** forecast + ERA5 archive — cloud, humidity, temperature, dew point, wind, visibility
- **NOAA Space Weather Prediction Center** — planetary K index
- **David Lorenz 2025 World Atlas of Artificial Night Sky Brightness** — light pollution, baked into the app
- **International Meteor Organization** working list — shower dates, ZHR, population index
- **CelesTrak** orbital elements, propagated with **SGP4** in the browser
- **Krisciunas & Schaefer (1991)** moonlight sky brightness model
- **Kasten & Young (1989)** airmass

Sun, moon and meteor radiant positions are computed in the browser from first principles — nothing is a lookup table or a scraped third-party number.

---

## 10. Angles for content

- *"The Bortle number on the map is a lie on most nights."* — real-world Bortle explainer
- *"Why you'll never see 100 meteors an hour."* — honest rates explainer
- *"The clearer the forecast, the more likely the fog."* — radiation fog explainer
- *"Six tabs, one question."* — the origin story
- *"It works in Chile too."* — hemisphere-agnostic positioning
- *"Nothing leaves your phone."* — privacy as a feature, not a compliance note
- Seasonal hooks: Perseids (August), Geminids (December), Milky Way core season opening (February, northern hemisphere), aurora around equinoxes
- Talk-adjacent: "the free thing I give away at the end of every talk"

---

## 11. Constraints and honest caveats

- Requires JavaScript, and a connection every time it opens — there is no offline mode. Never claim it works offline.
- Forecast accuracy is Open-Meteo's, not Paul's — it is a planning aid, not a guarantee.
- Aurora is a Kp forecast, not a local visibility promise.
- Light pollution atlas is 2025 data; new developments won't appear.
- Meteor rates are modelled expectations, not predictions — outbursts happen.
- Three tools so far, "with more coming" — don't promise a specific roadmap.
