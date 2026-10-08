/* Builds assets/banner-light.svg and banner-dark.svg from the portfolio's own letterforms, portrait
   and glasses, plus the project logos. Run: node banner.mjs "<path to Theoportfolio>" */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const site = process.argv[2];
const sharp = createRequire(path.join(site, "package.json"))("sharp");
const { GLYPHS, TRACK, SPACE, sampleStroke, strokeRadius } =
  await import(pathToFileURL(path.join(site, "src/components/liquid-glyphs.ts")));

const n = v => +v.toFixed(1);

/* One line of text as a path: discs along each skeleton stroke, as the site draws its letters. */
function line(text, cap, x0, y0, track = TRACK) {
  let body = "", x = 0;
  for (const ch of text) {
    if (ch === " ") { x += SPACE; continue; }
    const strokes = GLYPHS[ch].strokes.map(stroke => {
      const { pts, len, loop } = sampleStroke(stroke);
      return pts.map(([px, py, t]) => [px, py, strokeRadius(stroke.caps, loop, t, py, len)]);
    });
    const all = strokes.flat();
    const left = Math.min(...all.map(([px, , r]) => px - r)), right = Math.max(...all.map(([px, , r]) => px + r));
    for (const pts of strokes) {
      let last = null;
      pts.forEach(([px, py, r], i) => {
        // Discs closer than 0.28r apart add nothing the eye can see.
        if (last && i < pts.length - 1 && Math.hypot(px - last[0], py - last[1]) < 0.28 * r) return;
        last = [px, py];
        const cx = x0 + (x - left + px) * cap, cy = y0 + py * cap, rr = r * cap;
        body += `M${n(cx - rr)} ${n(cy)}a${n(rr)} ${n(rr)} 0 1 0 ${n(2 * rr)} 0a${n(rr)} ${n(rr)} 0 1 0 ${n(-2 * rr)} 0`;
      });
    }
    x += right - left + track;
  }
  return { body, width: (x - track) * cap };
}

const W = 880, FRAME = 150, GAP = 38, TEXT_X = FRAME + GAP;
const NAME = "THEO CEDRIC CHAN", ROLE = "FULL-STACK DEVELOPER";
// Fit the name to the space beside the portrait.
const nameCap = (W - TEXT_X - 6) / line(NAME, 1, 0, 0).width;
const roleCap = nameCap * 0.46;
const H = FRAME + 20, NAME_Y = (H - nameCap * 1.34 - roleCap) / 2, ROLE_Y = NAME_Y + nameCap * 1.34;
const name = line(NAME, nameCap, TEXT_X, NAME_Y);
const role = line(ROLE, roleCap, TEXT_X + 2, ROLE_Y, TRACK * 2.4);

/* The 2x2: the hero's crop (.portrait is 160% wide, shifted -29%) and its calibrated glasses box. */
const photo = path.join(site, "Assets/Theo 2x2 hero.png");
const meta = await sharp(photo).metadata();
const PW = FRAME * 1.6, PH = PW * meta.height / meta.width;
const glasses = { x: 0.3385 * PW - 0.29 * FRAME, y: 0.351 * PH, w: 0.312 * PW };
const inner = file => readFileSync(path.join(site, "public", file), "utf8").replace(/^<svg[^>]*>|<\/svg>\s*$/g, "");

/* Plain, flat colour (the user's call, 2026-10-09: no glass effect here): GitHub's own text and
   secondary-text colours for each theme, so the banner reads like the page around it. */
const themes = {
  light: { ink: "#1f2328", soft: "#59636e", paper: "#f4f1ea", edge: "rgba(16,26,33,.16)", pair: "sunglasses-day.svg" },
  dark: { ink: "#f0f6fc", soft: "#9198a1", paper: "#181410", edge: "rgba(242,238,230,.2)", pair: "eyeglasses.svg" },
};

for (const [theme, c] of Object.entries(themes)) {
  const crop = await sharp(photo).resize(Math.round(PW * 2))
    .extract({ left: Math.round(0.29 * FRAME * 2), top: 0, width: FRAME * 2, height: FRAME * 2 })
    .flatten({ background: c.paper }).jpeg({ quality: 82 }).toBuffer();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Theo Cedric Chan, full-stack developer">
<defs>
<clipPath id="frame"><rect x="1" y="10" width="${FRAME}" height="${FRAME}" rx="20"/></clipPath>
</defs>
<g clip-path="url(#frame)">
<image x="1" y="10" width="${FRAME}" height="${FRAME}" href="data:image/jpeg;base64,${crop.toString("base64")}"/>
<svg x="${n(1 + glasses.x)}" y="${n(10 + glasses.y)}" width="${n(glasses.w)}" height="${n(glasses.w * 205 / 600)}" viewBox="0 8 600 205">${inner(c.pair)}</svg>
</g>
<rect x="1" y="10" width="${FRAME}" height="${FRAME}" rx="20" fill="none" stroke="${c.edge}"/>
<path d="${name.body}" fill="${c.ink}"/>
<path d="${role.body}" fill="${c.soft}"/>
</svg>
`;
  writeFileSync(`assets/banner-${theme}.svg`, svg);
  console.log(theme, (svg.length / 1024).toFixed(0) + "KB", "name cap", n(nameCap));
}

/* Project logos on the white rounded tile the portfolio's cards use. */
const tile = Buffer.from('<svg width="96" height="96"><rect width="96" height="96" rx="20"/></svg>');
for (const [out, file] of [["quickpitik", "quickpitik.png"], ["batchmyphotos", "Batchmyphotos.png"], ["invitica", "Invitica.png"], ["teknurse", "teknurse.png"]]) {
  const logo = await sharp(path.join(site, "Assets/Projects", file)).resize(76, 76, { fit: "contain", background: "#fff" }).flatten({ background: "#fff" }).toBuffer();
  await sharp({ create: { width: 96, height: 96, channels: 4, background: "#fff" } })
    .composite([{ input: logo }, { input: tile, blend: "dest-in" }]).png().toFile(`assets/logo-${out}.png`);
}
