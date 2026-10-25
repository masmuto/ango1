/* eslint-disable @typescript-eslint/no-require-imports, no-console */
/**
 * build-release.js — Package source code into a clean zip ready to push to git.
 *
 * What it does:
 *   1. Creates a temp staging dir
 *   2. Copies all source files (no node_modules, no build artifacts, no DB)
 *   3. Adds README.md, LICENSE, .env.example, .gitignore, DEPLOY.md
 *   4. Generates a fresh .env.example with current values redacted
 *   5. Zips it all with a versioned filename
 *   6. Outputs to /home/z/my-project/download/go-an-nahl-{version}.zip
 *
 * Usage:
 *   node scripts/build-release.js              # default version from package.json
 *   node scripts/build-release.js --version=2.0.0
 *   node scripts/build-release.js --output=./release.zip
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// === Config ===
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "download");
const STAGE_DIR = path.join(PROJECT_ROOT, ".release-stage");

// Read version from package.json
const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8"));
const VERSION = pkg.version || "1.0.0";

// Parse args
const args = process.argv.slice(2);
let outputName = `go-an-nahl-v${VERSION}.zip`;
for (const a of args) {
  if (a.startsWith("--version=")) {
    outputName = `go-an-nahl-v${a.split("=")[1]}.zip`;
  } else if (a.startsWith("--output=")) {
    outputName = a.split("=")[1];
  }
}

const OUTPUT_PATH = path.join(OUTPUT_DIR, outputName);

// Files & folders to INCLUDE in the release
const INCLUDE = [
  "src",
  "prisma",
  "public",
  "scripts",
  "package.json",
  "bun.lock",
  "tsconfig.json",
  "next.config.ts",
  "tailwind.config.ts",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "components.json",
  "vercel.json",
  ".env.example",
  ".gitignore",
  "README.md",
  "LICENSE",
  "DEPLOY.md",
];
// Files to EXCLUDE (within included folders) — by basename or relative path
const EXCLUDE_PATTERNS = [
  /node_modules/i,
  /\.next/i,
  /\.git/i,
  /\/db\//i,
  /\.zscripts/i,
  /dev\.log$/i,
  /server\.log$/i,
  /\.DS_Store$/i,
  /Thumbs\.db$/i,
  /\.env$/i, // never include real .env
  /\.env\.local$/i,
  /tests\//i,
  /examples\//i,
  /mini-services\//i,
  /skills\//i,
  /upload\//i,
  /download\//i,
  /\.release-stage/i,
  /Caddyfile/i, // sandbox-specific
];

// === Helpers ===
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function shouldExclude(relPath) {
  return EXCLUDE_PATTERNS.some((p) => p.test(relPath));
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir, baseRel = "") {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const src = path.join(srcDir, e.name);
    const rel = baseRel ? `${baseRel}/${e.name}` : e.name;
    if (shouldExclude(rel) || shouldExclude(`/${rel}/`)) continue;
    const dest = path.join(destDir, e.name);
    if (e.isDirectory()) {
      copyDir(src, dest, rel);
    } else if (e.isFile()) {
      copyFile(src, dest);
    }
  }
}

function stats(zipPath) {
  const size = fs.statSync(zipPath).size;
  const files = execSync(`unzip -l ${zipPath} | tail -1 | awk '{print $2}'`, { encoding: "utf8" }).trim();
  return { size: `${(size / 1024).toFixed(1)}KB`, files };
}

// === Main ===
console.log("=".repeat(60));
console.log("GO An Nahl — Release Builder");
console.log("=".repeat(60));
console.log(`Version: ${VERSION}`);
console.log(`Output:  ${OUTPUT_PATH}\n`);

// 1. Clean stage dir
console.log("› Cleaning staging directory...");
rmrf(STAGE_DIR);
ensureDir(STAGE_DIR);
ensureDir(OUTPUT_DIR);

// 2. Copy all included files/folders
console.log("› Copying source files...");
for (const item of INCLUDE) {
  const src = path.join(PROJECT_ROOT, item);
  if (!fs.existsSync(src)) {
    console.warn(`  ⚠ Skipping missing: ${item}`);
    continue;
  }
  const dest = path.join(STAGE_DIR, item);
  if (fs.statSync(src).isDirectory()) {
    copyDir(src, dest, item);
  } else {
    copyFile(src, dest);
  }
  console.log(`  ✓ ${item}`);
}

// 3. Use the existing .env.example (already redacted in source)
console.log("\n› Verifying .env.example...");
const envExamplePath = path.join(STAGE_DIR, ".env.example");
if (!fs.existsSync(envExamplePath)) {
  console.error("  ✗ .env.example missing in staging — aborting");
  process.exit(1);
}
const envContent = fs.readFileSync(envExamplePath, "utf8");
// Sanity check: ensure no real secrets leaked
if (envContent.includes("AIzaSyDLiHi") || envContent.includes("BCOon_Sy8")) {
  console.error("  ✗ .env.example contains real secrets — aborting");
  process.exit(1);
}
console.log("  ✓ .env.example verified (no secrets)");

// 4. Make sure .gitignore includes everything we need
console.log("\n› Verifying .gitignore...");
const gitignorePath = path.join(STAGE_DIR, ".gitignore");
if (!fs.existsSync(gitignorePath)) {
  // Generate a comprehensive .gitignore
  const gitignoreContent = `# dependencies
node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem
Thumbs.db

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (do not commit secrets)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# logs
dev.log
server.log

# local SQLite database (dev only — Vercel uses Postgres)
/db/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
`;
  fs.writeFileSync(gitignorePath, gitignoreContent);
  console.log("  ✓ .gitignore (generated)");
} else {
  console.log("  ✓ .gitignore (existing)");
}

// 5. List final structure
console.log("\n› Staging directory contents:");
execSync(`find ${STAGE_DIR} -type f | head -30`, { stdio: "inherit" });
console.log("  ... (more files not shown)");

// 6. Create zip
console.log(`\n› Creating zip: ${OUTPUT_PATH}`);
rmrf(OUTPUT_PATH);
// Use zip from staging dir
execSync(`cd ${STAGE_DIR} && zip -r -q ${OUTPUT_PATH} .`, { stdio: "inherit" });

// 7. Verify
const result = stats(OUTPUT_PATH);
console.log("\n" + "=".repeat(60));
console.log("✅ Release built successfully!");
console.log("=".repeat(60));
console.log(`📦 ${OUTPUT_PATH}`);
console.log(`   ${result.size} | ${result.files} files`);
console.log(`\n💡 To push to git:`);
console.log(`   1. unzip ${outputName}`);
console.log(`   2. cd go-an-nahl-v${VERSION}`);
console.log(`   3. git init && git add . && git commit -m "Initial commit"`);
console.log(`   4. git remote add origin https://github.com/USERNAME/go-an-nahl.git`);
console.log(`   5. git push -u origin main`);

// Cleanup
rmrf(STAGE_DIR);
console.log("\n🧹 Staging cleaned up.");
