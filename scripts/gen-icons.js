/* eslint-disable @typescript-eslint/no-require-imports */
// Generate PWA icons from scripts/icon-source.svg
// Outputs: public/icon-{192,512,maskable-512,apple-touch,favicon}.png
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SVG_PATH = path.join(__dirname, "icon-source.svg");
const OUT_DIR = path.join(__dirname, "..", "public");

if (!fs.existsSync(SVG_PATH)) {
  console.error("Source SVG not found:", SVG_PATH);
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const svg = fs.readFileSync(SVG_PATH);

const ICONS = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-512.png", size: 512, padded: true },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32.png", size: 32 },
  { name: "favicon-16.png", size: 16 },
];

async function genIcon({ name, size, padded }) {
  // For maskable: pad SVG inside solid background (gradient same as icon bg)
  let svgContent = svg;
  if (padded) {
    // For maskable icons, fill the entire canvas with the background gradient
    // and place the icon at ~70% of the canvas (safe zone for maskable)
    svgContent = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2D6A4F"/>
            <stop offset="100%" stop-color="#1B4332"/>
          </linearGradient>
        </defs>
        <rect width="512" height="512" fill="url(#bg)"/>
        <g transform="translate(77, 77) scale(0.7)">
          ${svg.toString().match(/<g filter="url\(#shadow\)">[\s\S]*?<\/g>\s*<\/g>/)?.[0] || ""}
        </g>
      </svg>`,
    );
  }
  await sharp(svgContent, { density: 384 })
    .resize(size, size, { fit: "contain" })
    .png()
    .toFile(path.join(OUT_DIR, name));
  console.log(`✓ ${name} (${size}x${size}${padded ? " maskable" : ""})`);
}

(async () => {
  for (const ic of ICONS) {
    await genIcon(ic);
  }
  // Generate favicon.ico (multi-size)
  const faviconPng = await sharp(svg, { density: 384 })
    .resize(32, 32, { fit: "contain" })
    .png()
    .toBuffer();
  // Sharp can't write ICO directly; just use favicon-32.png renamed
  fs.copyFileSync(path.join(OUT_DIR, "favicon-32.png"), path.join(OUT_DIR, "favicon.ico"));
  console.log("✓ favicon.ico (copied from favicon-32.png)");

  console.log("\nAll icons generated in public/");
})();
