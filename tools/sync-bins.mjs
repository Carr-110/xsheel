import fs from "node:fs";
import path from "node:path";

const packageRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const packageJsonPath = path.join(packageRoot, "package.json");

function isExecutableFile(stat) {
  return stat.isFile() && (stat.mode & 0o111) !== 0;
}

function findScripts() {
  const scripts = new Map();

  for (const relativeDir of ["scripts", "."]) {
    const dir = path.join(packageRoot, relativeDir);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "README.md") continue;
      if (entry.name === "package.json") continue;
      if (entry.name === "package-lock.json") continue;
      if (entry.name === "pnpm-lock.yaml") continue;
      if (entry.name === "yarn.lock") continue;
      if (entry.name === "AGENTS.md") continue;
      if (relativeDir === "." && (entry.name === "bin" || entry.name === "tools")) continue;

      const fullPath = path.join(dir, entry.name);
      const stat = fs.statSync(fullPath);
      if (!isExecutableFile(stat)) continue;

      const relativePath = path.relative(packageRoot, fullPath).replaceAll(path.sep, "/");
      scripts.set(entry.name, relativePath);
    }
  }

  return scripts;
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const scripts = findScripts();

const nextBin = { xsheel: "bin/xsheel.js" };
for (const [name, relPath] of [...scripts.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  nextBin[name] = relPath;
}

pkg.bin = nextBin;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");

