#!/usr/bin/env node
/* Simple zip packager for the Raku Capture Chrome extension. */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "..");
const outDir = path.resolve(repoRoot, "dist");
const outZip = path.join(outDir, "raku-capture-extension.zip");

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

const filesToInclude = [
  "manifest.json",
  "background.js",
  "config.js",
  "content",
  "popup",
  "options",
  "icons",
  "README.md",
];

// Prefer the `zip` binary — available on mac, linux, and WSL. On Windows without
// WSL use PowerShell's Compress-Archive via a tiny fallback (not needed for CI here).
try {
  execSync("zip --version", { stdio: "ignore" });
  execSync(
    `zip -r "${outZip}" ${filesToInclude.map((f) => `"${f}"`).join(" ")}`,
    { cwd: root, stdio: "inherit" },
  );
  console.log(`\n✓ Wrote ${path.relative(repoRoot, outZip)}`);
} catch (e) {
  console.error(
    "zip CLI not found. Install `zip` or package the folder manually.",
  );
  console.error(String(e?.message ?? e));
  process.exit(1);
}
