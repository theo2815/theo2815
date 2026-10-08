/* Builds assets/banner-light.svg and banner-dark.svg: a terminal window with the portrait (and the
   portfolio's glasses) beside the name in block letters. Also the project logo tiles.
   Run: node banner.mjs "<path to Theoportfolio>" */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const site = process.argv[2];
const sharp = createRequire(path.join(site, "package.json"))("sharp");
const n = v => +v.toFixed(1);

const TITLE = "theocedric@cebu: ~";
const ROLE = "full-stack developer · open to internships and freelance";

const W = 880, BAR = 34, PAD = 22, FRAME = 132, H = BAR + PAD * 2 + FRAME;
const FACE_X = PAD + 2, FACE_Y = BAR + PAD, TEXT_X = FACE_X + FRAME + 26;

/* name.txt is the name in figlet's "ANSI Shadow". It is drawn as shapes, not typed as text, so the
   blocks and their shadow lines meet exactly whatever monospace font the visitor has. */
const rows = readFileSync("name.txt", "utf8").split("\n").filter(Boolean).map(row => [...row]);
const cols = Math.max(...rows.map(row => row.length));
const CW = (W - PAD - 4 - TEXT_X) / cols, CH = CW * 2;
const NAME_H = rows.length * CH, NAME_Y = BAR + (H - BAR - NAME_H) / 2 + 2;
// Double lines sit at 30% and 70% of the cell. Each corner is [outer, inner] as "from side, turn".
const A = 0.3, B = 0.7;
const corner = { "╗": [0, 1], "╔": [1, 1], "╝": [0, 0], "╚": [1, 0] };
let blocks = "", lines = "";
rows.forEach((row, r) => {
  const y = NAME_Y + r * CH;
  for (let c = 0; c < row.length; c++) {
    const x = TEXT_X + c * CW, ch = row[c];
    if (ch === "█") {
      let run = 1;
      while (row[c + run] === "█") run++;
      // A hair wider and taller than the cell, so neighbouring blocks leave no seam.
      blocks += `M${n(x)} ${n(y)}h${n(run * CW + 0.3)}v${n(CH + 0.3)}h${n(-run * CW - 0.3)}z`;
      c += run - 1;
    } else if (ch === "═") lines += `M${n(x)} ${n(y + A * CH)}h${n(CW)}M${n(x)} ${n(y + B * CH)}h${n(CW)}`;
    else if (ch === "║") lines += `M${n(x + A * CW)} ${n(y)}v${n(CH)}M${n(x + B * CW)} ${n(y)}v${n(CH)}`;
    else if (corner[ch]) {
      const [fromRight, down] = corner[ch];
      const start = fromRight ? x + CW : x, end = down ? y + CH : y;
      // The outer line turns at the far rail, the inner one at the near rail.
      const far = fromRight ? A : B, near = fromRight ? B : A, first = down ? A : B, second = down ? B : A;
      lines += `M${n(start)} ${n(y + first * CH)}H${n(x + far * CW)}V${n(end)}M${n(start)} ${n(y + second * CH)}H${n(x + near * CW)}V${n(end)}`;
    }
  }
});

/* The 2x2: the hero's crop (.portrait is 160% wide, shifted -29%) and its calibrated glasses box. */
const photo = path.join(site, "Assets/Theo 2x2 hero.png");
const meta = await sharp(photo).metadata();
const PW = FRAME * 1.6, PH = PW * meta.height / meta.width;
const glasses = { x: 0.3385 * PW - 0.29 * FRAME, y: 0.351 * PH, w: 0.312 * PW };
const inner = file => readFileSync(path.join(site, "public", file), "utf8").replace(/^<svg[^>]*>|<\/svg>\s*$/g, "");

/* GitHub's own colours for each theme, so the window reads as part of the page. */
const themes = {
  light: { ink: "#1f2328", soft: "#59636e", card: "#f6f8fa", line: "#d1d9e0", prompt: "#1a7f37", paper: "#f4f1ea", pair: "sunglasses-day.svg" },
  dark: { ink: "#f0f6fc", soft: "#9198a1", card: "#151b23", line: "#3d444d", prompt: "#3fb950", paper: "#181410", pair: "eyeglasses.svg" },
};

for (const [theme, c] of Object.entries(themes)) {
  const crop = await sharp(photo).resize(Math.round(PW * 2))
    .extract({ left: Math.round(0.29 * FRAME * 2), top: 0, width: FRAME * 2, height: FRAME * 2 })
    .flatten({ background: c.paper }).jpeg({ quality: 82 }).toBuffer();
  /* Everything is visible without the animations (they only fill backwards), so a viewer that does
     not run them still shows the finished window. */
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Theo Cedric Chan, full-stack developer">
<style>
text{font:14px ui-monospace,SFMono-Regular,"Cascadia Mono",Consolas,Menlo,monospace}
.cover{transform-box:fill-box;transform-origin:right;animation:type .7s steps(6) .5s backwards}
.name{animation:show .01s 1.5s backwards}.role{animation:show .01s 1.9s backwards}
.cur{animation:blink 1s steps(1) 1.9s infinite}
@keyframes type{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@keyframes show{from{opacity:0}}
@keyframes blink{50%{opacity:0}}
</style>
<defs>
<clipPath id="win"><rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12"/></clipPath>
<clipPath id="frame"><rect x="${FACE_X}" y="${FACE_Y}" width="${FRAME}" height="${FRAME}" rx="18"/></clipPath>
</defs>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="${c.card}" stroke="${c.line}"/>
<path d="M0 ${BAR}.5h${W}" stroke="${c.line}" clip-path="url(#win)"/>
<circle cx="20" cy="${BAR / 2}" r="5.5" fill="#ff5f57"/><circle cx="38" cy="${BAR / 2}" r="5.5" fill="#febc2e"/><circle cx="56" cy="${BAR / 2}" r="5.5" fill="#28c840"/>
<text x="78" y="${BAR / 2 + 4}" fill="${c.soft}" style="font-size:12px">${TITLE}</text>
<g clip-path="url(#frame)">
<image x="${FACE_X}" y="${FACE_Y}" width="${FRAME}" height="${FRAME}" href="data:image/jpeg;base64,${crop.toString("base64")}"/>
<svg x="${n(FACE_X + glasses.x)}" y="${n(FACE_Y + glasses.y)}" width="${n(glasses.w)}" height="${n(glasses.w * 205 / 600)}" viewBox="0 8 600 205">${inner(c.pair)}</svg>
</g>
<rect x="${FACE_X}" y="${FACE_Y}" width="${FRAME}" height="${FRAME}" rx="18" fill="none" stroke="${c.line}"/>
<text x="${n(TEXT_X)}" y="${n(NAME_Y - 14)}" fill="${c.ink}"><tspan fill="${c.prompt}" font-weight="700">$</tspan> whoami</text>
<rect class="cover" x="${n(TEXT_X + 14)}" y="${n(NAME_Y - 28)}" width="64" height="20" fill="${c.card}" transform="scale(0 1)"/>
<g class="name"><path d="${blocks}" fill="${c.ink}"/><path d="${lines}" fill="none" stroke="${c.soft}" stroke-width=".8"/></g>
<text class="role" x="${n(TEXT_X)}" y="${n(NAME_Y + NAME_H + 22)}" fill="${c.soft}">${ROLE} <tspan class="cur" fill="${c.ink}">█</tspan></text>
</svg>
`;
  writeFileSync(`assets/banner-${theme}.svg`, svg);
  console.log(theme, (svg.length / 1024).toFixed(0) + "KB", "cell", n(CW), "x", n(CH));
}

/* Project logos on the white rounded tile the portfolio's cards use. */
const tile = Buffer.from('<svg width="96" height="96"><rect width="96" height="96" rx="20"/></svg>');
for (const [out, file] of [["quickpitik", "quickpitik.png"], ["batchmyphotos", "Batchmyphotos.png"], ["invitica", "Invitica.png"], ["teknurse", "teknurse.png"]]) {
  const logo = await sharp(path.join(site, "Assets/Projects", file)).resize(76, 76, { fit: "contain", background: "#fff" }).flatten({ background: "#fff" }).toBuffer();
  await sharp({ create: { width: 96, height: 96, channels: 4, background: "#fff" } })
    .composite([{ input: logo }, { input: tile, blend: "dest-in" }]).png().toFile(`assets/logo-${out}.png`);
}
