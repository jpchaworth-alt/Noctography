/* Noctography PNG reader: unpacks a PNG's bytes straight into RGBA, without the browser's image
   decoder or a canvas. The ground tiles store height as colour (red x 256 + green + blue / 256),
   so a shift of one in red moves the ground 256 m. Two things in Firefox shift it: colour
   management converting the tile to the monitor's profile, and anti-fingerprinting noise on
   canvas read-back. Reading the file itself sidesteps both.

   NoctoPNG.decode(arrayBuffer) -> Promise<{ w, h, px: Uint8ClampedArray RGBA } | null>
   null for anything it does not handle (interlaced, 16-bit, no DecompressionStream), so the
   caller falls back to the canvas route.

   NoctoPNG.viaCanvas(arrayBuffer) -> the old route, for that fallback.
   NoctoPNG.honest: null until a tile has been read both ways, then true or false. */
(function(){
if (window.NoctoPNG) return;

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const ok = typeof DecompressionStream === 'function';

async function inflate(bytes){
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

async function decode(buf){
  if (!ok || !buf) return null;
  try {
    const b = new Uint8Array(buf);
    for (let i = 0; i < 8; i++) if (b[i] !== SIG[i]) return null;
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let p = 8, w = 0, h = 0, depth = 0, type = 0, lace = 0, pal = null, trns = null;
    const idat = [];
    let idatLen = 0;
    while (p + 8 <= b.length) {
      const len = dv.getUint32(p), t = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]), d = p + 8;
      if (t === 'IHDR') { w = dv.getUint32(d); h = dv.getUint32(d + 4); depth = b[d + 8]; type = b[d + 9]; lace = b[d + 12]; }
      else if (t === 'PLTE') pal = b.subarray(d, d + len);
      else if (t === 'tRNS') trns = b.subarray(d, d + len);
      else if (t === 'IDAT') { idat.push(b.subarray(d, d + len)); idatLen += len; }
      else if (t === 'IEND') break;
      p = d + len + 4;
    }
    if (!w || !h || depth !== 8 || lace !== 0) return null;
    const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
    if (!ch || (type === 3 && !pal)) return null;
    const z = new Uint8Array(idatLen);
    for (let i = 0, o = 0; i < idat.length; i++) { z.set(idat[i], o); o += idat[i].length; }
    const raw = await inflate(z);
    const stride = w * ch;
    if (raw.length < (stride + 1) * h) return null;
    const cur = new Uint8Array(stride * h);
    /* one tight loop per filter type: the general form with a branch per byte was most of the time */
    for (let y = 0; y < h; y++) {
      const f = raw[y * (stride + 1)], si = y * (stride + 1) + 1, di = y * stride, up = di - stride;
      if (f === 0 || (f === 2 && y === 0)) { cur.set(raw.subarray(si, si + stride), di); }
      else if (f === 1) { for (let x = 0; x < ch; x++) cur[di + x] = raw[si + x]; for (let x = ch; x < stride; x++) cur[di + x] = (raw[si + x] + cur[di + x - ch]) & 255; }
      else if (f === 2) { for (let x = 0; x < stride; x++) cur[di + x] = (raw[si + x] + cur[up + x]) & 255; }
      else if (f === 3) {
        if (y === 0) { for (let x = 0; x < ch; x++) cur[di + x] = raw[si + x]; for (let x = ch; x < stride; x++) cur[di + x] = (raw[si + x] + (cur[di + x - ch] >> 1)) & 255; }
        else { for (let x = 0; x < ch; x++) cur[di + x] = (raw[si + x] + (cur[up + x] >> 1)) & 255; for (let x = ch; x < stride; x++) cur[di + x] = (raw[si + x] + ((cur[di + x - ch] + cur[up + x]) >> 1)) & 255; }
      }
      else if (f === 4) {
        if (y === 0) { for (let x = 0; x < ch; x++) cur[di + x] = raw[si + x]; for (let x = ch; x < stride; x++) cur[di + x] = (raw[si + x] + cur[di + x - ch]) & 255; }
        else {
          for (let x = 0; x < ch; x++) cur[di + x] = (raw[si + x] + cur[up + x]) & 255;
          for (let x = ch; x < stride; x++) {
            const a = cur[di + x - ch], u = cur[up + x], c = cur[up + x - ch];
            const pa = Math.abs(u - c), pb = Math.abs(a - c), pc = Math.abs(a + u - c - c);
            cur[di + x] = (raw[si + x] + (pa <= pb && pa <= pc ? a : pb <= pc ? u : c)) & 255;
          }
        }
      }
      else return null;
    }
    const px = new Uint8ClampedArray(w * h * 4);
    for (let i = 0, s = 0, o = 0; i < w * h; i++, o += 4) {
      if (type === 6) { px[o] = cur[s]; px[o + 1] = cur[s + 1]; px[o + 2] = cur[s + 2]; px[o + 3] = cur[s + 3]; s += 4; }
      else if (type === 2) { px[o] = cur[s]; px[o + 1] = cur[s + 1]; px[o + 2] = cur[s + 2]; px[o + 3] = 255; s += 3; }
      else if (type === 3) { const k = cur[s++] * 3; px[o] = pal[k]; px[o + 1] = pal[k + 1]; px[o + 2] = pal[k + 2]; px[o + 3] = trns && cur[s - 1] < trns.length ? trns[cur[s - 1]] : 255; }
      else if (type === 0) { px[o] = px[o + 1] = px[o + 2] = cur[s++]; px[o + 3] = 255; }
      else { px[o] = px[o + 1] = px[o + 2] = cur[s]; px[o + 3] = cur[s + 1]; s += 2; }
    }
    return { w, h, px };
  } catch (e) { return null; }
}

async function viaCanvas(buf){
  try {
    const bm = await createImageBitmap(new Blob([buf]), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const w = bm.width, h = bm.height;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(bm, 0, 0);
    const px = cx.getImageData(0, 0, w, h).data;
    if (bm.close) bm.close();
    cv.width = cv.height = 0;
    return { w, h, px };
  } catch (e) { return null; }
}

/* Read once both ways and compare, so the app knows whether this browser alters image data. The
   heights never depend on the answer; only images that cannot be read directly (WebP) do. */
let checking = null;
function check(buf, direct){
  if (api.honest != null || checking || !direct) return;
  checking = viaCanvas(buf).then(c => {
    if (!c || c.w !== direct.w || c.h !== direct.h) return;
    let diff = 0;
    for (let i = 0; i < c.px.length; i += 4) if (c.px[i] !== direct.px[i] || c.px[i + 1] !== direct.px[i + 1] || c.px[i + 2] !== direct.px[i + 2]) diff++;
    api.honest = diff === 0;
    if (!api.honest) try { window.dispatchEvent(new CustomEvent('nocto-png-altered', { detail: { pixels: diff } })); } catch (e) {}
  }).catch(() => {});
}

/* the one call the ground readers use: direct when possible, the canvas otherwise */
async function rgba(buf){
  const d = await decode(buf);
  if (d) { check(buf, d); return d; }
  return viaCanvas(buf);
}

const api = { decode, viaCanvas, rgba, honest: null, direct: ok };
window.NoctoPNG = api;
})();
