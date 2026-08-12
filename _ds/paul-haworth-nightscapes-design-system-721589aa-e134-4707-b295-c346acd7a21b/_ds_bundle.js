/* @ds-bundle: {"format":4,"namespace":"PaulHaworthNightscapesDesignSystem_721589","components":[{"name":"BrandMark","sourcePath":"components/brand/BrandMark.jsx"},{"name":"Callout","sourcePath":"components/content/Callout.jsx"},{"name":"ExposureReadout","sourcePath":"components/content/ExposureReadout.jsx"},{"name":"ImageFrame","sourcePath":"components/content/ImageFrame.jsx"},{"name":"QuoteBlock","sourcePath":"components/content/QuoteBlock.jsx"},{"name":"SectionHeading","sourcePath":"components/content/SectionHeading.jsx"},{"name":"StepList","sourcePath":"components/content/StepList.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Divider","sourcePath":"components/core/Divider.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"FormulaBlock","sourcePath":"components/field/FormulaBlock.jsx"},{"name":"NightVisionToggle","sourcePath":"components/field/NightVisionToggle.jsx"},{"name":"ReferenceCard","sourcePath":"components/field/ReferenceCard.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"NavBar","sourcePath":"components/navigation/NavBar.jsx"},{"name":"SiteFooter","sourcePath":"components/navigation/SiteFooter.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"assets/image-slot.js":"fff26d081c8d","components/brand/BrandMark.jsx":"ab1d410626b6","components/content/Callout.jsx":"1e5f6a108931","components/content/ExposureReadout.jsx":"b29d88460b91","components/content/ImageFrame.jsx":"6847d5bd9845","components/content/QuoteBlock.jsx":"a53aa3d0247f","components/content/SectionHeading.jsx":"7d2de240278b","components/content/StepList.jsx":"718a3e5420c8","components/core/Badge.jsx":"40b990630a7b","components/core/Button.jsx":"2f7d8e5d549c","components/core/Card.jsx":"d43f1813ba08","components/core/Divider.jsx":"c1525f8e98eb","components/core/Icon.jsx":"a083415d8b4d","components/core/IconButton.jsx":"268bb331a408","components/core/Tag.jsx":"e47a7ec4193b","components/field/FormulaBlock.jsx":"05cf063ca59d","components/field/NightVisionToggle.jsx":"e4d8a5d0c8b8","components/field/ReferenceCard.jsx":"8a17e4e6631d","components/forms/Checkbox.jsx":"55ad3fde7e0f","components/forms/Input.jsx":"4ce712be06fa","components/forms/Radio.jsx":"7be20731168e","components/forms/Select.jsx":"1988c5fc4de5","components/forms/Switch.jsx":"f00829b56542","components/navigation/NavBar.jsx":"1fc3be86b599","components/navigation/SiteFooter.jsx":"b4c753fa3df7","components/navigation/Tabs.jsx":"00fa989eea5e","ui_kits/night_cards/CardDeck.jsx":"c644a6478538","ui_kits/website/GalleryScreen.jsx":"f5a20da86815","ui_kits/website/HomeScreen.jsx":"599140c02681","ui_kits/website/StoreScreen.jsx":"c9271ae3f822","ui_kits/website/TalksScreen.jsx":"dd0498748ff2"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PaulHaworthNightscapesDesignSystem_721589 = window.PaulHaworthNightscapesDesignSystem_721589 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// assets/image-slot.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).
/* BEGIN USAGE */
/**
 * <image-slot> — user-fillable image placeholder.
 *
 * Drop this into a deck, mockup, or page wherever a design needs an image.
 * You control the slot's shape; it sizes to its container by default. When the search_stock_photos tool
 * is available, prefill the slot by default — write the photo's URL into
 * src (with credit/credit-href); the user can still fill or replace it
 * by dragging an image file onto it (or clicking to browse). The dropped
 * image persists across reloads via a .image-slots.state.json sidecar —
 * same read-via-fetch / write-via-window.omelette pattern as
 * design_canvas.jsx, so the filled slot shows on share links, downloaded
 * zips, and PPTX export. Outside the omelette runtime the slot is read-only.
 *
 * The sidecar is a SIBLING of the HTML file that uses this component: the
 * read is a document-relative fetch, and the host resolves the bridge's
 * sidecar writes into the previewed file's directory to match (same
 * contract as design_canvas.jsx). Pages in the same directory share one
 * sidecar; keep slot ids distinct across them.
 *
 * Attributes:
 *   id           Persistence key. REQUIRED for the drop to survive reload —
 *                every slot on the page needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *                'circle' applies 50% border-radius; on a non-square slot
 *                that's an ellipse — set equal width and height for a true
 *                circle.
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape` — use this for
 *                hexagons, blobs, arbitrary polygons.
 *   fit          Initial framing baseline: cover | contain.   (default 'cover')
 *                cover starts the image filling the frame (overflow cropped);
 *                contain starts it fully visible (letterboxed). Either way the
 *                user can always pan/scale from there — double-click, or the
 *                Edit control, enters reframe mode (drag to move, scroll or
 *                corner-handles to scale; Escape / click-out commits). The
 *                crop persists alongside the image in the sidecar.
 *   placeholder  Empty-state caption.                      (default 'Drop an image')
 *   src          Optional initial/fallback image URL. Prefill it with a real
 *                photo via search_stock_photos when that tool is available
 *                (set credit/credit-href from the result). A user drop
 *                overrides it; clearing the drop reveals src again.
 *   credit       Attribution text shown as a small overlay at the
 *                bottom-left of the filled slot. REQUIRED whenever src
 *                points at any Unsplash host (images.unsplash.com,
 *                plus.unsplash.com, …): an Unsplash src with no credit
 *                renders an error tile INSTEAD of the photo (Unsplash
 *                terms forbid showing their photos unattributed). Use the
 *                exact form 'Photo by {photographer name} on Unsplash' —
 *                the overlay then links the name to credit-href and
 *                'Unsplash' to the Unsplash homepage, and links back to
 *                unsplash.com automatically get the required utm referral
 *                params appended at render time. The credit belongs to
 *                the src image, so it only shows while src is what's
 *                displayed — a user-dropped image hides it.
 *   credit-href  Link for the photographer's name in the credit overlay
 *                (their Unsplash profile URL from the stock-photo search
 *                results). http(s) URLs only — anything else renders the
 *                name as plain text.
 *
 * Sizing: the slot fills its container by default (width/height 100%).
 * Put it in a sized wrapper — absolutely positioned, a grid cell, a fixed
 * frame — and it takes exactly that box. When the parent's height is
 * indefinite (ordinary flow), it falls back to full width at a 3:2 aspect
 * ratio instead of collapsing. In a shrink-to-fit parent (a float,
 * width:max-content, an unsized absolute wrapper), percentages have
 * nothing to resolve against — size the slot or its wrapper explicitly
 * there. For a fixed-size slot, set
 * width/height on the element itself (inline style), which overrides the
 * default. When
 * layering content above a slot (full-bleed layouts), make the overlay
 * click-through — pointer-events: none on scrims/text plates, re-enabled
 * on interactive children — so the slot's hover controls stay reachable.
 * Keep the slot's bottom-left corner visually clear as well: the credit
 * overlay renders there, and a dark fade or text plate covering it hides
 * the attribution Unsplash's terms require — end the fade above that
 * corner, or keep it nearly transparent where the credit sits.
 *
 * Usage:
 *   <div style="position:relative;width:100%;height:100%">      <!-- full-bleed: -->
 *     <image-slot id="bg" shape="rect"></image-slot>            <!-- fills the wrapper -->
 *   </div>
 *   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
 *               placeholder="Drop a hero image"></image-slot>
 *   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
 *   <image-slot id="kite"   style="width:300px;height:300px"
 *               mask="polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"></image-slot>
 */
/* END USAGE */

(() => {
  const STATE_FILE = '.image-slots.state.json';

  // Unsplash terms require visible attribution wherever their photos
  // display, and every link back to unsplash.com must carry utm referral
  // params. Two render-time rules enforce that here:
  //  - an Unsplash-src slot with NO credit attribute renders an error
  //    tile INSTEAD of the photo (an uncredited Unsplash photo on screen
  //    is itself the terms violation, so it never renders bare);
  //  - rendered credit links pointing at unsplash.com get the referral
  //    params appended when absent (credit-href values live in page
  //    content that can't be edited after the fact).
  // Keep the utm_source value in sync with UTM_SOURCE in
  // platform/web-agent/unsplash.ts — this file is a project-local
  // artifact and cannot import it (equality is pinned by tests).
  const UNSPLASH_HOMEPAGE_HREF = 'https://unsplash.com/?utm_source=claude_design&utm_medium=referral';
  // Host rule mirrors the hotlink validator that admits Unsplash srcs into
  // pages in the first place (cdn$ in unsplash.ts: apex or any subdomain)
  // — Unsplash+ results serve from plus.unsplash.com, not just images.*,
  // and an admitted-but-uncredited photo must error whatever unsplash
  // host it rides on.
  // Trailing-dot FQDNs (images.unsplash.com.) are the same host to the
  // browser but would miss the regex — strip one dot so the check fails
  // CLOSED (unrecognized-but-real Unsplash srcs must error, not render).
  const isUnsplashHost = u => {
    try {
      return /(^|\.)unsplash\.com$/.test(new URL(u, document.baseURI).hostname.replace(/\.$/, ''));
    } catch {
      return false;
    }
  };
  // Render-time referral normalization for links back to Unsplash:
  // appends utm_source/utm_medium when absent, preserves every existing
  // query param, never overwrites an existing utm_source, and passes
  // non-Unsplash URLs through untouched. Input is an ABSOLUTE validated
  // http(s) URL (the credit render funnel resolves + validates first).
  const withReferral = href => {
    try {
      const u = new URL(href);
      if (!/(^|\.)unsplash\.com$/.test(u.hostname.replace(/\.$/, ''))) {
        return href;
      }
      if (!u.searchParams.has('utm_source')) {
        u.searchParams.set('utm_source', 'claude_design');
      }
      if (!u.searchParams.has('utm_medium')) {
        u.searchParams.set('utm_medium', 'referral');
      }
      return u.toString();
    } catch (e) {
      return href;
    }
  };
  // 2× a ~600px slot in a 1920-wide deck — retina-sharp without making the
  // sidecar enormous. A 1200px WebP at q=0.85 is ~150-300KB.
  const MAX_DIM = 1200;
  // Raster formats only. SVG is excluded (can carry script; createImageBitmap
  // on SVG blobs is inconsistent). GIF is excluded because the canvas
  // re-encode keeps only the first frame, so an animated GIF would silently
  // go still — better to reject than surprise.
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

  // ── Shared sidecar store ────────────────────────────────────────────────
  // One fetch + immediate write-on-change for every <image-slot> on the
  // page. Reads via fetch() so viewing works anywhere the HTML and sidecar
  // are served together; writes go through window.omelette.writeFile, which
  // the host allowlists to *.state.json basenames only.
  const subs = new Set();
  let slots = {};
  // ids explicitly cleared before the sidecar fetch resolved — otherwise
  // the merge below can't tell "never set" from "just deleted" and would
  // resurrect the sidecar's stale value.
  const tombstones = new Set();
  let loaded = false;
  let loadP = null;
  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE).then(r => r.ok ? r.json() : null).then(j => {
      // Merge: sidecar loses to any in-memory change that raced ahead of
      // the fetch (drop or clear) so neither is clobbered by hydration.
      if (j && typeof j === 'object') {
        const merged = Object.assign({}, j, slots);
        // A framing-only write that raced ahead of hydration must not
        // drop a user image that's only on disk — inherit u from the
        // sidecar for any in-memory entry that lacks one.
        for (const k in slots) {
          if (merged[k] && !merged[k].u && j[k]) {
            merged[k].u = typeof j[k] === 'string' ? j[k] : j[k].u;
          }
        }
        for (const id of tombstones) delete merged[id];
        slots = merged;
      }
      tombstones.clear();
    }).catch(() => {}).then(() => {
      loaded = true;
      subs.forEach(fn => fn());
    });
    return loadP;
  }

  // Serialize writes so two near-simultaneous drops on different slots
  // can't reorder at the backend and leave the sidecar with only the
  // first. A save requested mid-flight just marks dirty and re-fires on
  // completion with the then-current slots.
  let saving = false;
  let saveDirty = false;
  // Unload-time flush: save()'s serialization defers a mid-RTT re-fire to a
  // .then that never runs in an unloading document, silently dropping a
  // pagehide commit. Post the current slots immediately instead — content
  // is a superset snapshot of any in-flight save's, the write is a
  // whole-file last-writer-wins replace, and postMessage FIFO delivers it
  // to the host after the in-flight one, so a backend-side reorder at
  // worst reproduces the dropped-commit outcome this flush improves on.
  // Guarded on the initial sidecar read: pre-hydration slots can miss
  // other slots' persisted entries, and flushing it would clobber them —
  // that narrow case stays best-effort (the in-memory merge in load()
  // cannot happen in an unloading document anyway).
  function flushNow() {
    if (!loaded) return;
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    try {
      Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {});
    } catch (e) {}
  }
  function save() {
    if (saving) {
      saveDirty = true;
      return;
    }
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    saving = true;
    Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {}).then(() => {
      saving = false;
      if (saveDirty) {
        saveDirty = false;
        save();
      }
    });
  }
  const S_MAX = 5;
  const clampS = s => Math.max(1, Math.min(S_MAX, s));

  // Normalize a stored slot value. Pre-reframe sidecars stored a bare
  // data-URL string; newer ones store {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? {
      u: v,
      s: 1,
      x: 0,
      y: 0
    } : v;
  }
  function setSlot(id, val) {
    if (!id) return;
    if (val) {
      slots[id] = val;
      tombstones.delete(id);
    } else {
      delete slots[id];
      if (!loaded) tombstones.add(id);
    }
    subs.forEach(fn => fn());
    // A drop is rare + high-value — write immediately so nav-away can't lose
    // it. Gate on the initial read so we don't overwrite a sidecar we haven't
    // merged yet; the merge in load() keeps this change once the read lands.
    if (loaded) save();else load().then(save);
  }

  // ── Image downscale ─────────────────────────────────────────────────────
  // Encode through a canvas so the sidecar carries resized bytes, not the
  // raw upload. Longest side is capped at 2× the slot's rendered width
  // (retina) and at MAX_DIM. WebP keeps alpha and is ~10× smaller than PNG
  // for photos, so there's no need for per-image format picking.
  async function toDataUrl(file, targetW) {
    const bitmap = await createImageBitmap(file);
    try {
      const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
      const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL('image/webp', 0.85);
    } finally {
      bitmap.close && bitmap.close();
    }
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet =
  // Fill the container by default: slots are usually placed inside a
  // sized wrapper (a hero frame, a grid cell, an inset:0 layer) and are
  // expected to take that box — a fixed intrinsic size would render as
  // a small tile in the corner of a full-bleed wrapper instead.
  // aspect-ratio is the companion fallback that keeps a bare slot
  // visible when the parent's height is indefinite: height:100%
  // resolves to auto there, and the ratio then derives height from
  // width instead of letting the slot collapse to zero height.
  // Explicit width/height on the element override all of this.
  // color:inherit (not a fixed near-black): the placeholder chrome —
  // empty-state icon/caption (currentColor) and the dashed ring — must
  // read on dark decks too, and the slide's own text color is the one
  // color guaranteed to contrast with the slide background. The soft
  // look comes from opacity on those parts, not from a baked-in alpha.
  ':host{display:block;position:relative;' + '  font:13px/1.3 system-ui,-apple-system,sans-serif;' + '  width:100%;height:100%;aspect-ratio:3/2}' + '.empty .cap,.empty .sub{opacity:.75}' + '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(127,127,127,.08)}' +
  // .frame img (clipped) and .spill (unclipped ghost + handles) share the
  // same left/top/width/height in frame-%, computed by _applyView(), so the
  // inside-mask crop and the outside-mask spill stay pixel-aligned.
  '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' + '  -webkit-user-drag:none;user-select:none;touch-action:none}' +
  // Reframe mode (double-click): the full image spills past the mask. The
  // spill layer is sized to the IMAGE bounds so its corners are where the
  // resize handles belong. The ghost <img> inside is translucent; the real
  // clipped <img> underneath shows the opaque in-mask crop.
  // popover=manual promotes the spill to the top layer on reframe, so it is
  // not clipped by any overflow:hidden / clip-path / scroll-container
  // ancestor (a plain z-index can't escape overflow clipping). UA popover
  // defaults (inset:0;margin:auto) are reset; _applyView sets viewport px.
  '.spill{position:fixed;margin:0;inset:auto;border:0;padding:0;background:transparent;' + '  overflow:visible;transform:translate(-50%,-50%);z-index:1;cursor:grab;touch-action:none}' + ':host([data-panning]) .spill{cursor:grabbing}' + '.spill .ghost{position:absolute;inset:0;width:100%;height:100%;opacity:.35;' + '  pointer-events:none;-webkit-user-drag:none;user-select:none;' + '  box-shadow:0 0 0 1px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.2)}' + '.spill .handle{position:absolute;width:12px;height:12px;border-radius:50%;' + '  background:#fff;box-shadow:0 0 0 1.5px #c96442,0 1px 3px rgba(0,0,0,.3);' + '  transform:translate(-50%,-50%)}' + '.spill .handle[data-c=nw]{left:0;top:0;cursor:nwse-resize}' + '.spill .handle[data-c=ne]{left:100%;top:0;cursor:nesw-resize}' + '.spill .handle[data-c=sw]{left:0;top:100%;cursor:nesw-resize}' + '.spill .handle[data-c=se]{left:100%;top:100%;cursor:nwse-resize}' + ':host([data-reframe]){z-index:10}' + ':host([data-reframe]) .frame{box-shadow:0 0 0 2px #c96442}' + '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  cursor:pointer;user-select:none}' + '.empty svg{opacity:.45}' + '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' + '.empty .sub{font-size:11px}' + '.empty .sub u{text-underline-offset:2px}' + '.empty:hover .sub{opacity:1}' + ':host([data-over]) .frame{outline:2px solid #c96442;outline-offset:-2px;' + '  background:rgba(201,100,66,.10)}' + '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed currentColor;' + '  opacity:.35;transition:border-color .12s,opacity .12s}' + ':host([data-over]) .ring{border-color:#c96442;opacity:1}' + ':host([data-filled]) .ring{display:none}' +
  // Controls overlay INSIDE the frame, pinned to the top-right corner, so
  // a full-bleed slot in an overflow:hidden container still shows them
  // (the old below-mask placement got clipped). Credit sits bottom-left,
  // so top-right avoids collision. The blurred pill background keeps them
  // legible over the image.
  // The UA [popover] base rule styles the element in EVERY state (only
  // display:none is gated on :not(:popover-open), and the display:flex
  // below overrides that) — so the UA resets live HERE, like .spill's,
  // or the ordinary hover-state strip renders as a bordered Canvas box
  // centered by margin:auto. inset:auto precedes top/right (shorthand).
  '.ctl{position:absolute;inset:auto;top:8px;right:8px;margin:0;border:0;padding:0;' + '  background:transparent;overflow:visible;' + '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;' + '  white-space:nowrap}' +
  // While reframing, the spill owns the top layer and would swallow every
  // click on the in-frame controls. Promoting .ctl into the top layer
  // ABOVE the spill (shown after it — later popovers stack higher) keeps
  // Edit-as-toggle and Replace clickable mid-reframe. _applyView pins it
  // to the frame's top-right in viewport px (translateX(-100%)
  // right-aligns against the computed left edge); inset:auto clears the
  // base rule's top/right so the inline left/top position it alone.
  '.ctl:popover-open{position:fixed;inset:auto;transform:translateX(-100%)}' + ':host([data-filled][data-editable]:hover) .ctl,:host([data-reframe]) .ctl' + '  {opacity:1;pointer-events:auto}' + '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' + '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;' + '  backdrop-filter:blur(6px)}' + '.ctl button:hover{background:rgba(0,0,0,.8)}' + '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' + '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none}' +
  // Replacement in flight: after a src swap the browser keeps painting
  // the PREVIOUS image until the new one decodes, so a Replace would
  // flash the old photo and then pop. Hide the stale frame (visibility,
  // not display — _applyView geometry still applies) and spin until the
  // new image reports in (load/error clears data-swapping).
  ':host([data-swapping]) .frame img{visibility:hidden}' + '.loading{position:absolute;inset:0;display:none;align-items:center;' + '  justify-content:center;pointer-events:none}' + ':host([data-swapping]) .loading{display:flex}' + '.loading::after{content:"";width:22px;height:22px;border-radius:50%;' + '  border:2px solid rgba(127,127,127,.25);border-top-color:currentColor;' + '  animation:om-slot-spin .7s linear infinite}' + '@keyframes om-slot-spin{to{transform:rotate(360deg)}}' +
  // Reduced motion: the static two-tone ring still reads as "working".
  '@media (prefers-reduced-motion:reduce){.loading::after{animation:none}}' + '.credit{position:absolute;left:6px;bottom:6px;max-width:calc(100% - 12px);display:none;' + '  padding:3px 7px;border-radius:5px;background:rgba(0,0,0,.55);color:#fff;' + '  font:10px/1.2 system-ui,-apple-system,sans-serif;text-decoration:none;' + '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(6px)}' +
  // The credit is a SPAN holding one or two <a>s (Unsplash's prescribed
  // form links the photographer AND Unsplash) — anchors style inline so
  // the overlay reads as one line of text.
  '.credit a{color:inherit;text-decoration:none}' + '.credit a:hover,.credit a:focus-visible{text-decoration:underline}' + ':host([data-filled][data-credit]) .credit{display:block}' +
  // Exports must ship JUST the image — no hover controls, no credit chip
  // (the host marks <html data-om-exporting> for the capture window; the
  // page-level hide script can't reach shadow DOM, this rule can).
  ':host-context([data-om-exporting]) .ctl,' + ':host-context([data-om-exporting]) .credit{display:none !important}' +
  // Print must ship just the image too: the hover-gated controls can be
  // mid-hover when print() fires, and the credit chip is screen chrome —
  // the same rule the capture window gets, keyed on print media instead
  // of the host's data-om-exporting mark (the print path sets no mark).
  '@media print{.ctl,.credit{display:none !important}}' +
  // No export-window mask rules here on purpose: the export capture
  // releases the replacement mask by REMOVING data-swapping (the
  // shadow-root pass in pages/export/shared.ts HIDE_EXPORT_CHROME_SCRIPT)
  // — attribute removal works in every engine (:host-context is
  // Chromium-only), is scoped by construction to slots actually
  // mid-swap, and hides the spinner through the same gate. A masked img
  // would otherwise be silently dropped from PPTX decks (the capture
  // walk skips visibility:hidden imgs).
  // Attribution error tile: REPLACES the photo when an Unsplash src has
  // no credit attribute — rendering the photo uncredited is the terms
  // violation, so the photo must not appear at all.
  // Calm and neutral on purpose (review feedback): the tile informs the
  // user; the fix instructions are machine-facing (usage docblock, tool
  // description, and the turn-end scan's bounce copy name the attributes
  // for the agent).
  '.attr-error{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  background:#f2f1ef;color:#6e6c66;user-select:none;' + '  font:13px/1.45 system-ui,-apple-system,sans-serif}' + '.attr-error svg{opacity:.55}' + '.attr-error .cap{max-width:92%;font-weight:500;letter-spacing:.01em}' + ':host([data-attribution-error]) .attr-error{display:flex}' + ':host([data-attribution-error]) .ring{display:none}';
  const icon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' + '<path d="m21 15-5-5L5 21"/></svg>';
  const warnIcon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>' + '<path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'placeholder', 'src', 'id', 'credit', 'credit-href'];
    }

    /** Duplicate-slide hook (called by deck-stage, see its
     *  _remintDuplicateIds): copy this id's stored image, if any, under a
     *  freshly minted key and return that key — so a duplicated slide's
     *  slot keeps its dropped photo instead of reverting to the
     *  placeholder. 'isFree' is the caller's uniqueness check (document
     *  ids); candidates must ALSO be unused in the sidecar, which can
     *  hold keys from other pages sharing the project root. (An EMPTY
     *  slot on another page leaves no sidecar entry, so its id is not
     *  detectable here — a minted key can collide with it and that slot
     *  would show this photo. Same blast radius as two pages reusing an
     *  id by hand, which the shared sidecar already permits.) Returns null
     *  when no id could be minted (caller strips the id, today's
     *  behavior). */
    static cloneSlot(fromId, isFree) {
      if (typeof fromId !== 'string' || !fromId) return null;
      // Pre-hydration the store can't veto candidates or source the copy
      // — degrade to the strip (today's behavior) rather than mint
      // against keys we can't see yet. Any rendered (= droppable) slot
      // means load() has already settled.
      if (!loaded) return null;
      const stem = fromId.replace(/-\d+$/, '') || fromId;
      for (let n = 2; n < 100; n++) {
        const toId = stem + '-' + n;
        if (toId === fromId) continue;
        if (slots[toId] !== undefined) {
          // Reuse a key holding this exact value (bytes AND crop) if no
          // live element here owns it — a duplicate op the host refused
          // after minting leaves such a key behind, and reusing keeps
          // refused retries from accumulating one orphaned copy per
          // attempt. Full equality (not just bytes) so a byte-identical
          // key another PAGE owns with its own crop is stepped past, not
          // adopted or rewritten. (Entries without .u never match.)
          const prev = getSlot(toId);
          const cur = getSlot(fromId);
          if (!(prev && cur && prev.u && prev.u === cur.u && prev.s === cur.s && prev.x === cur.x && prev.y === cur.y && (typeof isFree !== 'function' || isFree(toId)))) continue;
          return toId;
        }
        if (typeof isFree === 'function' && !isFree(toId)) continue;
        const v = getSlot(fromId);
        if (v) setSlot(toId, Object.assign({}, v));
        return toId;
      }
      return null;
    }
    constructor() {
      super();
      // clonable: rail thumbnails deep-clone slides and carry this shadow
      // along; reuse an already-cloned root so upgrade-after-clone works.
      // (Deliberately NOT serializable — a getHTML consumer would embed
      // multi-MB sidecar data-URLs into serialized page HTML.)
      const root = this.shadowRoot || this.attachShadow({
        mode: 'open',
        clonable: true
      });
      // .spill and .ctl sit OUTSIDE .frame so overflow:hidden + border-radius
      // on the frame (circle, pill, rounded) can't clip them.
      root.innerHTML = '<style>' + stylesheet + '</style>' + '<div class="frame" part="frame">' + '  <img part="image" alt="" draggable="false" style="display:none">' + '  <div class="empty" part="empty">' + icon + '    <div class="cap"></div>' + '    <div class="sub">or <u>browse files</u></div></div>' + '  <div class="attr-error" part="attribution-error">' + warnIcon + '    <div class="cap">This photo needs attribution</div></div>' + '  <div class="loading" part="loading"></div>' + '  <div class="ring" part="ring"></div>' + '</div>' +
      // Outside .frame, like .spill/.ctl — the frame's overflow:hidden +
      // border-radius/clip-path would cut the credit off on circle/pill/mask.
      // A SPAN, not an <a>: the prescribed Unsplash credit holds two links
      // (photographer + Unsplash), built per-render in _render().
      '<span class="credit" part="credit"></span>' + '<div class="spill" popover="manual" data-dc-edit-transparent>' + '  <img class="ghost" alt="" draggable="false">' + '  <div class="handle" data-c="nw"></div><div class="handle" data-c="ne"></div>' + '  <div class="handle" data-c="sw"></div><div class="handle" data-c="se"></div>' + '</div>' +
      // data-dc-edit-transparent: the DC editor's edit-mode picker lets
      // clicks through for chrome marked with it (EDIT_TRANSPARENT_SEL)
      // — without it, Replace/Edit clicks in Edit mode are swallowed by
      // element selection and the controls look dead.
      '<div class="ctl" popover="manual" data-dc-edit-transparent><button data-act="replace" title="Replace image">Replace</button>' + '  <button data-act="edit" title="Reframe image">Edit</button></div>' + '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._sub = root.querySelector('.sub');
      this._spill = root.querySelector('.spill');
      this._ctl = root.querySelector('.ctl');
      this._credit = root.querySelector('.credit');
      this._attrError = root.querySelector('.attr-error');
      // Credit clicks open the link, not browse/reframe.
      this._credit.addEventListener('click', e => e.stopPropagation());
      this._credit.addEventListener('dblclick', e => e.stopPropagation());
      this._ghost = root.querySelector('.ghost');
      this._err = null;
      this._input = root.querySelector('input');
      this._depth = 0;
      this._gen = 0;
      // Encode-in-flight marker (the owning _ingest generation): while set,
      // the same-src "nothing in flight" clear in _render must not fire —
      // the stored value still points at the OLD image until the encode
      // lands, so that clear would unmask the stale image mid-replace.
      this._swapGen = 0;
      // Render-owned swap in flight: set when _render assigns a new src,
      // cleared only by the img's own load/error (or the empty branch).
      // img.complete CANNOT stand in for this — setting src only QUEUES
      // the current-request swap (a microtask), so synchronously after an
      // assignment, complete still reports the OLD settled request. The
      // pick path does exactly that: the host sets src, credit, and
      // credit-href back-to-back in one task, and renders #2/#3 would
      // read the stale complete === true and drop the mask one render
      // after it was set.
      this._loadPending = false;
      // See _render's empty branch: a transient attribution-error wipe of a
      // showing image must make the follow-up render a replacement (spinner),
      // not a first fill (blank frame).
      this._hidShowing = false;
      this._view = {
        s: 1,
        x: 0,
        y: 0
      };
      this._subFn = () => this._render();
      // Shadow-DOM listeners live with the shadow DOM — bound once here so
      // disconnect/reconnect (e.g. React remount) doesn't stack handlers.
      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (!act) return;
        // The hidden controls are opacity-0 but still tabbable — without
        // this gate a keyboard user could drive them on a read-only share
        // link (mirrors the dblclick handler's editable gate).
        if (!this.hasAttribute('data-editable')) return;
        if (act === 'replace') {
          this._exitReframe(true);
          // Host-owned picker (Unsplash modal; it also offers local import).
          this.dispatchEvent(new CustomEvent('image-slot:pick', {
            bubbles: true,
            composed: true,
            detail: {
              id: this.id || null
            }
          }));
        }
        if (act === 'edit') {
          if (!this._reframes()) return;
          if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
        }
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      // load/error also release the replacement-in-flight mask (via the
      // single discipline in _releaseMask): the swap is only revealed once
      // the new image can actually paint (on error the frame shows its
      // background, same as a fresh slot with a broken src).
      this._img.addEventListener('load', () => {
        this._loadPending = false;
        this._releaseMask(true);
        this._applyView();
      });
      this._img.addEventListener('error', () => {
        this._loadPending = false;
        this._releaseMask(true);
      });
      // Gated only on editable — any filled slot can be repositioned/scaled,
      // regardless of fit. Share links (no writeFile) stay static.
      this.addEventListener('dblclick', e => {
        if (!this.hasAttribute('data-editable') || !this._reframes()) return;
        e.preventDefault();
        if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
      });
      // Pan + resize both originate on the spill layer. A handle pointerdown
      // drives an aspect-locked resize anchored at the opposite corner; any
      // other pointerdown on the spill pans. Offsets are frame-% so a
      // reframed slot survives responsive resize / PPTX export.
      this._spill.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        e.stopPropagation();
        this._spill.setPointerCapture(e.pointerId);
        const rect = this.getBoundingClientRect();
        const fw = rect.width || 1,
          fh = rect.height || 1;
        const corner = e.target.getAttribute && e.target.getAttribute('data-c');
        let move;
        if (corner) {
          // Resize about the OPPOSITE corner. Viewport-px throughout (rect
          // fw/fh, not clientWidth) so the math survives a transform:scale()
          // ancestor — deck_stage renders slides scaled-to-fit.
          const iw = this._img.naturalWidth || 1,
            ih = this._img.naturalHeight || 1;
          const contain = (this.getAttribute('fit') || 'cover').toLowerCase() === 'contain';
          const base = contain ? Math.min(fw / iw, fh / ih) : Math.max(fw / iw, fh / ih);
          const sx = corner.includes('e') ? 1 : -1;
          const sy = corner.includes('s') ? 1 : -1;
          const s0 = this._view.s;
          const w0 = iw * base * s0,
            h0 = ih * base * s0;
          const cx0 = (50 + this._view.x) / 100 * fw;
          const cy0 = (50 + this._view.y) / 100 * fh;
          const ox = cx0 - sx * w0 / 2,
            oy = cy0 - sy * h0 / 2;
          const diag0 = Math.hypot(w0, h0);
          const ux = sx * w0 / diag0,
            uy = sy * h0 / diag0;
          move = ev => {
            const proj = (ev.clientX - rect.left - ox) * ux + (ev.clientY - rect.top - oy) * uy;
            const s = clampS(s0 * proj / diag0);
            const d = diag0 * s / s0;
            this._view.s = s;
            this._view.x = (ox + ux * d / 2) / fw * 100 - 50;
            this._view.y = (oy + uy * d / 2) / fh * 100 - 50;
            this._clampView();
            this._applyView();
          };
        } else {
          this.setAttribute('data-panning', '');
          const start = {
            px: e.clientX,
            py: e.clientY,
            x: this._view.x,
            y: this._view.y
          };
          move = ev => {
            this._view.x = start.x + (ev.clientX - start.px) / fw * 100;
            this._view.y = start.y + (ev.clientY - start.py) / fh * 100;
            this._clampView();
            this._applyView();
          };
        }
        const up = () => {
          try {
            this._spill.releasePointerCapture(e.pointerId);
          } catch {}
          this._spill.removeEventListener('pointermove', move);
          this._spill.removeEventListener('pointerup', up);
          this._spill.removeEventListener('pointercancel', up);
          this.removeAttribute('data-panning');
          this._dragUp = null;
        };
        // Stashed so _exitReframe (Escape / outside-click mid-drag) can
        // tear the capture + listeners down synchronously.
        this._dragUp = up;
        this._spill.addEventListener('pointermove', move);
        this._spill.addEventListener('pointerup', up);
        this._spill.addEventListener('pointercancel', up);
      });
      // Wheel zoom stays available inside reframe mode as a trackpad nicety —
      // zooms toward the cursor (offset' = cursor·(1-k) + offset·k).
      this.addEventListener('wheel', e => {
        if (!this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        const r = this.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width * 100 - 50;
        const cy = (e.clientY - r.top) / r.height * 100 - 50;
        const prev = this._view.s;
        const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
        if (next === prev) return;
        const k = next / prev;
        this._view.s = next;
        this._view.x = cx * (1 - k) + this._view.x * k;
        this._view.y = cy * (1 - k) + this._view.y * k;
        this._clampView();
        this._applyView();
      }, {
        passive: false
      });
    }
    connectedCallback() {
      // Warn once per page — an id-less slot works for the session but
      // cannot persist, and two id-less slots would share nothing.
      if (!this.id && !ImageSlot._warned) {
        ImageSlot._warned = true;
        console.warn('<image-slot> without an id will not persist its dropped image.');
      }
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      subs.add(this._subFn);
      // The host may inject window.omelette.writeFile AFTER the first render;
      // re-render on hover so the editable-gated controls reliably appear.
      this.addEventListener('pointerenter', this._subFn);
      // width%/height% in _applyView encode the frame aspect at call time —
      // a host resize (responsive grid, pane divider) would stretch the
      // image until the next _render. Re-render on size change: _render()
      // re-seeds _view from stored before clamp/apply, so a shrink→grow
      // cycle round-trips instead of ratcheting x/y toward the narrower
      // frame's clamp range.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }
    disconnectedCallback() {
      subs.delete(this._subFn);
      this.removeEventListener('pointerenter', this._subFn);
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      // commit=false: a disconnect is not a user intent — committing here
      // would persist whatever half-finished drag a React remount or DOM
      // splice happened to interrupt. Deliberate exits commit on their own
      // paths (Escape/click-out/toggle), and unloads commit via pagehide.
      this._exitReframe(false);
    }
    _enterReframe() {
      if (this.hasAttribute('data-reframe')) return;
      this.setAttribute('data-reframe', '');
      this._signalReframe(true);
      // Best-effort commit when the document unloads mid-reframe (a host
      // navigation racing the enter signal, a manual reload, tab close):
      // the sidecar write rides the host bridge, which outlives this
      // document, so the crop survives even though the mode dies with the
      // DOM. Held on the instance so _exitReframe detaches exactly what
      // was attached.
      this._pagehide = () => {
        this._exitReframe(true);
        flushNow();
      };
      window.addEventListener('pagehide', this._pagehide);
      // Promote spill to the top layer, then keep it pinned over the frame:
      // scroll/resize cover the common cases, and a per-frame rect check
      // catches layout shifts that fire neither (an image above finishing
      // load, streamed DOM pushing the slot down, an ancestor transform
      // change) so the overlay can't detach from the frame.
      try {
        this._spill.showPopover();
      } catch {}
      // After the spill, so the controls stack above it in the top layer.
      try {
        this._ctl.showPopover();
      } catch {}
      this._reposition = () => {
        if (this.hasAttribute('data-reframe')) this._applyView();
      };
      window.addEventListener('scroll', this._reposition, true);
      window.addEventListener('resize', this._reposition);
      this._lastRect = '';
      this._watch = () => {
        if (!this.hasAttribute('data-reframe')) return;
        const r = this.getBoundingClientRect();
        const key = r.left + ',' + r.top + ',' + r.width + ',' + r.height;
        if (key !== this._lastRect) {
          this._lastRect = key;
          this._applyView();
        }
        this._watchId = requestAnimationFrame(this._watch);
      };
      this._watchId = requestAnimationFrame(this._watch);
      this._applyView();
      // Close on click outside (the spill handler stopPropagation()s so
      // in-image drags don't reach this) and on Escape. Listeners are held
      // on the instance so _exitReframe / disconnectedCallback can detach
      // exactly what was attached.
      this._outside = e => {
        if (e.composedPath && e.composedPath().includes(this)) return;
        this._exitReframe(true);
      };
      this._esc = e => {
        if (e.key === 'Escape') this._exitReframe(true);
      };
      document.addEventListener('pointerdown', this._outside, true);
      document.addEventListener('keydown', this._esc, true);
    }
    _exitReframe(commit) {
      if (!this.hasAttribute('data-reframe')) return;
      if (this._dragUp) this._dragUp();
      this.removeAttribute('data-reframe');
      this.removeAttribute('data-panning');
      if (this._outside) document.removeEventListener('pointerdown', this._outside, true);
      if (this._esc) document.removeEventListener('keydown', this._esc, true);
      this._outside = this._esc = null;
      if (this._reposition) {
        window.removeEventListener('scroll', this._reposition, true);
        window.removeEventListener('resize', this._reposition);
        this._reposition = null;
      }
      if (this._watchId) {
        cancelAnimationFrame(this._watchId);
        this._watchId = 0;
      }
      if (this._pagehide) {
        window.removeEventListener('pagehide', this._pagehide);
        this._pagehide = null;
      }
      try {
        this._spill.hidePopover();
      } catch {}
      try {
        this._ctl.hidePopover();
      } catch {}
      this._ctl.style.left = '';
      this._ctl.style.top = '';
      if (commit) this._commitView();
      this._signalReframe(false);
    }

    // Reframe state lives only in this DOM until commit, invisible to the
    // host's dirty signals — announce enter/exit so the host can hold
    // auto-reloads for exactly the gesture (the guest bundle forwards
    // image-slot:reframe to the host as imageSlotReframe). Dispatched on
    // the element (composed, so it escapes shadow roots) while connected;
    // a disconnected exit (disconnectedCallback) falls back to document so
    // the host still hears it.
    _signalReframe(active) {
      const target = this.isConnected ? this : document;
      target.dispatchEvent(new CustomEvent('image-slot:reframe', {
        bubbles: true,
        composed: true,
        detail: {
          active: active,
          id: this.id || null
        }
      }));
    }

    // Public: host's "Import from computer" calls this to run local browse.
    openFilePicker() {
      this._exitReframe(true);
      this._input.click();
    }

    // A src write is a newer intent for this slot's content — the host
    // pick path (setImageSlotImage) or an agent edit — so it must win
    // over any encode still in flight from an earlier drop: left live,
    // that encode lands later, passes _ingest's gen guard, and its
    // setSlot silently overwrites the pick (the stored value shadows
    // src in _render). Bumping _gen kills the encode before its own
    // _swapGen clear runs, so clear the dead claim here too — otherwise
    // _releaseMask (gated on !_swapGen) never fires and the pick's
    // spinner is stranded. src ONLY: the pick sets credit/credit-href
    // in the same task, and clearing _swapGen on those would let the
    // same-src branch unmask the old image mid-encode.
    attributeChangedCallback(name, oldVal, newVal) {
      if (name === 'src' && oldVal !== newVal) {
        this._gen++;
        this._swapGen = 0;
      }
      if (this.shadowRoot) this._render();
    }

    // handleEvent — one listener object for all four drag events keeps the
    // add/remove symmetric and the depth counter correct.
    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        // Without preventDefault the browser never fires 'drop'.
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        // dragenter/leave fire for every descendant crossing — count depth
        // so hovering the icon inside the empty state doesn't flicker.
        if (--this._depth <= 0) {
          this._depth = 0;
          this.removeAttribute('data-over');
        }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
    async _ingest(file) {
      this._setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      // toDataUrl can take hundreds of ms on a large photo. A Clear or a
      // newer drop during that window would be clobbered when this await
      // resumes — bump + capture a generation so stale encodes bail.
      const gen = ++this._gen;
      // Replacing a shown image: surface the swap through the encode too,
      // not just the decode — otherwise the old photo sits there with no
      // feedback while the canvas re-encode runs. An empty slot keeps its
      // placeholder (no spinner) until the encode lands, as before.
      // _swapGen guards the mask against re-renders DURING the encode
      // (pointerenter, ResizeObserver, another slot's store write): the
      // stored value still resolves to the old image there, so _render's
      // same-src clear would otherwise unmask it mid-replace.
      if (this.hasAttribute('data-filled')) {
        this.setAttribute('data-swapping', '');
        this._swapGen = gen;
      }
      try {
        const w = this.clientWidth || this.offsetWidth || MAX_DIM;
        const url = await toDataUrl(file, w);
        if (gen !== this._gen) return;
        // Only exit reframe once the new image is in hand — a rejected type
        // or decode failure leaves the in-progress crop untouched.
        this._exitReframe(false);
        // Clear BEFORE setSlot: its synchronous re-render must see no
        // pending encode, so a byte-identical re-upload (same data URL, no
        // load event coming) still clears the mask via the complete branch.
        this._swapGen = 0;
        const val = {
          u: url,
          s: 1,
          x: 0,
          y: 0
        };
        setSlot(this.id || '', val);
        // Keep a session-local copy for id-less slots so the drop still
        // shows, even though it cannot persist.
        if (!this.id) {
          this._local = val;
          this._render();
        }
      } catch (err) {
        if (gen !== this._gen) return;
        this._swapGen = 0;
        // Reveal the kept old image — unless another replacement (a
        // remote pick's src swap) is still in flight, in which case the
        // mask stays until THAT image settles (its load/error releases).
        this._releaseMask();
        this._setError('Could not read that image.');
        console.warn('<image-slot> ingest failed:', err);
      }
    }
    _setError(msg) {
      if (this._err) {
        this._err.remove();
        this._err = null;
      }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => {
        if (this._err === d) {
          d.remove();
          this._err = null;
        }
      }, 3000);
    }

    // Reframing (pan/resize) is available on any filled slot — the user can
    // always reposition/scale. `fit` only sets the initial baseline (see
    // _geom): contain starts fully-visible, cover starts frame-filling.
    _reframes() {
      return this.hasAttribute('data-filled');
    }

    // The single release discipline for the replacement-in-flight mask
    // (data-swapping). The mask comes off only when BOTH hold:
    //  - no encode is pending (_swapGen) — mid-encode the stored value
    //    still resolves to the old image, so any reveal paints it;
    //  - the frame img has settled on its current src — an unsettled src
    //    means some replacement is still in flight (e.g. a remote pick),
    //    whoever started it, and revealing would paint the previous
    //    frame. The load/error listeners pass settled=true (the event IS
    //    the settlement signal, per spec complete is true by then);
    //    other callers rely on the complete flag (covers loaded AND
    //    failed).
    // Every release path funnels through here EXCEPT _render's empty
    // branch (the img is being cleared — nothing will ever settle).
    _releaseMask(settled) {
      if (!this._swapGen && !this._loadPending && (settled || this._img.complete)) {
        this.removeAttribute('data-swapping');
      }
    }

    // Baseline geometry, shared by clamp/apply/resize. `base` is the scale at
    // view-scale s=1: cover = fill the frame (overflow on the looser axis),
    // contain = fit fully inside (letterboxed). Zooming a contain image past
    // s where it overflows naturally becomes a crop. Null until the img has
    // loaded (naturalWidth is 0 before that) or when the slot has no layout
    // box — ResizeObserver fires with a 0×0 rect under display:none, and
    // clamping against a degenerate 1×1 frame would silently pull the stored
    // pan toward zero.
    _geom() {
      const iw = this._img.naturalWidth,
        ih = this._img.naturalHeight;
      const fw = this.clientWidth,
        fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      const contain = (this.getAttribute('fit') || 'cover').toLowerCase() === 'contain';
      const base = contain ? Math.min(fw / iw, fh / ih) : Math.max(fw / iw, fh / ih);
      return {
        iw,
        ih,
        fw,
        fh,
        base
      };
    }
    _clampView() {
      // Pan range on each axis is half the overflow past the frame edge.
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }
    _applyView() {
      const g = this._geom();
      // Top-layer controls: pin to the frame's top-right in viewport px
      // (the same 8px inset as the in-frame layout; unscaled — top-layer UI
      // reads as chrome, not page content). BEFORE the geometry branch:
      // placement needs only the frame rect, and a not-yet-loaded or broken
      // src must not leave the promoted strip floating unpositioned. Gated
      // on the popover actually being open: without the Popover API,
      // showPopover() threw (swallowed in _enterReframe), .ctl stays in
      // its in-frame absolute layout, and viewport-px coordinates would
      // shove it off-frame — and matches(':popover-open') itself throws
      // there (unknown pseudo-class), hence the try/catch.
      if (this.hasAttribute('data-reframe')) {
        let onTop = false;
        try {
          onTop = this._ctl.matches(':popover-open');
        } catch {}
        if (onTop) {
          const r = this.getBoundingClientRect();
          this._ctl.style.left = r.right - 8 + 'px';
          this._ctl.style.top = r.top + 8 + 'px';
        }
      }
      if (!g) {
        // Dimensions not known yet (before img load) — centered fit so there
        // is no flash of an unpositioned image before the geometry lands.
        const contain = (this.getAttribute('fit') || 'cover').toLowerCase() === 'contain';
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = contain ? 'contain' : 'cover';
        return;
      }
      // Baseline (cover-fill or contain-fit) × view scale. Width/height and
      // left/top are all frame-% — depends only on the frame aspect ratio, so
      // a responsive resize keeps the same crop. The spill layer mirrors the
      // same box so its corners = image corners.
      const k = g.base * this._view.s;
      const w = g.iw * k / g.fw * 100 + '%';
      const h = g.ih * k / g.fh * 100 + '%';
      const l = 50 + this._view.x + '%';
      const t = 50 + this._view.y + '%';
      this._img.style.width = w;
      this._img.style.height = h;
      this._img.style.left = l;
      this._img.style.top = t;
      this._img.style.objectFit = '';
      if (this.hasAttribute('data-reframe')) {
        // Top-layer spill: position in viewport px over the frame. The top
        // layer escapes ancestor transforms entirely, so EVERY term must be
        // in viewport units: getBoundingClientRect gives the frame's scaled
        // origin AND size, and the rect/layout ratio rescales the ghost —
        // sizing from layout px alone renders it 1/scale too large under a
        // scaled deck slide. Inner ghost + handles stay box-relative.
        const r = this.getBoundingClientRect();
        const sx = g.fw ? r.width / g.fw : 1;
        const sy = g.fh ? r.height / g.fh : 1;
        this._spill.style.width = g.iw * k * sx + 'px';
        this._spill.style.height = g.ih * k * sy + 'px';
        this._spill.style.left = r.left + (50 + this._view.x) / 100 * r.width + 'px';
        this._spill.style.top = r.top + (50 + this._view.y) / 100 * r.height + 'px';
      }
    }
    _commitView() {
      const v = {
        s: this._view.s,
        x: this._view.x,
        y: this._view.y
      };
      if (this._userUrl) v.u = this._userUrl;
      // Framing-only (no u) persists too so an author-src slot remembers its
      // crop; clearing the sidecar still falls through to src=.
      if (this.id) setSlot(this.id, v);else {
        this._local = v;
      }
    }
    _render() {
      // Shape / mask. Presets use border-radius so the dashed ring can
      // follow the rounded outline; clip-path is only applied for an
      // explicit `mask` (the ring is hidden there since a rectangle
      // dashed border chopped by an arbitrary polygon looks broken).
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';else if (shape === 'pill') radius = '9999px';else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Controls and reframe entry gate on this so share links stay read-only.
      const editable = !!(window.omelette && window.omelette.writeFile);
      this.toggleAttribute('data-editable', editable);
      this._sub.style.display = editable ? '' : 'none';

      // Content. The sidecar is also writable by the agent's write_file
      // tool, so its value isn't guaranteed canvas-originated — only accept
      // data:image/ URLs from it. The `src` attribute is author-controlled
      // (Claude wrote it into the HTML) so it passes through unchanged.
      let stored = this.id ? getSlot(this.id) : this._local;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      this._userUrl = stored && stored.u || null;
      const url = this._userUrl || srcAttr;
      // Don't clobber an in-flight reframe with a store-triggered re-render.
      if (!this.hasAttribute('data-reframe')) {
        this._view = {
          s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
          x: stored && Number.isFinite(stored.x) ? stored.x : 0,
          y: stored && Number.isFinite(stored.y) ? stored.y : 0
        };
      }
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      // Toggle via style.display — the [hidden] attribute alone loses to
      // the display:flex / display:block rules in the stylesheet above.
      // An Unsplash src with no credit attribute must NOT render — showing
      // the photo uncredited is the Unsplash-terms violation itself. The
      // error tile replaces the photo until the credit is written. A
      // user-dropped image is the user's own content and always renders.
      // Trimmed: credit is agent/user-editable content, and a whitespace-
      // only value must count as missing — otherwise it would suppress the
      // error tile AND render an empty credit box (no text, no links),
      // exactly the unattributed state this gate exists to prevent.
      const credit = (this.getAttribute('credit') || '').trim();
      const attrError = !!(!credit && !this._userUrl && srcAttr && isUnsplashHost(srcAttr));
      this.toggleAttribute('data-attribution-error', attrError);
      if (url && !attrError) {
        const prev = this._img.getAttribute('src');
        if (prev !== url) {
          // Replacing an already-shown image: mark the swap BEFORE setting
          // src so the stale frame is never revealed (see the data-swapping
          // stylesheet rules). First fill (prev empty) keeps the existing
          // placeholder-until-load behavior — no spinner. _hidShowing
          // covers the pick path's transient attribution-error wipe: prev
          // is gone, but an image WAS showing, so this is a replacement.
          if (prev || this._hidShowing) this.setAttribute('data-swapping', '');
          // Mark the swap BEFORE assigning src: complete keeps reporting
          // the old settled request until the browser's
          // update-the-image-data microtask runs, so same-task re-renders
          // (the pick path's credit/credit-href setAttributes) need this
          // flag, not complete, to know a load is in flight.
          this._loadPending = true;
          this._img.src = url;
          this._ghost.src = url;
        } else {
          // Same-src re-render — release if settled, so an ingest-set
          // spinner can't stick after a byte-identical re-upload (same
          // data URL, no further load event ever fires).
          this._releaseMask();
        }
        this._hidShowing = false;
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this.removeAttribute('data-swapping');
        // The src is being removed — no load/error will ever fire for it.
        this._loadPending = false;
        // A transient attribution-error wipe of a showing image happens on
        // the pick path: the host sets src one setAttribute before credit,
        // so render N hides the old image (attrError) and render N+1
        // restores a URL. Remember the wipe so that restore renders as a
        // replacement (spinner), not a first fill (blank frame).
        this._hidShowing = attrError && !!this._img.getAttribute('src');
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._ghost.removeAttribute('src');
        // The error tile owns the blocked-photo state; .empty stays for
        // the genuinely-empty slot.
        this._empty.style.display = attrError ? 'none' : 'flex';
        this.removeAttribute('data-filled');
      }

      // Credit belongs to the author src, so a user drop hides it.
      // textContent + the http(s)-only funnel keep external strings inert.
      const showCredit = !!(url && credit && !this._userUrl && !attrError);
      this._credit.textContent = '';
      if (showCredit) {
        // Validate once (resolved against the document, http(s) only),
        // then append the terms-required utm referral params to links
        // that point back at unsplash.com.
        let href = '';
        const rawHref = this.getAttribute('credit-href') || '';
        if (rawHref) {
          try {
            const u = new URL(rawHref, document.baseURI);
            if (u.protocol === 'http:' || u.protocol === 'https:') {
              href = withReferral(u.href);
            }
          } catch {}
        }
        const mkLink = (text, linkHref) => {
          const a = document.createElement('a');
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
          a.setAttribute('href', linkHref);
          a.textContent = text;
          return a;
        };
        // Unsplash's prescribed credit is TWO links — the photographer's
        // name to their profile (credit-href) and 'Unsplash' to the
        // homepage. Render that split whenever the text has the canonical
        // shape; other text keeps the legacy single-link rendering.
        const m = /^Photo by (.+) on Unsplash$/.exec(credit);
        if (m) {
          this._credit.appendChild(document.createTextNode('Photo by '));
          this._credit.appendChild(href ? mkLink(m[1], href) : document.createTextNode(m[1]));
          this._credit.appendChild(document.createTextNode(' on '));
          this._credit.appendChild(mkLink('Unsplash', UNSPLASH_HOMEPAGE_HREF));
        } else if (href) {
          this._credit.appendChild(mkLink(credit, href));
        } else {
          this._credit.textContent = credit;
        }
      }
      this.toggleAttribute('data-credit', showCredit);
    }
  }
  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "assets/image-slot.js", error: String((e && e.message) || e) }); }

// components/brand/BrandMark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** The identity lockup. Roundel is the real mark; wordmark is type-only fallback. */
function BrandMark({
  variant = 'roundel',
  size = 88,
  src = 'assets/logo-roundel.png',
  href,
  style,
  ...rest
}) {
  const Tag = href ? 'a' : 'div';
  const wordmark = /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      gap: 2,
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ph-display",
    style: {
      fontSize: Math.round(size * 0.34),
      color: 'var(--text-primary)',
      letterSpacing: '0.01em'
    }
  }, "Paul Haworth"), /*#__PURE__*/React.createElement("span", {
    className: "ph-eyebrow",
    style: {
      fontSize: Math.max(10, Math.round(size * 0.14)),
      color: 'var(--text-accent)'
    }
  }, "Nightscapes"));
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    "aria-label": "Paul Haworth Nightscapes",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      textDecoration: 'none',
      border: 0,
      ...style
    }
  }, rest), variant !== 'wordmark' && /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "Paul Haworth Nightscapes",
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      flex: '0 0 auto'
    }
  }), variant !== 'roundel' && wordmark);
}
Object.assign(__ds_scope, { BrandMark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/BrandMark.jsx", error: String((e && e.message) || e) }); }

// components/content/ExposureReadout.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Camera settings shown as tabular mono data - the signature technical element. */
function ExposureReadout({
  items = [],
  size = 'md',
  columns,
  style,
  ...rest
}) {
  const big = size === 'field';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + (columns || items.length || 1) + ', minmax(0,1fr))',
      gap: big ? 'var(--space-3)' : 'var(--space-2)',
      ...style
    }
  }, rest), items.map(it => /*#__PURE__*/React.createElement("div", {
    key: it.label,
    style: {
      display: 'grid',
      gap: big ? 6 : 3,
      padding: big ? 'var(--space-4)' : 'var(--space-3)',
      background: 'var(--surface-inset)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-control)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ph-eyebrow",
    style: {
      color: 'var(--text-muted)',
      fontSize: big ? 'var(--size-3xs)' : '11px'
    }
  }, it.label), /*#__PURE__*/React.createElement("span", {
    className: "ph-mono",
    style: {
      fontSize: big ? 'var(--size-l)' : 'var(--size-m)',
      fontWeight: 'var(--weight-medium)',
      color: it.highlight ? 'var(--text-accent)' : 'var(--text-primary)',
      lineHeight: 1.1
    }
  }, it.value), it.note && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: big ? 'var(--text-caption)' : '12px',
      color: 'var(--text-muted)'
    }
  }, it.note))));
}
Object.assign(__ds_scope, { ExposureReadout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/ExposureReadout.jsx", error: String((e && e.message) || e) }); }

// components/content/ImageFrame.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Photograph with optional scrim, caption and mono exposure line. */
function ImageFrame({
  src,
  alt = '',
  ratio = '3 / 2',
  caption,
  exposure,
  scrim = 'none',
  overlay,
  radius = 'var(--radius-image)',
  style,
  ...rest
}) {
  const scrimBg = scrim === 'bottom' ? 'var(--scrim-bottom)' : scrim === 'top' ? 'var(--scrim-top)' : scrim === 'full' ? 'var(--scrim-full)' : null;
  return /*#__PURE__*/React.createElement("figure", _extends({
    style: {
      margin: 0,
      display: 'grid',
      gap: 'var(--space-2)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: ratio,
      overflow: 'hidden',
      borderRadius: radius,
      background: 'var(--surface-inset)',
      border: '1px solid var(--border-hairline)'
    }
  }, src && /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), scrimBg && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: scrimBg,
      pointerEvents: 'none'
    }
  }), overlay && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: 'var(--space-5)'
    }
  }, overlay)), (caption || exposure) && /*#__PURE__*/React.createElement("figcaption", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-3)',
      alignItems: 'baseline',
      fontSize: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, caption && /*#__PURE__*/React.createElement("span", null, caption), exposure && /*#__PURE__*/React.createElement("span", {
    className: "ph-mono",
    style: {
      color: 'var(--violet-500)'
    }
  }, exposure)));
}
Object.assign(__ds_scope, { ImageFrame });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/ImageFrame.jsx", error: String((e && e.message) || e) }); }

// components/content/QuoteBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Pull quote in display serif italic - talk testimonials, narrative asides. */
function QuoteBlock({
  quote,
  attribution,
  align = 'left',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("figure", _extends({
    style: {
      margin: 0,
      display: 'grid',
      gap: 'var(--space-4)',
      justifyItems: align === 'center' ? 'center' : 'start',
      textAlign: align,
      maxWidth: 'var(--measure-prose)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("blockquote", {
    className: "ph-display",
    style: {
      margin: 0,
      fontSize: 'var(--text-h2)',
      fontStyle: 'italic',
      color: 'var(--text-primary)',
      lineHeight: 1.25
    }
  }, quote), attribution && /*#__PURE__*/React.createElement("figcaption", {
    className: "ph-eyebrow",
    style: {
      color: 'var(--text-muted)'
    }
  }, attribution));
}
Object.assign(__ds_scope, { QuoteBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/QuoteBlock.jsx", error: String((e && e.message) || e) }); }

// components/content/StepList.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Numbered procedure. Amber mono numerals, generous rows. */
function StepList({
  steps = [],
  size = 'md',
  style,
  ...rest
}) {
  const big = size === 'field';
  return /*#__PURE__*/React.createElement("ol", _extends({
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'grid',
      gap: big ? 'var(--space-5)' : 'var(--space-4)',
      ...style
    }
  }, rest), steps.map((s, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      gap: big ? 'var(--space-4)' : 'var(--space-3)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ph-mono",
    style: {
      display: 'grid',
      placeItems: 'center',
      width: big ? 38 : 28,
      height: big ? 38 : 28,
      borderRadius: '50%',
      border: '1px solid var(--border-accent)',
      color: 'var(--text-accent)',
      fontSize: big ? 'var(--size-xs)' : 'var(--text-caption)',
      fontWeight: 'var(--weight-medium)'
    }
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 4,
      paddingTop: big ? 5 : 2
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      fontSize: big ? 'var(--size-m)' : 'var(--text-body)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-primary)',
      lineHeight: 1.3
    }
  }, s.title), s.body && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: big ? 'var(--text-field-min)' : 'var(--text-body-sm)',
      color: 'var(--text-secondary)',
      lineHeight: 'var(--leading-relaxed)'
    }
  }, s.body)))));
}
Object.assign(__ds_scope, { StepList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/StepList.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Surface container: hairline border, near-flat, subtle raise on hover when interactive. */
function Card({
  variant = 'default',
  interactive,
  padding = 'var(--gutter-card)',
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const skin = {
    default: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)'
    },
    raised: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-subtle)'
    },
    inset: {
      background: 'var(--surface-inset)',
      border: '1px solid var(--border-hairline)'
    },
    outline: {
      background: 'transparent',
      border: '1px solid var(--border-subtle)'
    },
    accent: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-accent)'
    }
  }[variant];
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      borderRadius: 'var(--radius-card)',
      padding,
      color: 'var(--text-primary)',
      transition: 'border-color var(--duration-base) var(--ease-standard),box-shadow var(--duration-base) var(--ease-standard),transform var(--duration-base) var(--ease-out)',
      cursor: interactive ? 'pointer' : undefined,
      transform: interactive && hover ? 'translateY(-2px)' : 'none',
      boxShadow: interactive && hover ? 'var(--shadow-3)' : 'var(--shadow-2)',
      borderColor: interactive && hover ? 'var(--border-strong)' : undefined,
      ...skin,
      ...(interactive && hover ? {
        borderColor: 'var(--border-strong)'
      } : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Divider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Hairline rule. `star` centres a small amber marker — the house section break. */
function Divider({
  variant = 'hairline',
  style,
  ...rest
}) {
  if (variant === 'star') {
    return /*#__PURE__*/React.createElement("div", _extends({
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        ...style
      }
    }, rest), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: 1,
        background: 'var(--border-hairline)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: 'var(--amber-500)',
        boxShadow: 'var(--glow-amber-soft)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: 1,
        background: 'var(--border-hairline)'
      }
    }));
  }
  return /*#__PURE__*/React.createElement("hr", _extends({
    style: {
      border: 0,
      height: 1,
      margin: 0,
      background: variant === 'accent' ? 'var(--amber-500)' : 'var(--border-hairline)',
      width: variant === 'accent' ? 56 : '100%',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Divider.jsx", error: String((e && e.message) || e) }); }

// components/content/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Eyebrow + display heading + optional lead. The house section opener. */
function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'left',
  rule = true,
  level = 2,
  style,
  ...rest
}) {
  const H = 'h' + level;
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      display: 'grid',
      gap: 'var(--space-3)',
      justifyItems: align === 'center' ? 'center' : 'start',
      textAlign: align,
      maxWidth: 'var(--measure-prose)',
      ...style
    }
  }, rest), eyebrow && /*#__PURE__*/React.createElement("span", {
    className: "ph-eyebrow",
    style: {
      color: 'var(--text-accent)'
    }
  }, eyebrow), /*#__PURE__*/React.createElement(H, {
    className: "ph-display",
    style: {
      fontSize: level === 1 ? 'var(--text-display)' : 'var(--text-h1)',
      color: 'var(--text-primary)',
      fontWeight: 'var(--weight-regular)',
      margin: 0
    }
  }, title), rule && /*#__PURE__*/React.createElement(__ds_scope.Divider, {
    variant: "accent"
  }), lead && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-lead)',
      lineHeight: 'var(--leading-relaxed)',
      color: 'var(--text-secondary)',
      fontWeight: 'var(--weight-light)'
    }
  }, lead));
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const LUCIDE = 'https://unpkg.com/lucide-static@0.544.0/icons/';
const cache = new Map();

/** Lucide glyph, fetched once and inlined so it inherits colour like text. */
function Icon({
  name,
  size = 20,
  color = 'currentColor',
  title,
  style,
  ...rest
}) {
  const [svg, setSvg] = React.useState(() => cache.get(name) || '');
  React.useEffect(() => {
    if (cache.has(name)) {
      setSvg(cache.get(name));
      return;
    }
    let alive = true;
    fetch(LUCIDE + name + '.svg').then(r => r.ok ? r.text() : '').then(t => {
      if (t) {
        cache.set(name, t);
        if (alive) setSvg(t);
      }
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, [name]);
  return /*#__PURE__*/React.createElement("span", _extends({
    role: title ? 'img' : 'presentation',
    "aria-label": title,
    "aria-hidden": title ? undefined : true,
    style: {
      display: 'inline-flex',
      flex: '0 0 auto',
      width: size,
      height: size,
      color,
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: svg ? svg.replace('<svg', '<svg style="width:100%;height:100%;display:block"') : ''
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/content/Callout.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONE = {
  tip: {
    bd: 'var(--border-accent)',
    fg: 'var(--text-accent)',
    icon: 'lightbulb'
  },
  note: {
    bd: 'var(--border-subtle)',
    fg: 'var(--text-secondary)',
    icon: 'info'
  },
  caution: {
    bd: 'var(--amber-600)',
    fg: 'var(--amber-400)',
    icon: 'triangle-alert'
  },
  darkskies: {
    bd: 'rgba(127,199,155,.5)',
    fg: 'var(--status-clear)',
    icon: 'moon-star'
  }
};

/** Boxed aside: a field tip, a safety note, a dark-sky courtesy reminder. */
function Callout({
  tone = 'tip',
  title,
  icon,
  children,
  size = 'md',
  style,
  ...rest
}) {
  const t = TONE[tone] || TONE.tip;
  const big = size === 'field';
  return /*#__PURE__*/React.createElement("aside", _extends({
    style: {
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      gap: big ? 'var(--space-4)' : 'var(--space-3)',
      padding: big ? 'var(--space-5)' : 'var(--space-4)',
      background: 'var(--surface-inset)',
      border: '1px solid ' + t.bd,
      borderRadius: 'var(--radius-card)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || t.icon,
    size: big ? 28 : 20,
    color: t.fg,
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 6
    }
  }, title && /*#__PURE__*/React.createElement("strong", {
    className: "ph-eyebrow",
    style: {
      color: t.fg,
      fontSize: big ? 'var(--size-2xs)' : 'var(--text-eyebrow)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: big ? 'var(--text-field-min)' : 'var(--text-body-sm)',
      color: 'var(--text-secondary)',
      lineHeight: 'var(--leading-relaxed)'
    }
  }, children)));
}
Object.assign(__ds_scope, { Callout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Callout.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONE = {
  accent: {
    bg: 'var(--amber-500)',
    fg: 'var(--text-on-accent)',
    bd: 'var(--amber-500)'
  },
  clear: {
    bg: 'rgba(127,199,155,.16)',
    fg: 'var(--status-clear)',
    bd: 'rgba(127,199,155,.5)'
  },
  marginal: {
    bg: 'rgba(250,163,56,.14)',
    fg: 'var(--amber-500)',
    bd: 'rgba(250,163,56,.5)'
  },
  clouded: {
    bg: 'rgba(110,109,153,.18)',
    fg: 'var(--text-muted)',
    bd: 'var(--border-subtle)'
  },
  neutral: {
    bg: 'transparent',
    fg: 'var(--text-secondary)',
    bd: 'var(--border-subtle)'
  }
};

/** Small status marker: sky conditions, difficulty, "free", counts. */
function Badge({
  tone = 'neutral',
  icon,
  children,
  style,
  ...rest
}) {
  const t = TONE[tone] || TONE.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 'var(--radius-pill)',
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.bd}`,
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--text-eyebrow)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-wide)',
      textTransform: 'uppercase',
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PAD = {
  sm: '6px 14px',
  md: '11px 22px',
  lg: '15px 30px',
  field: '18px 26px'
};
const FS = {
  sm: 'var(--size-3xs)',
  md: 'var(--size-2xs)',
  lg: 'var(--size-xs)',
  field: 'var(--text-field-min)'
};
const ICON = {
  sm: 14,
  md: 16,
  lg: 18,
  field: 24
};
function look(variant) {
  switch (variant) {
    case 'secondary':
      return {
        background: 'transparent',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-subtle)'
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: '1px solid transparent'
      };
    case 'field':
      return {
        background: 'transparent',
        color: 'var(--text-accent)',
        border: '2px solid var(--border-accent)'
      };
    default:
      return {
        background: 'var(--amber-500)',
        color: 'var(--text-on-accent)',
        border: '1px solid var(--amber-500)'
      };
  }
}

/** Primary call to action. Amber fill for the one action that matters on a view. */
function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth,
  disabled,
  href,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const base = look(variant);
  const Tag = href ? 'a' : 'button';
  const glow = variant === 'primary' || variant === 'field';
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    disabled: Tag === 'button' ? disabled : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      minHeight: size === 'sm' ? 32 : 'var(--hit-min)',
      padding: PAD[size],
      fontFamily: 'var(--font-core)',
      fontSize: FS[size],
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-wide)',
      textTransform: 'uppercase',
      lineHeight: 1,
      textDecoration: 'none',
      borderRadius: 'var(--radius-control)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 'var(--state-disabled-opacity)' : 1,
      transition: 'var(--transition-control)',
      transform: press && !disabled ? 'translateY(1px)' : 'none',
      ...base,
      ...(hover && !disabled ? variant === 'primary' ? {
        background: 'var(--amber-400)',
        borderColor: 'var(--amber-400)'
      } : variant === 'field' ? {
        background: 'rgba(250,163,56,.12)'
      } : {
        background: 'var(--state-hover-lift)',
        borderColor: 'var(--border-strong)',
        color: 'var(--text-primary)'
      } : null),
      boxShadow: hover && !disabled && glow ? 'var(--glow-amber-soft)' : 'none',
      ...style
    }
  }, rest), iconLeft && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: ICON[size]
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: ICON[size]
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BOX = {
  sm: 32,
  md: 44,
  lg: 56
};

/** Square icon-only control for toolbars, galleries and card headers. */
function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  active,
  disabled,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const outlined = variant === 'outline';
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": label,
    "aria-pressed": active,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: BOX[size],
      height: BOX[size],
      borderRadius: 'var(--radius-control)',
      border: outlined ? '1px solid var(--border-subtle)' : '1px solid transparent',
      background: active ? 'rgba(250,163,56,.14)' : hover && !disabled ? 'var(--state-hover-lift)' : 'transparent',
      color: active ? 'var(--text-accent)' : hover && !disabled ? 'var(--text-primary)' : 'var(--text-secondary)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 'var(--state-disabled-opacity)' : 1,
      transition: 'var(--transition-control)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === 'sm' ? 16 : size === 'lg' ? 26 : 20
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Selectable filter chip — galleries, card decks, store filters. */
function Tag({
  selected,
  onToggle,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-pressed": !!selected,
    onClick: onToggle,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      padding: '9px 16px',
      minHeight: 38,
      borderRadius: 'var(--radius-pill)',
      border: `1px solid ${selected ? 'var(--amber-500)' : hover ? 'var(--border-strong)' : 'var(--border-hairline)'}`,
      background: selected ? 'rgba(250,163,56,.14)' : hover ? 'var(--state-hover-lift)' : 'transparent',
      color: selected ? 'var(--text-accent)' : 'var(--text-secondary)',
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--text-caption)',
      fontWeight: 'var(--weight-medium)',
      letterSpacing: '0.04em',
      cursor: 'pointer',
      transition: 'var(--transition-control)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/field/FormulaBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** A rule of thumb written as maths - the 500 rule, NPF, hyperfocal. */
function FormulaBlock({
  formula,
  result,
  caption,
  size = 'field',
  style,
  ...rest
}) {
  const big = size === 'field';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'grid',
      gap: big ? 'var(--space-3)' : 'var(--space-2)',
      padding: big ? 'var(--space-5)' : 'var(--space-4)',
      background: 'var(--surface-inset)',
      border: '1px solid var(--border-accent)',
      borderRadius: 'var(--radius-card)',
      textAlign: 'center',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "ph-mono",
    style: {
      fontSize: big ? 'var(--size-m)' : 'var(--size-s)',
      color: 'var(--text-secondary)',
      lineHeight: 1.4
    }
  }, formula), result && /*#__PURE__*/React.createElement("span", {
    className: "ph-mono",
    style: {
      fontSize: big ? 'var(--size-2xl)' : 'var(--size-xl)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--text-accent)',
      lineHeight: 1
    }
  }, result), caption && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: big ? 'var(--text-body-sm)' : 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, caption));
}
Object.assign(__ds_scope, { FormulaBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/field/FormulaBlock.jsx", error: String((e && e.message) || e) }); }

// components/field/NightVisionToggle.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const MODES = [{
  value: 'night',
  label: 'Night',
  icon: 'moon'
}, {
  value: 'nightvision',
  label: 'Red light',
  icon: 'flashlight'
}];

/** Two-mode segmented control: violet night reading vs dark-adapted red. */
function NightVisionToggle({
  value = 'night',
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "group",
    "aria-label": "Reading mode",
    style: {
      display: 'inline-flex',
      padding: 4,
      gap: 4,
      background: 'var(--surface-inset)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-pill)',
      ...style
    }
  }, rest), MODES.map(m => {
    const on = value === m.value;
    return /*#__PURE__*/React.createElement("button", {
      key: m.value,
      type: "button",
      "aria-pressed": on,
      onClick: () => onChange && onChange(m.value),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 38,
        padding: '8px 18px',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid ' + (on ? 'var(--border-accent)' : 'transparent'),
        background: on ? 'rgba(250,163,56,.14)' : 'transparent',
        color: on ? 'var(--text-accent)' : 'var(--text-muted)',
        fontFamily: 'var(--font-core)',
        fontSize: 'var(--text-caption)',
        fontWeight: 'var(--weight-medium)',
        letterSpacing: 'var(--tracking-wide)',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'var(--transition-control)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: m.icon,
      size: 16
    }), m.label);
  }));
}
Object.assign(__ds_scope, { NightVisionToggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/field/NightVisionToggle.jsx", error: String((e && e.message) || e) }); }

// components/field/ReferenceCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** The downloadable night-reference card shell: phone-portrait, max contrast. */
function ReferenceCard({
  topic,
  title,
  number,
  theme = 'night',
  width = 420,
  ratio = '9 / 16',
  footer = 'paulhaworthnightscapes.com',
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("article", _extends({
    "data-theme": theme === 'nightvision' ? 'nightvision' : undefined,
    style: {
      position: 'relative',
      width,
      aspectRatio: ratio,
      display: 'grid',
      gridTemplateRows: 'auto auto 1fr auto',
      gap: 'var(--space-4)',
      padding: 'var(--gutter-field)',
      background: 'var(--surface-night)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-sheet)',
      overflow: 'hidden',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 'var(--space-3)',
      paddingBottom: 'var(--space-3)',
      borderBottom: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ph-eyebrow",
    style: {
      color: 'var(--text-accent)',
      fontSize: 'var(--size-3xs)'
    }
  }, topic), number && /*#__PURE__*/React.createElement("span", {
    className: "ph-mono",
    style: {
      color: 'var(--text-muted)',
      fontSize: 'var(--size-3xs)'
    }
  }, number)), /*#__PURE__*/React.createElement("h2", {
    className: "ph-display",
    style: {
      margin: 0,
      fontSize: 'var(--size-xl)',
      fontWeight: 'var(--weight-regular)',
      lineHeight: 1.1
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--space-5)',
      alignContent: 'start',
      minHeight: 0,
      overflow: 'hidden'
    }
  }, children), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-3)',
      paddingTop: 'var(--space-3)',
      borderTop: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ph-eyebrow",
    style: {
      color: 'var(--text-muted)',
      fontSize: '10px'
    }
  }, "Paul Haworth Nightscapes"), /*#__PURE__*/React.createElement("span", {
    className: "ph-mono",
    style: {
      color: 'var(--text-muted)',
      fontSize: '10px'
    }
  }, footer)));
}
Object.assign(__ds_scope, { ReferenceCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/field/ReferenceCard.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Checkbox with a 44px row target - also the kit checklist control. */
function Checkbox({
  label,
  description,
  checked,
  onChange,
  size = 'md',
  disabled,
  style,
  ...rest
}) {
  const box = size === 'field' ? 30 : 22;
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: 'flex',
      alignItems: description ? 'flex-start' : 'center',
      gap: 'var(--space-3)',
      minHeight: 'var(--hit-min)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 'var(--state-disabled-opacity)' : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'grid',
      placeItems: 'center',
      flex: '0 0 auto',
      width: box,
      height: box,
      marginTop: description ? 2 : 0,
      borderRadius: 'var(--radius-1)',
      border: '2px solid ' + (checked ? 'var(--amber-500)' : 'var(--border-subtle)'),
      background: checked ? 'var(--amber-500)' : 'transparent',
      transition: 'var(--transition-control)'
    }
  }, checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: box - 8,
    color: "var(--text-on-accent)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: size === 'field' ? 'var(--text-field-min)' : 'var(--text-body-sm)',
      color: 'var(--text-primary)',
      lineHeight: 1.35
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, description)));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text field. Dark well, hairline border, amber focus ring. */
function Input({
  label,
  hint,
  error,
  icon,
  id,
  type = 'text',
  size = 'md',
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || 'in-' + (label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const tall = size === 'field';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--space-2)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    className: "ph-eyebrow",
    style: {
      color: 'var(--text-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    style: {
      position: 'absolute',
      left: 14,
      color: focus ? 'var(--text-accent)' : 'var(--text-muted)'
    }
  }), /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    type: type,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      minHeight: tall ? 56 : 'var(--hit-min)',
      padding: icon ? '10px 14px 10px 42px' : '10px 14px',
      background: 'var(--surface-inset)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-core)',
      fontSize: tall ? 'var(--text-field-min)' : 'var(--text-body-sm)',
      border: '1px solid ' + (error ? 'var(--amber-600)' : focus ? 'var(--amber-500)' : 'var(--border-hairline)'),
      borderRadius: 'var(--radius-control)',
      outline: 'none',
      boxShadow: focus ? 'var(--glow-amber-soft)' : 'none',
      transition: 'var(--transition-control)'
    }
  }, rest))), (error || hint) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption)',
      color: error ? 'var(--amber-500)' : 'var(--text-muted)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Radio group - 2 to 4 mutually exclusive options. */
function Radio({
  name,
  options = [],
  value,
  onChange,
  size = 'md',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "radiogroup",
    style: {
      display: 'grid',
      gap: 'var(--space-2)',
      ...style
    }
  }, rest), options.map(o => {
    const v = o.value ?? o;
    const on = value === v;
    const dot = size === 'field' ? 28 : 20;
    return /*#__PURE__*/React.createElement("label", {
      key: v,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        minHeight: 'var(--hit-min)',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: name,
      value: v,
      checked: on,
      onChange: () => onChange && onChange(v),
      style: {
        position: 'absolute',
        opacity: 0,
        width: 0,
        height: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        display: 'grid',
        placeItems: 'center',
        width: dot,
        height: dot,
        borderRadius: '50%',
        border: '2px solid ' + (on ? 'var(--amber-500)' : 'var(--border-subtle)'),
        transition: 'var(--transition-control)'
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      style: {
        width: dot / 2.4,
        height: dot / 2.4,
        borderRadius: '50%',
        background: 'var(--amber-500)'
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: size === 'field' ? 'var(--text-field-min)' : 'var(--text-body-sm)',
        color: on ? 'var(--text-primary)' : 'var(--text-secondary)'
      }
    }, o.label ?? o));
  }));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Native select styled to match Input. */
function Select({
  label,
  hint,
  options = [],
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || 'sel-' + (label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 'var(--space-2)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    className: "ph-eyebrow",
    style: {
      color: 'var(--text-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: fid,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      minHeight: 'var(--hit-min)',
      padding: '10px 40px 10px 14px',
      appearance: 'none',
      background: 'var(--surface-inset)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-core)',
      fontSize: 'var(--text-body-sm)',
      border: '1px solid ' + (focus ? 'var(--amber-500)' : 'var(--border-hairline)'),
      borderRadius: 'var(--radius-control)',
      outline: 'none',
      boxShadow: focus ? 'var(--glow-amber-soft)' : 'none',
      transition: 'var(--transition-control)'
    }
  }, rest), options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value ?? o,
    value: o.value ?? o,
    style: {
      background: 'var(--violet-800)'
    }
  }, o.label ?? o))), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 18,
    style: {
      position: 'absolute',
      right: 14,
      pointerEvents: 'none',
      color: 'var(--text-muted)'
    }
  })), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Toggle for immediate, reversible state (night mode, red light, grid overlay). */
function Switch({
  label,
  checked,
  onChange,
  size = 'md',
  disabled,
  style,
  ...rest
}) {
  const w = size === 'field' ? 64 : 48;
  const h = size === 'field' ? 34 : 26;
  const knob = h - 8;
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      minHeight: 'var(--hit-min)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 'var(--state-disabled-opacity)' : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    role: "switch",
    checked: !!checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'relative',
      width: w,
      height: h,
      borderRadius: 'var(--radius-pill)',
      background: checked ? 'rgba(250,163,56,.22)' : 'var(--surface-inset)',
      border: '1px solid ' + (checked ? 'var(--amber-500)' : 'var(--border-subtle)'),
      transition: 'var(--transition-control)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: checked ? w - knob - 5 : 3,
      width: knob,
      height: knob,
      borderRadius: '50%',
      background: checked ? 'var(--amber-500)' : 'var(--violet-500)',
      boxShadow: checked ? 'var(--glow-amber-soft)' : 'none',
      transition: 'left var(--duration-fast) var(--ease-standard),background var(--duration-fast) var(--ease-standard)'
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: size === 'field' ? 'var(--text-field-min)' : 'var(--text-body-sm)',
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Site header: centred roundel over a single row of links, plus social glyphs. */
function NavBar({
  items = [],
  activeHref,
  logoSrc = 'assets/logo-roundel.png',
  socials = [],
  onNavigate,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      display: 'grid',
      justifyItems: 'center',
      gap: 'var(--space-4)',
      padding: 'var(--space-5) var(--space-6)',
      background: 'rgba(5,4,24,.72)',
      backdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--border-hairline)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.BrandMark, {
    variant: "roundel",
    size: 96,
    src: logoSrc,
    href: "#home",
    onClick: e => {
      if (onNavigate) {
        e.preventDefault();
        onNavigate('#home');
      }
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 'var(--space-5)'
    }
  }, items.map(it => {
    const on = it.href === activeHref;
    return /*#__PURE__*/React.createElement("a", {
      key: it.href,
      href: it.href,
      onClick: e => {
        if (onNavigate) {
          e.preventDefault();
          onNavigate(it.href);
        }
      },
      style: {
        fontFamily: 'var(--font-core)',
        fontSize: 'var(--text-caption)',
        fontWeight: 'var(--weight-medium)',
        letterSpacing: 'var(--tracking-wide)',
        textTransform: 'uppercase',
        color: on ? 'var(--text-accent)' : 'var(--text-secondary)',
        textDecoration: 'none',
        paddingBottom: 4,
        borderBottom: '1px solid ' + (on ? 'var(--amber-500)' : 'transparent'),
        transition: 'var(--transition-control)'
      }
    }, it.label);
  })), socials.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)'
    }
  }, socials.map(s => /*#__PURE__*/React.createElement("a", {
    key: s.icon,
    href: s.href,
    "aria-label": s.label,
    style: {
      color: 'var(--text-muted)',
      border: 0,
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: s.icon,
    size: 18
  })))));
}
Object.assign(__ds_scope, { NavBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SiteFooter.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Page footer: mark, socials, contact, copyright. */
function SiteFooter({
  socials = [],
  email = 'jpchaworth@gmail.com',
  logoSrc = 'assets/logo-roundel.png',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("footer", _extends({
    style: {
      display: 'grid',
      justifyItems: 'center',
      gap: 'var(--space-5)',
      padding: 'var(--space-8) var(--space-6)',
      background: 'var(--surface-night)',
      borderTop: '1px solid var(--border-hairline)',
      textAlign: 'center',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.BrandMark, {
    variant: "roundel",
    size: 72,
    src: logoSrc
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-5)'
    }
  }, socials.map(s => /*#__PURE__*/React.createElement("a", {
    key: s.icon,
    href: s.href,
    "aria-label": s.label,
    style: {
      color: 'var(--text-secondary)',
      border: 0,
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: s.icon,
    size: 20
  })))), /*#__PURE__*/React.createElement("a", {
    href: 'mailto:' + email,
    className: "ph-eyebrow",
    style: {
      color: 'var(--text-accent)',
      border: 0
    }
  }, email), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, "Copyright. All rights reserved."));
}
Object.assign(__ds_scope, { SiteFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SiteFooter.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Horizontal tabs for switching views within a page or card deck. */
function Tabs({
  items = [],
  value,
  onChange,
  size = 'md',
  style,
  ...rest
}) {
  const big = size === 'field';
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: 'flex',
      gap: big ? 'var(--space-2)' : 0,
      borderBottom: big ? 'none' : '1px solid var(--border-hairline)',
      ...style
    }
  }, rest), items.map(it => {
    const v = it.value ?? it;
    const on = value === v;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      role: "tab",
      "aria-selected": on,
      onClick: () => onChange && onChange(v),
      style: {
        minHeight: 'var(--hit-min)',
        padding: big ? '12px 20px' : '10px 16px',
        background: big && on ? 'rgba(250,163,56,.14)' : 'transparent',
        border: big ? '1px solid ' + (on ? 'var(--amber-500)' : 'var(--border-hairline)') : 0,
        borderBottom: big ? undefined : '2px solid ' + (on ? 'var(--amber-500)' : 'transparent'),
        borderRadius: big ? 'var(--radius-pill)' : 0,
        marginBottom: big ? 0 : -1,
        color: on ? 'var(--text-accent)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-core)',
        fontSize: big ? 'var(--text-body-sm)' : 'var(--text-caption)',
        fontWeight: 'var(--weight-medium)',
        letterSpacing: 'var(--tracking-wide)',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'var(--transition-control)'
      }
    }, it.label ?? it);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/night_cards/CardDeck.jsx
try { (() => {
(function () {
  // Night cards UI kit — the downloadable field-reference deck.
  const {
    ReferenceCard,
    FormulaBlock,
    NightVisionToggle,
    ExposureReadout,
    Callout,
    StepList,
    Checkbox,
    Button,
    IconButton,
    Badge,
    Tabs,
    SectionHeading,
    Divider
  } = window.PaulHaworthNightscapesDesignSystem_721589;
  const CARDS = [{
    id: 'planning',
    topic: 'Planning',
    title: 'Is Tonight Worth It?',
    number: '01 / 06',
    group: 'Plan',
    body: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(StepList, {
      size: "field",
      steps: [{
        title: 'Check the moon',
        body: 'New moon ± 5 nights for the Milky Way. A gibbous moon is a floodlight.'
      }, {
        title: 'Check cloud, not rain',
        body: 'Low, mid and high cloud layers each matter. Look for under 20% total.'
      }, {
        title: 'Check the transparency',
        body: 'Haze and humidity flatten contrast even under clear skies.'
      }]
    }), /*#__PURE__*/React.createElement(Callout, {
      tone: "tip",
      size: "field",
      title: "Rule of thumb"
    }, "Two of three good is a shoot. One of three is a drive home."))
  }, {
    id: 'checklist',
    topic: 'Kit',
    title: 'Night Shoot Checklist',
    number: '02 / 06',
    group: 'Plan',
    body: function Body() {
      const [done, setDone] = React.useState(['torch', 'spare']);
      const items = [['torch', 'Headtorch with a red mode'], ['spare', 'Two spare batteries, kept warm'], ['cards', 'Formatted cards'], ['tripod', 'Tripod, plate already fitted'], ['cloth', 'Lens cloth and a dew strip'], ['flask', 'Flask, gloves, hat'], ['told', 'Someone knows where you are']];
      return /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'grid',
          gap: 'var(--space-2)'
        }
      }, items.map(([k, label]) => /*#__PURE__*/React.createElement(Checkbox, {
        key: k,
        size: "field",
        label: label,
        checked: done.includes(k),
        onChange: () => setDone(done.includes(k) ? done.filter(d => d !== k) : done.concat(k))
      })));
    }
  }, {
    id: 'exposure',
    topic: 'Exposure',
    title: 'The 500 Rule',
    number: '03 / 06',
    group: 'Shoot',
    body: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FormulaBlock, {
      formula: "500 / focal length",
      result: "= 25s",
      caption: "20mm full frame. Divide again by the crop factor."
    }), /*#__PURE__*/React.createElement(ExposureReadout, {
      size: "field",
      columns: 2,
      items: [{
        label: 'Shutter',
        value: '20s',
        highlight: true
      }, {
        label: 'Aperture',
        value: 'f/2.8'
      }, {
        label: 'ISO',
        value: '3200'
      }, {
        label: 'White bal.',
        value: '3900K'
      }]
    }), /*#__PURE__*/React.createElement(Callout, {
      tone: "caution",
      size: "field",
      title: "Honest version"
    }, "Halve it on a high-resolution body."))
  }, {
    id: 'focus',
    topic: 'Focus',
    title: 'Focusing in the Dark',
    number: '04 / 06',
    group: 'Shoot',
    body: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(StepList, {
      size: "field",
      steps: [{
        title: 'Switch to manual focus',
        body: 'Autofocus hunts and fails on stars.'
      }, {
        title: 'Punch in on the brightest star',
        body: '10x live view, exposure simulation on.'
      }, {
        title: 'Turn until the star is smallest',
        body: 'Go past it, come back, split the difference.'
      }, {
        title: 'Tape the ring',
        body: 'Then never touch the zoom again.'
      }]
    }), /*#__PURE__*/React.createElement(Callout, {
      tone: "tip",
      size: "field",
      title: "Backup"
    }, "Focus on a distant streetlight at dusk and mark the barrel with a paint pen."))
  }, {
    id: 'aurora',
    topic: 'Aurora',
    title: 'Reading the Forecast',
    number: '05 / 06',
    group: 'Chase',
    body: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ExposureReadout, {
      size: "field",
      columns: 2,
      items: [{
        label: 'Bz',
        value: '−12 nT',
        note: 'south is good',
        highlight: true
      }, {
        label: 'Speed',
        value: '650 km/s'
      }, {
        label: 'Density',
        value: '18 p/cm³'
      }, {
        label: 'Kp',
        value: '6'
      }]
    }), /*#__PURE__*/React.createElement(Callout, {
      tone: "darkskies",
      size: "field",
      title: "What matters"
    }, "Bz south and steady beats a big Kp number. Look north, low to the horizon."))
  }, {
    id: 'trails',
    topic: 'Star trails',
    title: 'Trails and Stacking',
    number: '06 / 06',
    group: 'Chase',
    body: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ExposureReadout, {
      size: "field",
      columns: 2,
      items: [{
        label: 'Frame',
        value: '30s'
      }, {
        label: 'Interval',
        value: '31s',
        note: 'gapless'
      }, {
        label: 'Frames',
        value: '240',
        highlight: true
      }, {
        label: 'Total',
        value: '2h 04m'
      }]
    }), /*#__PURE__*/React.createElement(StepList, {
      size: "field",
      steps: [{
        title: 'Lock everything',
        body: 'Manual exposure, manual focus, IS off.'
      }, {
        title: 'Shoot darks at the end',
        body: 'Lens cap on, same settings, ten frames.'
      }]
    }))
  }];
  const GROUPS = [{
    value: 'all',
    label: 'All'
  }, {
    value: 'Plan',
    label: 'Plan'
  }, {
    value: 'Shoot',
    label: 'Shoot'
  }, {
    value: 'Chase',
    label: 'Chase'
  }];
  function CardBody({
    card
  }) {
    const B = card.body;
    return /*#__PURE__*/React.createElement(B, null);
  }
  function NightCardsKit() {
    const [mode, setMode] = React.useState('night');
    const [group, setGroup] = React.useState('all');
    const [active, setActive] = React.useState('exposure');
    const shown = group === 'all' ? CARDS : CARDS.filter(c => c.group === group);
    const card = CARDS.find(c => c.id === active);
    const i = shown.findIndex(c => c.id === active);
    const step = d => setActive(shown[(Math.max(i, 0) + d + shown.length) % shown.length].id);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-7)',
        padding: 'var(--space-7)',
        maxWidth: 1240,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      eyebrow: "Free stuff",
      title: "Field cards",
      lead: "Twelve technique cards for your phone. High contrast, nothing under 20px, and a red-light version for when your eyes are dark-adapted."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--space-5)',
        alignItems: 'center',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Tabs, {
      items: GROUPS,
      value: group,
      onChange: g => {
        setGroup(g);
        const first = g === 'all' ? CARDS[0] : CARDS.find(c => c.group === g);
        setActive(first.id);
      }
    }), /*#__PURE__*/React.createElement(NightVisionToggle, {
      value: mode,
      onChange: setMode
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '260px 1fr 300px',
        gap: 'var(--space-7)',
        alignItems: 'start'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-2)'
      }
    }, shown.map(c => {
      const on = c.id === active;
      return /*#__PURE__*/React.createElement("button", {
        key: c.id,
        onClick: () => setActive(c.id),
        style: {
          display: 'grid',
          gap: 4,
          textAlign: 'left',
          minHeight: 'var(--hit-min)',
          padding: 'var(--space-3) var(--space-4)',
          cursor: 'pointer',
          background: on ? 'rgba(250,163,56,.1)' : 'transparent',
          border: '1px solid ' + (on ? 'var(--border-accent)' : 'var(--border-hairline)'),
          borderRadius: 'var(--radius-control)',
          transition: 'var(--transition-control)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "ph-mono",
        style: {
          fontSize: '11px',
          color: 'var(--text-muted)'
        }
      }, c.number), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--size-m)',
          color: on ? 'var(--text-accent)' : 'var(--text-primary)'
        }
      }, c.title), /*#__PURE__*/React.createElement("span", {
        className: "ph-eyebrow",
        style: {
          fontSize: '10px',
          color: 'var(--text-muted)'
        }
      }, c.topic));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        justifyItems: 'center',
        gap: 'var(--space-5)'
      }
    }, /*#__PURE__*/React.createElement(ReferenceCard, {
      topic: card.topic,
      title: card.title,
      number: card.number,
      theme: mode,
      width: 420
    }, /*#__PURE__*/React.createElement(CardBody, {
      card: card
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 'var(--space-3)',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      icon: "chevron-left",
      label: "Previous card",
      variant: "outline",
      onClick: () => step(-1)
    }), /*#__PURE__*/React.createElement("span", {
      className: "ph-mono",
      style: {
        fontSize: 'var(--text-caption)',
        color: 'var(--text-muted)'
      }
    }, card.number), /*#__PURE__*/React.createElement(IconButton, {
      icon: "chevron-right",
      label: "Next card",
      variant: "outline",
      onClick: () => step(1)
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-5)',
        padding: 'var(--space-5)',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-card)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-2)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ph-eyebrow",
      style: {
        color: 'var(--text-accent)'
      }
    }, "Take it with you"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-body-sm)',
        color: 'var(--text-secondary)'
      }
    }, "Save the PNG as a phone wallpaper, or print the A6 PDF and keep it in the lens pouch.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-3)'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      fullWidth: true,
      iconLeft: "download"
    }, "PNG \xB7 1080 \xD7 1920"), /*#__PURE__*/React.createElement(Button, {
      fullWidth: true,
      variant: "secondary",
      iconLeft: "printer"
    }, "PDF \xB7 A6 print"), /*#__PURE__*/React.createElement(Button, {
      fullWidth: true,
      variant: "ghost",
      iconLeft: "package"
    }, "Whole deck \xB7 zip")), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-3)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ph-eyebrow",
      style: {
        color: 'var(--text-muted)'
      }
    }, "Included"), ['Both night and red-light versions', 'No sign-up, no watermark', 'Free to share with your club'].map(t => /*#__PURE__*/React.createElement("div", {
      key: t,
      style: {
        display: 'flex',
        gap: 'var(--space-3)',
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: "clear"
    }, "\u2713"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-caption)',
        color: 'var(--text-secondary)'
      }
    }, t)))))), /*#__PURE__*/React.createElement(Divider, {
      variant: "star"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-5)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ph-eyebrow",
      style: {
        color: 'var(--text-muted)'
      }
    }, "The deck \u2014 card backs"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 'var(--space-4)',
        flexWrap: 'wrap'
      }
    }, CARDS.map(c => {
      const on = c.id === active;
      return /*#__PURE__*/React.createElement("div", {
        key: c.id,
        onClick: () => setActive(c.id),
        style: {
          width: 168,
          height: 300,
          cursor: 'pointer',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          background: 'var(--surface-night)',
          border: '1px solid ' + (on ? 'var(--border-accent)' : 'var(--border-hairline)'),
          borderRadius: 'var(--radius-sheet)',
          boxShadow: on ? 'var(--glow-amber-soft)' : 'var(--shadow-2)',
          transition: 'var(--transition-control)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "ph-mono",
        style: {
          fontSize: '11px',
          color: 'var(--text-muted)'
        }
      }, c.number), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--size-l)',
          lineHeight: 1.1,
          color: on ? 'var(--text-accent)' : 'var(--text-primary)',
          alignSelf: 'end'
        }
      }, c.title), /*#__PURE__*/React.createElement("span", {
        className: "ph-eyebrow",
        style: {
          fontSize: '10px',
          color: 'var(--text-muted)'
        }
      }, c.topic));
    }))));
  }
  Object.assign(window, {
    NightCardsKit
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/night_cards/CardDeck.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/GalleryScreen.jsx
try { (() => {
(function () {
  // Website UI kit — gallery view with tabs and a lightbox.
  const {
    Tabs,
    Tag,
    IconButton,
    SectionHeading,
    ExposureReadout,
    Badge
  } = window.PaulHaworthNightscapesDesignSystem_721589;
  const REGIONS = [{
    value: 'east',
    label: 'East Anglia'
  }, {
    value: 'wild',
    label: 'Wild Britain'
  }, {
    value: 'beyond',
    label: 'Beyond these Shores'
  }, {
    value: 'aurora',
    label: 'Aurora'
  }];
  const IMAGES = [{
    id: 1,
    title: 'Black Beacon with Cygnus',
    place: 'Orford Ness, Suffolk',
    exp: '20s · f/2.8 · ISO 3200 · 20mm',
    ratio: '3 / 2',
    subject: 'Milky Way'
  }, {
    id: 2,
    title: 'Camera Shed',
    place: 'Cambridgeshire Fens',
    exp: '15s · f/2.0 · ISO 6400 · 24mm',
    ratio: '2 / 3',
    subject: 'Star trails'
  }, {
    id: 3,
    title: 'Milky Way core and the MAGIC',
    place: 'La Palma',
    exp: '25s · f/1.8 · ISO 2500 · 14mm',
    ratio: '3 / 2',
    subject: 'Milky Way'
  }, {
    id: 4,
    title: 'Serpentine',
    place: 'Norfolk coast',
    exp: '30s · f/2.8 · ISO 1600 · 35mm',
    ratio: '3 / 2',
    subject: 'Aurora'
  }, {
    id: 5,
    title: 'Cygnus rising',
    place: 'Ouse Washes',
    exp: '13s · f/1.4 · ISO 3200 · 20mm',
    ratio: '2 / 3',
    subject: 'Milky Way'
  }, {
    id: 6,
    title: 'Frohode Fantasi',
    place: 'Lofoten, Norway',
    exp: '4s · f/2.8 · ISO 1600 · 16mm',
    ratio: '3 / 2',
    subject: 'Aurora'
  }];
  function GalleryScreen() {
    const [region, setRegion] = React.useState('east');
    const [subject, setSubject] = React.useState(null);
    const [lightbox, setLightbox] = React.useState(null);
    const shown = subject ? IMAGES.filter(i => i.subject === subject) : IMAGES;
    const step = d => {
      const i = shown.findIndex(x => x.id === lightbox.id);
      setLightbox(shown[(i + d + shown.length) % shown.length]);
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-7)',
        padding: 'var(--space-8)'
      }
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      eyebrow: "Galleries",
      title: REGIONS.find(r => r.value === region).label,
      lead: "Fen skies, shingle coast and big horizons \u2014 the places I keep going back to."
    }), /*#__PURE__*/React.createElement(Tabs, {
      items: REGIONS,
      value: region,
      onChange: setRegion
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 'var(--space-3)',
        flexWrap: 'wrap'
      }
    }, ['Milky Way', 'Aurora', 'Star trails'].map(s => /*#__PURE__*/React.createElement(Tag, {
      key: s,
      selected: subject === s,
      onToggle: () => setSubject(subject === s ? null : s)
    }, s))), /*#__PURE__*/React.createElement("div", {
      style: {
        columnCount: 3,
        columnGap: 'var(--space-4)'
      }
    }, shown.map(img => /*#__PURE__*/React.createElement("figure", {
      key: img.id,
      onClick: () => setLightbox(img),
      style: {
        margin: '0 0 var(--space-4)',
        breakInside: 'avoid',
        cursor: 'pointer',
        display: 'grid',
        gap: 'var(--space-2)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: '100%',
        aspectRatio: img.ratio,
        borderRadius: 'var(--radius-image)',
        overflow: 'hidden',
        border: '1px solid var(--border-hairline)'
      }
    }, /*#__PURE__*/React.createElement("image-slot", {
      id: 'ph-gal-' + img.id,
      shape: "rect",
      placeholder: img.title
    })), /*#__PURE__*/React.createElement("figcaption", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        fontSize: 'var(--text-caption)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-secondary)'
      }
    }, img.title), /*#__PURE__*/React.createElement("span", {
      className: "ph-mono",
      style: {
        color: 'var(--violet-500)'
      }
    }, img.exp.split(' · ')[0]))))), lightbox && /*#__PURE__*/React.createElement("div", {
      onClick: () => setLightbox(null),
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'var(--scrim)',
        backdropFilter: 'blur(10px)',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        padding: 'var(--space-5)',
        gap: 'var(--space-4)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: "neutral"
    }, lightbox.subject), /*#__PURE__*/React.createElement(IconButton, {
      icon: "x",
      label: "Close",
      size: "lg",
      variant: "outline",
      onClick: () => setLightbox(null)
    })), /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 'var(--space-5)',
        alignItems: 'center',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      icon: "chevron-left",
      label: "Previous",
      size: "lg",
      variant: "outline",
      onClick: () => step(-1)
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        height: '100%',
        minHeight: 320,
        borderRadius: 'var(--radius-image)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)'
      }
    }, /*#__PURE__*/React.createElement("image-slot", {
      id: 'ph-gal-' + lightbox.id,
      shape: "rect",
      placeholder: lightbox.title
    })), /*#__PURE__*/React.createElement(IconButton, {
      icon: "chevron-right",
      label: "Next",
      size: "lg",
      variant: "outline",
      onClick: () => step(1)
    })), /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        display: 'grid',
        gap: 'var(--space-3)',
        justifyItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("h3", {
      className: "ph-display",
      style: {
        fontSize: 'var(--text-h3)',
        fontWeight: 'var(--weight-regular)'
      }
    }, lightbox.title), /*#__PURE__*/React.createElement("span", {
      className: "ph-eyebrow",
      style: {
        color: 'var(--text-muted)'
      }
    }, lightbox.place), /*#__PURE__*/React.createElement(ExposureReadout, {
      columns: 4,
      style: {
        maxWidth: 620
      },
      items: [{
        label: 'Shutter',
        value: lightbox.exp.split(' · ')[0]
      }, {
        label: 'Aperture',
        value: lightbox.exp.split(' · ')[1]
      }, {
        label: 'ISO',
        value: lightbox.exp.split(' · ')[2].replace('ISO ', '')
      }, {
        label: 'Focal',
        value: lightbox.exp.split(' · ')[3]
      }]
    }))));
  }
  Object.assign(window, {
    GalleryScreen
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/GalleryScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/HomeScreen.jsx
try { (() => {
(function () {
  // Website UI kit — home page. Composes design-system primitives only.
  const {
    BrandMark,
    Button,
    Card,
    Badge,
    SectionHeading,
    ImageFrame,
    QuoteBlock,
    Divider,
    Icon,
    ExposureReadout
  } = window.PaulHaworthNightscapesDesignSystem_721589;
  const COLLECTIONS = [{
    id: 'east',
    name: 'East Anglia',
    note: 'Fen skies, shingle coast, big horizons',
    count: 42
  }, {
    id: 'wild',
    name: 'Wild Britain',
    note: 'Mountains, moors and dark-sky reserves',
    count: 36
  }, {
    id: 'beyond',
    name: 'Beyond these Shores',
    note: 'Norway, the Alps, the Atlantic edge',
    count: 28
  }, {
    id: 'aurora',
    name: 'Aurora and Transient Phenomena',
    note: 'Aurora, NLCs, airglow, STEVE',
    count: 19
  }];
  function PhotoSlot({
    id,
    label,
    ratio = '3 / 2',
    radius = 6
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: '100%',
        aspectRatio: ratio,
        borderRadius: radius,
        overflow: 'hidden',
        border: '1px solid var(--border-hairline)'
      }
    }, /*#__PURE__*/React.createElement("image-slot", {
      id: id,
      shape: "rect",
      placeholder: label
    }));
  }
  function HomeScreen({
    onNavigate
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid'
      }
    }, /*#__PURE__*/React.createElement("section", {
      style: {
        position: 'relative',
        minHeight: 560,
        display: 'grid',
        alignItems: 'end'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0
      }
    }, /*#__PURE__*/React.createElement("image-slot", {
      id: "ph-home-hero",
      shape: "rect",
      placeholder: "Drop a Milky Way panorama \u2014 2400\xD71200"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--scrim-bottom)',
        pointerEvents: 'none'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        display: 'grid',
        gap: 'var(--space-5)',
        justifyItems: 'start',
        padding: 'var(--space-9) var(--space-8)',
        maxWidth: 860
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: "clear",
      icon: "moon-star"
    }, "Nightscape Journals"), /*#__PURE__*/React.createElement("h1", {
      className: "ph-display",
      style: {
        fontSize: 'var(--text-display)',
        fontWeight: 'var(--weight-regular)',
        margin: 0
      }
    }, "Cinematic nightscape ", /*#__PURE__*/React.createElement("i", null, "adventures")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 'var(--text-lead)',
        fontWeight: 'var(--weight-light)',
        color: 'var(--text-secondary)',
        maxWidth: '52ch',
        margin: 0
      }
    }, "Award-winning landscape astrophotography and film from the Cambridgeshire Fens and far beyond \u2014 chasing starry skies, the Milky Way and the aurora."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 'var(--space-3)',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      iconRight: "arrow-right",
      onClick: () => onNavigate('#talks')
    }, "Book me for talks"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      iconLeft: "images",
      onClick: () => onNavigate('#east')
    }, "See the galleries")))), /*#__PURE__*/React.createElement("section", {
      style: {
        padding: 'var(--gutter-section) var(--space-8)',
        display: 'grid',
        gap: 'var(--space-7)'
      }
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      eyebrow: "Galleries",
      title: "Four ways into the dark",
      lead: "Every image has a story behind it: a long drive to a dark corner of the coast, a battle with cloud that broke at just the right moment."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
        gap: 'var(--space-5)'
      }
    }, COLLECTIONS.map(c => /*#__PURE__*/React.createElement(Card, {
      key: c.id,
      variant: "default",
      interactive: true,
      padding: "0",
      onClick: () => onNavigate('#east'),
      style: {
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement(PhotoSlot, {
      id: 'ph-home-' + c.id,
      label: c.name,
      ratio: "4 / 5",
      radius: 0
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 6,
        padding: 'var(--space-4)'
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        fontSize: 'var(--text-h4)',
        fontWeight: 'var(--weight-medium)',
        fontFamily: 'var(--font-display)'
      }
    }, c.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-caption)',
        color: 'var(--text-muted)'
      }
    }, c.note), /*#__PURE__*/React.createElement("span", {
      className: "ph-mono",
      style: {
        fontSize: 'var(--text-caption)',
        color: 'var(--violet-500)'
      }
    }, c.count, " images")))))), /*#__PURE__*/React.createElement(Divider, {
      variant: "star",
      style: {
        margin: '0 var(--space-8)'
      }
    }), /*#__PURE__*/React.createElement("section", {
      style: {
        padding: 'var(--gutter-section) var(--space-8)',
        display: 'grid',
        gridTemplateColumns: '1.3fr 1fr',
        gap: 'var(--space-8)',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement(PhotoSlot, {
      id: "ph-home-film",
      label: "Film still \u2014 16:9",
      ratio: "16 / 9"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'grid',
        placeItems: 'center',
        width: 76,
        height: 76,
        borderRadius: '50%',
        background: 'rgba(5,4,24,.6)',
        border: '1px solid var(--border-accent)',
        boxShadow: 'var(--glow-amber-soft)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "play",
      size: 30,
      color: "var(--amber-500)"
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-4)',
        justifyItems: 'start'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ph-eyebrow",
      style: {
        color: 'var(--text-accent)'
      }
    }, "Latest film"), /*#__PURE__*/React.createElement("h3", {
      className: "ph-display",
      style: {
        fontSize: 'var(--text-h2)',
        fontWeight: 'var(--weight-regular)'
      }
    }, "A night on the shingle"), /*#__PURE__*/React.createElement("p", {
      style: {
        color: 'var(--text-secondary)',
        fontSize: 'var(--text-body)',
        margin: 0
      }
    }, "Orford Ness in October: four hours of cloud, twenty minutes of clear sky, and the Milky Way core setting into the North Sea."), /*#__PURE__*/React.createElement(ExposureReadout, {
      columns: 2,
      items: [{
        label: 'Frames',
        value: '1,840'
      }, {
        label: 'Interval',
        value: '20s'
      }]
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      iconLeft: "youtube",
      href: "https://www.youtube.com/@nightscapejournals"
    }, "Watch on YouTube"))), /*#__PURE__*/React.createElement("section", {
      style: {
        background: 'var(--surface-card)',
        borderTop: '1px solid var(--border-hairline)',
        borderBottom: '1px solid var(--border-hairline)',
        padding: 'var(--space-8)',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 'var(--space-6)',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(BrandMark, {
      variant: "roundel",
      size: 96,
      src: "../../assets/logo-roundel.png"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-2)'
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        fontFamily: 'var(--font-condensed)',
        fontSize: 'var(--text-h2)',
        textTransform: 'uppercase',
        fontWeight: 'var(--weight-semibold)'
      }
    }, "Capturing Light at Night"), /*#__PURE__*/React.createElement("p", {
      style: {
        color: 'var(--text-secondary)',
        margin: 0
      }
    }, "A talk for camera clubs, astronomy societies and dark-sky events. Four dates confirmed for 2026.")), /*#__PURE__*/React.createElement(Button, {
      onClick: () => onNavigate('#talks'),
      iconRight: "arrow-right"
    }, "Dates & booking")), /*#__PURE__*/React.createElement("section", {
      style: {
        padding: 'var(--gutter-section) var(--space-8)',
        display: 'grid',
        gap: 'var(--space-6)'
      }
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      eyebrow: "Free stuff",
      title: "Field cards for your phone",
      lead: "High-contrast reference cards you can download, keep offline, and read at 2am without ruining your night vision."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1.2fr',
        gap: 'var(--space-8)',
        alignItems: 'start'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-4)',
        justifyItems: 'start'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      iconLeft: "download",
      onClick: () => onNavigate('#free')
    }, "Browse the cards"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-caption)',
        color: 'var(--text-muted)'
      }
    }, "Free. No sign-up. PNG for your phone, PDF for your pocket.")), /*#__PURE__*/React.createElement(QuoteBlock, {
      quote: "The tranquility, silence and remoteness of shooting at night is just as compelling as the images themselves.",
      attribution: "Paul Haworth",
      style: {
        maxWidth: '40ch'
      }
    }))));
  }
  Object.assign(window, {
    HomeScreen
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/StoreScreen.jsx
try { (() => {
(function () {
  // Website UI kit — "Free stuff!" store listing.
  const {
    Card,
    Badge,
    Button,
    Tag,
    SectionHeading,
    Callout,
    Icon
  } = window.PaulHaworthNightscapesDesignSystem_721589;
  const PRODUCTS = [{
    id: 'bg-aurora',
    name: 'Zoom / Teams Aurora Virtual Background — Frohode Fantasi',
    kind: 'Backgrounds',
    price: '£0.00',
    ratio: '16 / 9',
    note: '1920×1080 JPEG'
  }, {
    id: 'card-500',
    name: 'Field Card 03 — The 500 Rule',
    kind: 'Field cards',
    price: '£0.00',
    ratio: '9 / 16',
    note: 'Phone wallpaper, PNG + PDF'
  }, {
    id: 'card-focus',
    name: 'Field Card 04 — Focusing in the Dark',
    kind: 'Field cards',
    price: '£0.00',
    ratio: '9 / 16',
    note: 'Phone wallpaper, PNG + PDF'
  }, {
    id: 'card-aurora',
    name: 'Field Card 07 — Reading an Aurora Forecast',
    kind: 'Field cards',
    price: '£0.00',
    ratio: '9 / 16',
    note: 'Phone wallpaper, PNG + PDF'
  }, {
    id: 'bg-mw',
    name: 'Zoom / Teams Milky Way Virtual Background — Black Beacon',
    kind: 'Backgrounds',
    price: '£0.00',
    ratio: '16 / 9',
    note: '1920×1080 JPEG'
  }, {
    id: 'checklist',
    name: 'Night Shoot Checklist',
    kind: 'Field cards',
    price: '£0.00',
    ratio: '9 / 16',
    note: 'Printable A6 + phone PNG'
  }];
  function StoreScreen({
    onNavigate
  }) {
    const [filter, setFilter] = React.useState(null);
    const [cart, setCart] = React.useState([]);
    const shown = filter ? PRODUCTS.filter(p => p.kind === filter) : PRODUCTS;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-7)',
        padding: 'var(--space-8)'
      }
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      eyebrow: "Free stuff",
      title: "Free stuff!",
      lead: "Virtual backgrounds and high-contrast field cards. Everything here is free \u2014 take what is useful and go outside."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        alignItems: 'center',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 'var(--space-3)',
        flexWrap: 'wrap'
      }
    }, ['Field cards', 'Backgrounds'].map(k => /*#__PURE__*/React.createElement(Tag, {
      key: k,
      selected: filter === k,
      onToggle: () => setFilter(filter === k ? null : k)
    }, k))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 'var(--space-3)',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ph-mono",
      style: {
        fontSize: 'var(--text-caption)',
        color: 'var(--text-muted)'
      }
    }, shown.length, " items"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      iconLeft: "shopping-bag"
    }, cart.length, " in basket"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
        gap: 'var(--space-5)'
      }
    }, shown.map(p => {
      const inCart = cart.includes(p.id);
      return /*#__PURE__*/React.createElement(Card, {
        key: p.id,
        padding: "0",
        interactive: true,
        style: {
          overflow: 'hidden',
          display: 'grid',
          gridTemplateRows: 'auto 1fr'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'relative',
          width: '100%',
          aspectRatio: p.ratio === '9 / 16' ? '4 / 3' : p.ratio,
          background: 'var(--surface-inset)'
        }
      }, /*#__PURE__*/React.createElement("image-slot", {
        id: 'ph-store-' + p.id,
        shape: "rect",
        placeholder: p.name
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          top: 10,
          left: 10,
          pointerEvents: 'none'
        }
      }, /*#__PURE__*/React.createElement(Badge, {
        tone: "accent"
      }, "Free"))), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'grid',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          alignContent: 'start'
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "ph-eyebrow",
        style: {
          color: 'var(--text-muted)'
        }
      }, p.kind), /*#__PURE__*/React.createElement("strong", {
        style: {
          fontSize: 'var(--text-body)',
          fontWeight: 'var(--weight-medium)',
          lineHeight: 1.35
        }
      }, p.name), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 'var(--text-caption)',
          color: 'var(--text-muted)'
        }
      }, p.note), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginTop: 'var(--space-2)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "ph-mono",
        style: {
          fontSize: 'var(--text-body)',
          color: 'var(--text-primary)'
        }
      }, p.price), /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: inCart ? 'secondary' : 'primary',
        iconLeft: inCart ? 'check' : 'download',
        onClick: e => {
          e.stopPropagation();
          setCart(inCart ? cart.filter(c => c !== p.id) : cart.concat(p.id));
        }
      }, inCart ? 'Added' : 'Get it'))));
    })), /*#__PURE__*/React.createElement(Callout, {
      tone: "darkskies",
      title: "A favour"
    }, "If a field card saves you a fumble in the dark, send me the picture you made with it \u2014", ' ', /*#__PURE__*/React.createElement("a", {
      href: "mailto:jpchaworth@gmail.com"
    }, "jpchaworth@gmail.com"), "."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 'var(--space-4)',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "moon-star",
      size: 18
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-caption)'
      }
    }, "Looking for the talk instead?"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      iconRight: "arrow-right",
      onClick: () => onNavigate('#talks')
    }, "Capturing Light at Night")));
  }
  Object.assign(window, {
    StoreScreen
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/StoreScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/TalksScreen.jsx
try { (() => {
(function () {
  // Website UI kit — "Book Me for Talks". Copy follows the live talks page.
  const {
    Button,
    Card,
    Badge,
    SectionHeading,
    Callout,
    Divider,
    Icon,
    QuoteBlock
  } = window.PaulHaworthNightscapesDesignSystem_721589;
  const DATES = [{
    date: '24 January 2026',
    place: 'Norwich',
    org: 'Astronomical Society'
  }, {
    date: '27 January 2026',
    place: 'St Neots',
    org: 'Camera Club'
  }, {
    date: '14 April 2026',
    place: 'Northampton – Duston',
    org: 'Camera Club'
  }, {
    date: '15 September 2026',
    place: 'Maidenhead',
    org: 'Camera Club'
  }];
  const COVERS = [['moon-star', 'The Milky Way, star trails, meteor showers and the aurora', 'Seen and photographed from locations across the UK and further afield.'], ['mountain', 'The adventure side of nightscape photography', 'Remote hikes, foul weather, tricky access, wildlife encounters, the occasional mishap.'], ['camera', 'Practical, beginner-friendly camera technique', 'The core settings and kit needed to get started, without overwhelming anyone.'], ['map', 'Planning a nightscape shoot', 'Weather and cloud forecasts, moon phase, scouting foregrounds with Google Earth and PhotoPills.'], ['moon', 'The reward of dark skies', 'Why the tranquility, silence and remoteness matters as much as the images.']];
  const AUDIENCES = ['Camera clubs', 'Astronomy societies', 'Observatories and Dark Sky Discovery sites', 'Nature reserves and AONBs', 'Wildlife trusts, national parks and tourism bodies'];
  const FAQS = [['Is the talk suitable for beginners?', 'Yes. It is designed to be accessible to people with little or no experience of night photography, while still offering enough depth to interest more experienced members.'], ['How long does the talk last?', 'The typical camera club format: roughly 45 minutes and 25 minutes in two parts, then questions. There is also a 60 minute version.'], ['How is the talk delivered?', 'Most engaging in person, but it has been delivered very successfully via Zoom and Teams with professional audio.'], ['Do you travel outside East Anglia?', 'Yes — from the Cambridgeshire Fens, with reimbursement for costs and time. Otherwise the remote version suits well.']];
  function TalksScreen() {
    const [open, setOpen] = React.useState(0);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid'
      }
    }, /*#__PURE__*/React.createElement("section", {
      style: {
        position: 'relative',
        minHeight: 420,
        display: 'grid',
        alignItems: 'end'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0
      }
    }, /*#__PURE__*/React.createElement("image-slot", {
      id: "ph-talks-hero",
      shape: "rect",
      placeholder: "Drop a talk hero image \u2014 Cygnus rising"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--scrim-bottom)',
        pointerEvents: 'none'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        padding: 'var(--space-8)',
        display: 'grid',
        gap: 'var(--space-4)',
        justifyItems: 'start'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: "accent"
    }, "Dates for 2026"), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-condensed)',
        fontSize: 'var(--text-poster)',
        textTransform: 'uppercase',
        fontWeight: 'var(--weight-semibold)',
        lineHeight: 0.95,
        margin: 0
      }
    }, "Capturing Light", /*#__PURE__*/React.createElement("br", null), "at Night"), /*#__PURE__*/React.createElement("p", {
      className: "ph-display",
      style: {
        fontSize: 'var(--text-h3)',
        fontStyle: 'italic',
        color: 'var(--text-secondary)',
        margin: 0
      }
    }, "Stories of adventure under the stars"))), /*#__PURE__*/React.createElement("section", {
      style: {
        padding: 'var(--gutter-section) var(--space-8)',
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: 'var(--space-8)',
        alignItems: 'start'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-5)'
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 'var(--text-lead)',
        fontWeight: 'var(--weight-light)',
        color: 'var(--text-secondary)',
        margin: 0
      }
    }, "Every image of a starlit landscape has a story behind it: a long drive to a dark corner of the coast, a battle with cloud that broke at just the right moment, a night spent alone on a clifftop waiting for the sky to do something extraordinary."), /*#__PURE__*/React.createElement("p", {
      style: {
        color: 'var(--text-secondary)',
        margin: 0
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        color: 'var(--text-primary)'
      }
    }, "Capturing Light at Night"), " is my talk for camera clubs, astronomy societies and public stargazing events, built around exactly those stories. It is designed to inspire your members to pick up a camera and give nightscape photography a go, while giving them enough practical grounding to actually make it happen."), /*#__PURE__*/React.createElement(Callout, {
      tone: "note",
      title: "Format"
    }, "Two versions: 45\u201360 minutes for outreach, or 80\u201390 minutes for a typical camera club, with questions afterwards. In person across East Anglia; online via Zoom or Teams with professional audio.")), /*#__PURE__*/React.createElement(Card, {
      variant: "raised",
      style: {
        display: 'grid',
        gap: 'var(--space-5)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 'var(--space-4)',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 84,
        height: 84,
        borderRadius: '50%',
        overflow: 'hidden',
        flex: '0 0 auto',
        border: '1px solid var(--border-hairline)'
      }
    }, /*#__PURE__*/React.createElement("image-slot", {
      id: "ph-talks-headshot",
      shape: "circle",
      placeholder: "Headshot"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-h4)',
        fontWeight: 'var(--weight-medium)'
      }
    }, "Paul Haworth"), /*#__PURE__*/React.createElement("span", {
      className: "ph-eyebrow",
      style: {
        color: 'var(--text-muted)'
      }
    }, "Cambridgeshire Fens"))), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-4)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ph-eyebrow",
      style: {
        color: 'var(--text-accent)'
      }
    }, "Confirmed dates"), DATES.map(d => /*#__PURE__*/React.createElement("div", {
      key: d.date,
      style: {
        display: 'grid',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "ph-mono",
      style: {
        fontSize: 'var(--text-caption)',
        color: 'var(--text-muted)'
      }
    }, d.date), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-body)'
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        fontWeight: 'var(--weight-semibold)'
      }
    }, d.place), ' ', /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-secondary)',
        fontWeight: 'var(--weight-light)'
      }
    }, d.org))))), /*#__PURE__*/React.createElement(Button, {
      fullWidth: true,
      iconRight: "mail",
      href: "mailto:jpchaworth@gmail.com?subject=Nightscape%20Talk%20Enquiry"
    }, "Check availability"))), /*#__PURE__*/React.createElement("section", {
      style: {
        padding: '0 var(--space-8) var(--gutter-section)',
        display: 'grid',
        gap: 'var(--space-6)'
      }
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      eyebrow: "What the talk covers",
      title: "Narrative and technique, in equal measure"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
        gap: 'var(--space-4)'
      }
    }, COVERS.map(([icon, title, body]) => /*#__PURE__*/React.createElement(Card, {
      key: title,
      variant: "outline",
      style: {
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 'var(--space-4)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: icon,
      size: 24,
      color: "var(--amber-500)"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        fontSize: 'var(--text-body)',
        fontWeight: 'var(--weight-semibold)'
      }
    }, title), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-body-sm)',
        color: 'var(--text-secondary)'
      }
    }, body)))))), /*#__PURE__*/React.createElement("section", {
      style: {
        background: 'var(--surface-card)',
        borderTop: '1px solid var(--border-hairline)',
        padding: 'var(--gutter-section) var(--space-8)',
        display: 'grid',
        gridTemplateColumns: '1fr 1.2fr',
        gap: 'var(--space-8)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-5)',
        alignContent: 'start'
      }
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      eyebrow: "Who it is for",
      title: "Groups I speak to"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-3)'
      }
    }, AUDIENCES.map(a => /*#__PURE__*/React.createElement("div", {
      key: a,
      style: {
        display: 'flex',
        gap: 'var(--space-3)',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 18,
      color: "var(--status-clear)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-secondary)'
      }
    }, a))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gap: 'var(--space-3)',
        alignContent: 'start'
      }
    }, /*#__PURE__*/React.createElement(SectionHeading, {
      eyebrow: "FAQs",
      title: "Before you email"
    }), FAQS.map(([q, a], i) => /*#__PURE__*/React.createElement(Card, {
      key: q,
      variant: open === i ? 'accent' : 'default',
      interactive: true,
      onClick: () => setOpen(open === i ? -1 : i),
      padding: "var(--space-4)"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        fontSize: 'var(--text-body-sm)',
        fontWeight: 'var(--weight-semibold)'
      }
    }, q), /*#__PURE__*/React.createElement(Icon, {
      name: open === i ? 'minus' : 'plus',
      size: 18,
      color: "var(--amber-500)"
    })), open === i && /*#__PURE__*/React.createElement("p", {
      style: {
        marginTop: 'var(--space-3)',
        fontSize: 'var(--text-body-sm)',
        color: 'var(--text-secondary)'
      }
    }, a))))), /*#__PURE__*/React.createElement("section", {
      style: {
        padding: 'var(--gutter-section) var(--space-8)',
        display: 'grid',
        justifyItems: 'center',
        gap: 'var(--space-5)',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement(QuoteBlock, {
      align: "center",
      quote: "Paul narrates stories of adventure under the stars and offers a practical introduction into the fascinating, and rather addictive, world of nightscape photography.",
      attribution: "About the talk"
    }), /*#__PURE__*/React.createElement(Button, {
      size: "lg",
      iconRight: "arrow-right",
      href: "mailto:jpchaworth@gmail.com?subject=Nightscape%20Talk%20Enquiry"
    }, "Get in touch")));
  }
  Object.assign(window, {
    TalksScreen
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/TalksScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.BrandMark = __ds_scope.BrandMark;

__ds_ns.Callout = __ds_scope.Callout;

__ds_ns.ExposureReadout = __ds_scope.ExposureReadout;

__ds_ns.ImageFrame = __ds_scope.ImageFrame;

__ds_ns.QuoteBlock = __ds_scope.QuoteBlock;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.StepList = __ds_scope.StepList;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.FormulaBlock = __ds_scope.FormulaBlock;

__ds_ns.NightVisionToggle = __ds_scope.NightVisionToggle;

__ds_ns.ReferenceCard = __ds_scope.ReferenceCard;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.NavBar = __ds_scope.NavBar;

__ds_ns.SiteFooter = __ds_scope.SiteFooter;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
