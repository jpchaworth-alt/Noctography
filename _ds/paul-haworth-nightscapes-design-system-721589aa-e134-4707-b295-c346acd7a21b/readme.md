# Paul Haworth Nightscapes — Design System

Cinematic nightscape adventures. Award-winning landscape astrophotography, night timelapse and film from the Cambridgeshire Fens and far beyond.

This system exists to make two kinds of thing:

1. **The website and its assets** — `www.paulhaworthnightscapes.com`: galleries, the talk booking page, the free-stuff store, posters and social graphics for "Capturing Light at Night".
2. **Field cards** — downloadable, phone-format reference cards explaining nightscape and landscape-astrophotography technique. These are read *outdoors, at night, by a dark-adapted eye*. Everything about the system's contrast, type sizes, touch targets and its red night-vision mode follows from that.

## Who this is for

Paul is an award-winning landscape astrophotographer and filmmaker based in the Cambridgeshire Fens. Through his cinematic nightscape adventures he brings the audience into the tranquility of the landscape at night to join him chasing starry skies, the Milky Way and the aurora while he captures compelling images that reveal the majesty of the cosmos above our heads. He speaks to camera clubs, astronomy societies, observatories, Dark Sky Discovery sites, nature reserves and wildlife trusts.

Audiences are a mix of complete beginners and experienced astrophotographers. The design has to be welcoming to the first and credible to the second — which is why numbers are always set as real data (mono, tabular) and never decorated.

## Sources this system was built from

Everything here derives from three supplied files plus the live website. There was no codebase, no Figma file and no font binaries.

| Source | Where it went |
| --- | --- |
| `Paul Haworth Nightscapes Logo new.png` | `assets/logo-roundel.png` — the brand mark |
| `Untitled - 08 August 2026 at 16.06.13.png` ("The Night Palette") | `tokens/colors.css`, `assets/brand-night-palette.png` |
| `New Dates Portrait.png` (2026 talk poster) | layout DNA for posters + `assets/poster-capturing-light-at-night.png` |
| `https://www.paulhaworthnightscapes.com` (live pages: `/`, `/talks`, `/free-stuff`) | site structure, nav, tone of voice, all UI-kit copy |
| `https://www.youtube.com/@nightscapejournals` | film / "Nightscape Journals" naming |

Not supplied, and therefore missing: **photography** (every image position in the UI kits is a drag-and-drop `<image-slot>`), **font files** (nearest Google Fonts substituted, see below), and any **icon set** (Lucide substituted, see ICONOGRAPHY).

---

## CONTENT FUNDAMENTALS

**Voice: first person, warm, specific, unshowy.** Paul writes as himself — "I'm Paul Haworth", "I'd love to bring this talk to your group", "my talk for camera clubs". He addresses the reader directly as *you* / *your members*, *your group*, *your club*. Never "we", never a brand voice.

**Story before spec.** Copy leads with the night, not the settings: *"a long drive to a dark corner of the coast, a battle with cloud that broke at just the right moment, a night spent alone on a clifftop waiting for the sky to do something extraordinary."* Then the technique arrives plainly. Field cards invert the ratio (data first) but keep the same plain register.

**Honest, slightly self-deprecating.** "The occasional mishap." "A drive home." "Rather addictive." Nothing is oversold; nothing is hyped with adjectives like *stunning*, *breathtaking*, *epic*. The word that recurs is **tranquility**.

**British English, sentence case, en dashes.** *Colour, tranquility, kit, torch, 45–60 minutes, Northampton – Duston.* Dates are `24 January 2026` — day, month, full year, no ordinals, no commas.

**Casing rules**
- Page and section titles: sentence case in serif ("Four ways into the dark"). Talk titles and posters: ALL CAPS condensed ("CAPTURING LIGHT AT NIGHT").
- Labels, eyebrows, buttons, badges: UPPERCASE, wide-tracked. "DATES FOR 2026", "BOOK THE TALK", "FREE DOWNLOAD".
- Filter chips and body copy: sentence case.
- Place names carry the weight in a listing: **bold place**, light organisation — "**St Neots** Camera Club".

**Imperatives on field cards.** Step titles are instructions: "Switch to manual focus", "Tape the ring", not "Focusing" or "About focus". Bodies are one sentence, and may be blunt: "Autofocus hunts and fails on stars."

**Numbers are data.** Exposure values always appear in mono with their units exactly as a camera shows them: `20s`, `f/2.8`, `ISO 3200`, `20mm`, `−12 nT`, `Kp 6`. Never spelled out, never rounded for prettiness.

**No emoji. Ever.** Not in copy, not in UI, not in social captions. The one ornamental mark in the system is a single amber dot (`Divider variant="star"`).

**Calls to action are modest and personal.** "Get in touch to check availability", "Book me for talks", "Browse the cards", "Watch on YouTube". Never "Buy now", never exclamation marks — except the site's own long-standing "Free stuff!", which is his and stays.

---

## VISUAL FOUNDATIONS

**The idea.** A dark-adapted eye looking up. Everything sits on night violet; light is scarce and always warm, as if from a headtorch. Photography is the loudest thing on any page; the interface gets out of its way.

**Colour.** Five supplied names carry the brand: Russian Violet `#160F47`, Space Cadet `#363162`, Ultra Violet `#4D4C7D`, Orange Peel `#FAA338`, White Smoke `#F5F5F5`. The ramp interpolates between them and adds one deeper tone, `--void-1000 #050418`, for true night surfaces and page ends. Amber is the *only* warm colour: one primary action per view, focus rings, one highlighted value in a readout — never a large fill. Sky accents (aurora green, pale citron, H-alpha pink) exist for status marks and small labels, drawn from real skies. Maximum two background colours per page: canvas violet and one card surface. There are no gradients as decoration — only scrims over photography and one radial `--sky-wash` for hero sections.

**Themes.** `[data-theme="nightvision"]` re-scopes every token to red-on-black for dark-adapted reading; `[data-theme="daylight"]` inverts to White Smoke for print sheets. Both are token scopes, so any component works inside them unchanged.

**Type.** Three voices, no more. Serif display (Cormorant Garamond, regular + italic) for titles, pull quotes and card names — lyrical, high-contrast, the "night sky" voice. Sans (Barlow, 300–700) for everything functional. Condensed caps (Barlow Condensed 600) for posters and talk titles only. Mono (JetBrains Mono, tabular) for exposure data, formulas and card indices. Italic serif carries emotion; italic sans is only used for the poster's biography note. Eyebrow labels are 12px at `0.22em` tracking — the single most recognisable typographic move in the brand, lifted from the palette sheet. Long prose runs at `1.65` line-height, capped at `66ch`. Field cards never go below **20px**.

**Spacing and layout.** 4-based scale (4·8·12·16·24·32·44·64·88·120). Sections breathe: `--gutter-section` 88px on the web, `--gutter-field` 32px inside a card. Content max width 1200px; prose 66ch; card prose 46ch. The website header is centred (roundel above a single uppercase row) — the only centred chrome; page content is otherwise left-aligned. Galleries are masonry columns with mixed portrait/landscape crops. Touch targets: 44px floor, 56px on anything used outdoors, 12px minimum between neighbours.

**Backgrounds.** Full-bleed photography for heroes and gallery tiles, always with a protection gradient under type (`--scrim-bottom`, `--scrim-full`). No repeating patterns, no textures, no illustrated star fields, no fake grain — real photographs or plain violet, nothing in between. Field cards carry no imagery at all.

**Borders, cards and elevation.** Cards are `--surface-card` with a 1px hairline at 14% white and a 10px radius; sheets 16px, controls 6px, images 6px, chips and badges pill. There are no coloured left-border accents. Depth comes from hairlines and dark haze — `--shadow-2` at rest, `--shadow-3` on hover — never a light grey drop shadow, and never an inner bevel. The amber glow (`--glow-amber`, `--glow-amber-soft`) is functional only: focus, hover on a primary action, the active toggle, the star divider.

**Transparency and blur.** Exactly two uses: the site header (`rgba(5,4,24,.72)` + 14px blur, so sky reads through it) and the gallery lightbox (`--scrim` + 10px blur). Everything else is opaque.

**Motion.** Nothing bounces. Fades and 1–2px moves on `--ease-standard` (160ms controls, 260ms surfaces); long `--duration-adjust` 1200ms fades are reserved for hero and lightbox entrances — eyes adapting to the dark. No parallax, no scroll-jacking, no spring easing, no rotation. `prefers-reduced-motion` kills all of it.

**Interaction states.** Hover: primary buttons lighten to `--amber-400` with a soft glow; secondary buttons take a 6% white lift and a stronger border; cards lift 2px into `--shadow-3`; nav links go amber with a 1px amber underline; images do not zoom. Press: 1px downward translate, never a scale-down. Active/selected: 14% amber wash + amber border + amber text. Disabled: 42% opacity, no colour change. Focus: 2px `--amber-400` ring at 2px offset, always visible.

**Imagery character.** Cool-to-neutral night skies (3900K white balance is the house look), deep shadows kept genuinely dark, warm foreground light only where a torch or a town put it. Aurora greens and H-alpha pinks stay saturated; no teal-and-orange grade, no heavy vignette, no added grain, no black-and-white. Silhouettes read as pure black against the sky — that contrast is the brand.

---

## ICONOGRAPHY

No icon set was supplied, and the live site uses only text links plus platform glyphs for YouTube / Instagram / Facebook / email. **Substituted: [Lucide](https://lucide.dev) (2px stroke, rounded caps, 24px grid), loaded per-glyph from `unpkg.com/lucide-static@0.544.0`** — flagged below as a decision to confirm.

- One primitive only: `Icon`, which fetches the named Lucide SVG and inlines it so it inherits `currentColor` like text. Never an `<img>` (uncolourable) and never a hand-drawn SVG.
- Names are Lucide's kebab-case file names. The working set: `moon`, `moon-star`, `cloud-moon`, `sparkles`, `camera`, `aperture`, `flashlight`, `map-pin`, `map`, `compass`, `clock`, `calendar`, `download`, `printer`, `package`, `check`, `plus`, `minus`, `x`, `chevron-left`, `chevron-right`, `chevron-down`, `arrow-right`, `play`, `images`, `users`, `mail`, `youtube`, `instagram`, `facebook`, `shopping-bag`, `lightbulb`, `info`, `triangle-alert`, `mountain`, `star`.
- Sizes: 16 inline with captions, 20 in controls, 24–32 on field cards and section marks. Stroke weight is never changed to fake a heavier icon.
- Icons are always paired with a word, except in toolbars and lightbox chrome where `IconButton` carries an `aria-label`.
- **No emoji as iconography**, and no Unicode dingbats. The only non-alphabetic marks used as marks are the amber dot in `Divider variant="star"` and mathematical characters in formulas (`/`, `x`, `−`).
- The brand mark itself is photographic, not a glyph: `assets/logo-roundel.png`. It is never redrawn, retyped, recoloured or cropped square.

---

## Substitutions to confirm

1. **Fonts.** No binaries were supplied. Barlow stands in for the poster's grotesque, Cormorant Garamond for the palette sheet's high-contrast serif, JetBrains Mono for data. All three load from Google Fonts in `tokens/fonts.css`. **If the real families are licensed (or if the site uses a Squarespace font), send the files and this becomes a one-file change.**
2. **Icons.** Lucide, per above.
3. **Photography.** None supplied. Every image position is an `<image-slot>` awaiting real files.
4. **Field-card content.** The six cards are written in Paul's voice as structural examples. Numbers need his sign-off.

---

## Index

| Path | What it is |
| --- | --- |
| `styles.css` | The one file consumers link. `@import` list only. |
| `tokens/` | `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `elevation.css`, `motion.css`, `base.css` |
| `guidelines/` | 22 specimen cards for the Design System tab: colours, type, spacing, effects, brand |
| `assets/` | `logo-roundel.png`, `brand-night-palette.png`, `poster-capturing-light-at-night.png`, `image-slot.js` |
| `components/` | 25 primitives in six groups (below) |
| `ui_kits/website/` | Click-through recreation of paulhaworthnightscapes.com — see its README |
| `ui_kits/night_cards/` | The downloadable field-card deck — see its README |
| `templates/` | Starting files: night reference card, talk poster |
| `thumbnail.html` | Homepage tile |
| `SKILL.md` | Agent-skill wrapper for use outside this project |

### Components

Reach them as `window.PaulHaworthNightscapesDesignSystem_721589.<Name>`. Each has a sibling `.d.ts` (props) and `.prompt.md` (what & when), and each directory has one `@dsCard` demo page.

- **`components/core/`** — `Button`, `IconButton`, `Icon`, `Badge`, `Tag`, `Card`, `Divider`
- **`components/forms/`** — `Input`, `Select`, `Checkbox`, `Radio`, `Switch`
- **`components/content/`** — `SectionHeading`, `ExposureReadout`, `Callout`, `StepList`, `QuoteBlock`, `ImageFrame`
- **`components/brand/`** — `BrandMark`
- **`components/navigation/`** — `NavBar`, `Tabs`, `SiteFooter`
- **`components/field/`** — `ReferenceCard`, `FormulaBlock`, `NightVisionToggle`

**Intentional additions** (not present in any source, added because the brief requires them):
`ExposureReadout` and `FormulaBlock` — camera data and rules of thumb are the actual content of the field cards; `ReferenceCard` and `NightVisionToggle` — the downloadable-card format and its dark-adapted red mode; `Icon` — a wrapper for the substituted glyph set.
