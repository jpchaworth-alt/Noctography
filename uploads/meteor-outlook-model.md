# Meteor Outlook: how the visibility model works

Reference document for the calculation logic behind Meteor Outlook. Everything below is
implemented client side in `meteor-outlook.html`. No server, no API keys.

---

## 1. The headline equation

Every number in the app comes from one relation, evaluated every 15 minutes through the night,
separately for every active shower plus the sporadic background:

```
observed rate (per hour) = ZHR(t) × sin(h) × r^(lm − 6.5) × clear × 0.75
```

| Term | Meaning | Where it comes from |
|---|---|---|
| `ZHR(t)` | Zenithal hourly rate at this moment in the shower's cycle | Section 2 |
| `sin(h)` | Radiant altitude factor | Section 3 |
| `r^(lm − 6.5)` | Penalty for a sky brighter than the ZHR reference | Sections 4 to 8 |
| `clear` | Fraction of sky not blocked by cloud | Section 9 |
| `0.75` | Perception factor | Section 10 |

This is the standard ZHR relation used by the International Meteor Organization, rearranged to
predict observed rate rather than to correct observations back to a standard.

The key thing to understand about the structure: **`r` is an exponent, not a multiplier.**
The population index `r` describes the brightness distribution of the stream's meteors, typically
2.1 to 3.0. With `r = 2.2`, losing one magnitude of sky darkness roughly halves the rate; losing
two cuts it to a quarter. This is why the model is so sensitive to moonlight and light pollution,
and why it matches the large real-world gap between a dark site and a suburban garden.

---

## 2. Shower activity over its cycle

Timing is anchored to **solar longitude**, not calendar date, so shower parameters stay valid
across years. Solar longitude is computed for equinox J2000, which is what the IMO quotes, so a
precession correction of about 1.397° per century is applied to the apparent value.

Activity follows a double exponential around maximum:

```
ZHR(λ) = ZHR_max × 10^(−b × |λ − λ_max|)
```

with separate slopes `b` before and after maximum. Streams with long wings get a second, broad
component added on top:

```
ZHR(λ) = ZHR_narrow × 10^(−b_narrow × |Δλ|)  +  ZHR_broad × 10^(−b_broad × |Δλ|)
```

This two-component form matters. A single slope steep enough to reproduce the Perseid peak makes
the shower vanish three days out, which is wrong. With the broad component, five days before
maximum the Perseids still give roughly 15 ZHR, which matches observed reality.

Slope values translate to width as `FWHM = 2 × 0.301 / b`. So `b = 1.0` is a shower lasting hours
(Quadrantids), `b = 0.026` is one lasting weeks (Taurids).

### Encoded showers

19 streams, plus two continuous sources.

| Code | Shower | λ_max | ZHR | r | Character |
|---|---|---|---|---|---|
| QUA | Quadrantids | 283.15 | 110 | 2.1 | Very sharp peak, hours only |
| LYR | Lyrids | 32.32 | 18 | 2.1 | Sharp, occasional outbursts |
| ETA | Eta Aquariids | 45.5 | 50 | 2.4 | Broad, poor northern geometry |
| SDA | S. Delta Aquariids | 125.0 | 25 | 2.5 | Broad plateau, faint |
| CAP | Alpha Capricornids | 127.0 | 5 | 2.5 | Low rate, high fireball share |
| PER | Perseids | 140.0 | 103 | 2.2 | Broad wings, high radiant |
| KCG | Kappa Cygnids | 140.5 | 3 | 3.0 | Slow, variable year to year |
| AUR | Alpha Aurigids | 158.6 | 6 | 2.5 | Sharp, outburst-prone |
| SPE | Sept. Eps. Perseids | 166.7 | 5 | 2.9 | Fast, faint |
| DRA | October Draconids | 195.4 | 5 | 2.6 | Extremely sharp, evening radiant |
| STA | Southern Taurids | 197.0 | 5 | 2.3 | Very broad, fireballs |
| ORI | Orionids | 208.0 | 20 | 2.5 | Broad flat maximum |
| NTA | Northern Taurids | 230.0 | 5 | 2.3 | Very broad, fireballs |
| LEO | Leonids | 235.27 | 15 | 2.5 | Fastest common meteors |
| HYD | Sigma Hydrids | 256.0 | 7 | 3.0 | Faint, underrated |
| MON | Dec. Monocerotids | 260.9 | 3 | 3.0 | Weak, confused with GEM |
| GEM | Geminids | 262.2 | 153 | 2.6 | Strongest, radiant up all night |
| URS | Ursids | 270.7 | 10 | 3.0 | Circumpolar, occasional bursts |

Parameters are encoded by hand from the IMO annual calendar and working list. They do **not**
include predicted outbursts or dust-trail encounters.

### Antihelion source (ANT)

Not a shower but a diffuse patch of activity on the ecliptic, about 195° from the Sun in ecliptic
longitude. The radiant is computed dynamically from the Sun's position each night. Fixed at
ZHR 3, `r = 3.0`. Suppressed between solar longitude 115 and 165, where the July and August
southern showers occupy the same region and the IMO stops reporting it separately.

### Sporadic background (SPO)

Meteors belonging to no stream. Modelled as a diurnal sinusoid in local solar time:

```
ZHR_sporadic = 6.5 + 3.5 × cos((h − 6) / 24 × 360°)
```

Maximum near 06:00 local, minimum near 18:00. This is the apex effect: after midnight your side
of the planet turns to face Earth's direction of travel and sweeps up particles head-on. Rates
roughly triple between evening and dawn. Sporadics bypass the radiant altitude factor, since they
arrive from all over the sky.

---

## 3. Radiant altitude

Radiant right ascension and declination drift daily; the drift rate in degrees per day is applied
linearly from maximum. The radiant is converted to altitude and azimuth using local sidereal time.

```
altFactor = sin(h) × clamp(h / 8, 0, 1)     for h > 0
altFactor = 0                               for h ≤ 0
```

The `sin(h)` term is the geometric projection: a radiant at the zenith delivers meteors across the
whole sky, one on the horizon delivers almost none. The extra taper below 8° accounts for
atmospheric extinction and terrain near the horizon, and replaces a hard cutoff that used to put a
step in the curve.

---

## 4. Sky brightness: the chain

This is where most of the model's complexity sits. Sky brightness is built up in linear units
(nanolamberts), because brightnesses add and magnitudes do not, then converted back:

```
B (nL) = 34.08 × exp(20.7233 − 0.92104 × V)
V (mag/arcsec²) = (20.7233 − ln(B / 34.08)) / 0.92104
```

The chain, in order:

1. **Natural airglow floor**, fixed at 22.0 mag/arcsec².
2. **Artificial ground light**, from the light pollution atlas, amplified by cloud and haze.
3. **Twilight**, subtracted in magnitudes.
4. **Moonlight**, added in linear units, also amplified by cloud and haze.
5. **Humidity extinction**, subtracted from the final limiting magnitude.

---

## 5. Light pollution

Sky brightness at the site comes from **David Lorenz's 2025 light pollution atlas**, itself a
recalculation of the Cinzano and Falchi propagation model using current NASA and NOAA VIIRS
night lights data.

Two grids are baked into the page as encoded PNGs:

| Layer | Coverage | Resolution | Notes |
|---|---|---|---|
| British Isles | 48.5 to 61.5°N, 11.5°W to 3°E | 1.5 arcmin, about 2 km | Atlas native resolution |
| World | 65°S to 75°N, all longitudes | 0.2°, about 20 km | Mean artificial brightness per cell |

The atlas publishes zones rather than continuous values: zone 0, then zones 1 to 7 each split into
sub-zones a and b. Each step of one whole zone is a factor of 3 in artificial brightness; each
sub-zone step is √3. The boundary between 3b and 4a is defined as artificial brightness equal to
the natural background (light pollution index, LPI = 1).

```
LPI for zone n, sub-zone a = 3^(n − 3.75)      (geometric centre of the bin)
LPI for zone n, sub-zone b = 3^(n − 3.25)
sky brightness = 22.0 − 2.5 × log10(1 + LPI)
```

Pixel values encode `(22.0 − sky brightness) × 20`, giving 0.05 magnitude precision.

Validation samples: Thornham 21.40, Kielder 21.85, Exmoor 21.60, central London 17.50,
Manhattan 17.55, Atacama 22.00.

### Continuous rather than stepped

Bortle class is shown for familiarity, but the model uses the **measured sky brightness directly**,
interpolating naked-eye limiting magnitude from this table rather than snapping to one of nine steps:

| mag/arcsec² | 22.0 | 21.9 | 21.7 | 21.3 | 20.4 | 19.3 | 18.7 | 18.2 | 17.8 |
|---|---|---|---|---|---|---|---|---|---|
| naked-eye limit | 7.7 | 7.3 | 6.9 | 6.4 | 6.0 | 5.5 | 5.0 | 4.5 | 4.0 |

Bortle class is then derived for display from thresholds at 21.95, 21.85, 21.6, 20.9, 19.9, 19.2,
18.6 and 18.0.

---

## 6. Cloud and humidity as scatterers

The important insight: **thin cloud does not only block the sky, it scatters ground light and
moonlight back down at you.** This is why the same 40% high cloud is harmless at a pristine site
and ruinous under a city.

Two factors are derived from the forecast:

```
veil = (0.75 × high + 0.50 × mid + 0.25 × low) / 100
hum  = clamp((relative humidity − 65) / 35, 0, 1)
```

`veil` is the see-through fraction: high cirrus is weighted most because you can still shoot
through it while it scatters, low stratus least because it blocks outright and is handled by the
blocking term instead. When only total cloud is available, `veil = 0.40 × total / 100`.

`hum` ramps from zero at 65% relative humidity to one at 100%, representing aerosol swelling and
haze.

### Application

**Ground light amplification.** Only the artificial component is amplified, so at a pristine site
where artificial brightness is zero, cloud does nothing:

```
artificial_nL = max(0, B(site) − B(22.0))
amplification = 1 + 3.5 × veil + 1.0 × hum
sky = nl2mag(B(22.0) + artificial_nL × amplification)
```

**Moonlight amplification.** Applied to the moonlight brightness before it is added:

```
B_moon → B_moon × (1 + 2.5 × veil + 0.8 × hum)
```

**Transparency loss.** A straight subtraction from limiting magnitude, representing light lost from
the meteors themselves rather than sky added:

```
humLoss = 0.6 × hum
```

### Behaviour

| Site | 60% high cloud, 70% RH | Loss to scattered glow |
|---|---|---|
| Bortle 1 | no effect | 0.00 mag |
| Bortle 3 | modest | 0.40 mag |
| Bortle 5 | significant | 0.92 mag |
| Bortle 8 | saturated | 1.06 mag |

The saturation at the bright end is correct rather than a bug: once artificial light dominates
completely, a 2.65× brightening is 1.06 magnitudes regardless of how bright the starting point was.

---

## 7. Moonlight

Uses the **Krisciunas and Schaefer (1991)** moonlight sky brightness model, the standard in the
field. It takes the Moon's phase angle, its altitude, and its angular distance from the direction
you are looking.

```
I*  = 10^(−0.4 × (3.84 + 0.026|α| + 4×10⁻⁹ α⁴))          illuminance vs phase angle α
f(ρ) = 10^5.36 × (1.06 + cos²ρ) + 10^(6.15 − ρ/40)       scattering vs separation ρ
B_moon = f(ρ) × I* × 10^(−0.4 k X_moon) × (1 − 10^(−0.4 k X_target))
```

with extinction coefficient `k = 0.20`.

### Airmass substitution

The original paper's airmass approximation tops out near 5 airmasses. That leaves a setting moon
far too bright and then switches it off abruptly at the horizon, which produced a cliff in the rate
curve: the sky jumped nearly three magnitudes in one 15-minute step and the rate leapt eightfold.

Replaced with **Kasten and Young (1989)**:

```
X(h) = 1 / (sin h + 0.50572 × (h + 6.07995)^−1.6364)
```

This reaches about 34 airmasses at the horizon, roughly 7 magnitudes of extinction, so the moon
fades out smoothly over its last few degrees as it actually does. The moon term is evaluated down
to −0.8° altitude, by which point it is negligible.

### Assumed viewing direction

Moon separation depends on where you are looking. The model assumes a watcher looking about 40°
away from the radiant, towards the zenith. Past the zenith that direction continues down the far
side with azimuth flipped by 180°, which keeps the sightline continuous as the radiant climbs. An
earlier version snapped between two directions at 45° radiant altitude and put a false notch in the
curve.

---

## 8. Twilight

Subtracted from sky brightness in magnitudes, zero below −18° solar altitude:

```
twLoss = 5.0 × min(1, (sun altitude + 18) / 18)²
```

Roughly 0.5 magnitudes at nautical twilight (−12°), 2.0 at −6°, 5.0 at sunset.

### Final limiting magnitude

```
lm = site_nelm − (site_sqm − sky_after_everything) − humLoss
```

---

## 9. Cloud blocking

Separate from the scattering term above. Layers combine multiplicatively, weighted by how much
each actually stops you shooting:

```
clear = (1 − low/100) × (1 − 0.9 × mid/100) × (1 − 0.55 × high/100)
```

High cloud at 40% is annoying but shootable; low stratus at 40% usually is not.

---

## 10. Perception factor

```
observed rate × 0.75
```

ZHR is defined for a perfect observer watching the entire sky at once under a 6.5 magnitude sky.
Real people, however experienced, catch appreciably less. Without this correction the model
overpredicts a Perseid peak by roughly a third against actual observer reports.

---

## 11. Data sources and refresh

| Data | Source | Cadence | Fallback |
|---|---|---|---|
| Cloud, humidity, temperature, dew point | Open-Meteo forecast API | Live, 16 days ahead, hourly | Climatology, then manual assumption |
| Historical cloud | Open-Meteo ERA5 archive | 3 previous years, same calendar window | Manual assumption |
| Light pollution | Lorenz 2025 atlas (VIIRS) | Baked in, static | Manual Bortle class |
| Shower parameters | IMO calendar and working list | Hand-encoded, annual review | None |
| Sun and Moon positions | Computed in browser | Every sample | None |

Hourly forecast values are **linearly interpolated** between hours. Reading them as nearest-hour
steps made a cloud change from 20% to 90% appear as a vertical drop in the rate curve.

### Climatology beyond the forecast

Beyond 16 days, cloud comes from ERA5 for the same calendar window across the previous three years.
Each reading is spread over a **±3 day window** before averaging. Three samples per calendar date is
far too noisy to present as typical and would produce fake night-to-night variation that looks like
signal. Smoothing turns it into roughly 21 samples per hour-of-day and lets it vary over weeks,
which is how cloud climate actually behaves. It is labelled as typical, never as a forecast, and
drawn more faintly throughout the interface.

---

## 12. Night structure and derived figures

| Parameter | Value |
|---|---|
| Sample interval | 15 minutes |
| Night window | 16:00 local to 08:00 next day |
| Rates computed when | Sun below −6° |
| Full astronomical dark | Sun below −18° |
| Best window | Contiguous run where rate is within 30% of its peak |

**Night total** is the rate integrated across the dark hours. **Peak rate** is the sum of all
sources at the best moment, including sporadics, which is why it exceeds any single shower's figure.

### Score normalisation

```
score = 100 × (log10(1 + rate) − log10(4)) / (log10(91) − log10(4))
```

Logarithmic, floored at the sporadic background of about 4 an hour and topped at 90. A night that
delivers only background meteors scores zero, which is the honest answer to "is this worth going
out for".

| Score | Verdict |
|---|---|
| ≥ 82 | exceptional |
| ≥ 60 | very good |
| ≥ 40 | worth going out |
| ≥ 20 | quiet but shootable |
| ≥ 6 | thin |
| below | background only |

### Camera capture estimate

```
FOV solid angle Ω = 4 × asin(sin(w/2) × sin(h/2))     steradians
sky fraction = Ω / 2π
meteors in frame per hour = rate × sky fraction × 0.55
```

The 0.55 accounts for cameras missing faint meteors the eye catches, partly offset by catching some
the eye misses.

---

## 13. Astronomy routines

All computed in browser, no library dependency.

| Quantity | Method | Accuracy |
|---|---|---|
| Sun position | Low-precision almanac series | ~0.01° |
| Solar longitude (J2000) | Apparent longitude minus precession | sufficient for peak timing to about an hour |
| Moon position | Astronomical Almanac low-precision series | ~0.3° |
| Moon illumination | Phase angle from elongation and distance | ~1% |
| Sidereal time | IAU 2000 polynomial | exact for this purpose |
| Alt/Az conversion | Standard spherical trigonometry | exact |

Verified against known values: full moon 28 August 2026, new moon 12 August 2026, Perseid maximum
at solar longitude 140° falling 13 August 2026 around 02h UT, London solar altitude 54.2° at noon
UT on 9 August, Polaris altitude matching site latitude to 0.3°.

Not modelled: lunar parallax (up to 1° near the horizon), atmospheric refraction, nutation.

---

## 14. Known limitations

- Shower parameters are approximations from published sources. No outburst or dust-trail
  predictions.
- Outside the British Isles the light pollution grid averages over roughly 20 km, so a dark site
  near a city reads brighter than it is.
- No horizon obstruction model. Assumes a clear view to the horizon in every direction.
- Climatology beyond 16 days describes a time of year, not a night.
- The perception factor is a single constant applied to everyone, though real observers vary widely.
- Sporadic rates are modelled for mid-northern latitudes and are less accurate elsewhere.
- Population index `r` is treated as fixed per shower, though it varies somewhat with solar
  longitude in reality.

---

## 15. References

- International Meteor Organization, annual Meteor Shower Calendar and Working List of Visual
  Meteor Showers
- Krisciunas, K. and Schaefer, B. E. (1991), *A model of the brightness of moonlight*, PASP 103, 1033
- Kasten, F. and Young, A. T. (1989), *Revised optical air mass tables and approximation formula*,
  Applied Optics 28, 4735
- Falchi, F. et al. (2016), *The new world atlas of artificial night sky brightness*,
  Science Advances 2, e1600377
- Lorenz, D., light pollution atlas 2025, recalculated from VIIRS night lights
- Open-Meteo forecast and ERA5 archive APIs
