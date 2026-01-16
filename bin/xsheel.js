#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const packageRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function isExecutableFile(stat) {
  return stat.isFile() && (stat.mode & 0o111) !== 0;
}

function listScripts() {
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
      if (entry.name === "node_modules") continue;
      if (relativeDir === "." && (entry.name === "bin" || entry.name === "tools")) continue;

      const fullPath = path.join(dir, entry.name);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }
      if (!isExecutableFile(stat)) continue;

      scripts.set(entry.name, fullPath);
    }
  }

  return [...scripts.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function printHelp() {
  const scripts = listScripts();
  const names = scripts.map(([name]) => name);
  process.stderr.write(
    [
      "Usage:",
      "  xsheel <script> [args...]",
      "  xsheel --list",
      "",
      "Scripts:",
      names.length ? `  ${names.join("\n  ")}` : "  (none found)",
      "",
      "Examples:",
      "  npx xsheel mwt",
      "  npx -p xsheel mwt",
    ].join("\n") + "\n",
  );
}

function run(scriptPath, args) {
  const child = spawn(scriptPath, args, { stdio: "inherit" });
  child.on("exit", (code, signal) => {
    if (signal) process.exit(128);
    process.exit(code ?? 1);
  });
  child.on("error", (err) => {
    process.stderr.write(`xsheel: failed to run: ${err?.message ?? String(err)}\n`);
    process.exit(1);
  });
}

const argv = process.argv.slice(2);
const sub = argv[0];

if (!sub || sub === "-h" || sub === "--help") {
  printHelp();
  process.exit(sub ? 0 : 1);
}

if (sub === "--list") {
  const scripts = listScripts();
  for (const [name] of scripts) process.stdout.write(name + "\n");
  process.exit(0);
}

if (sub.includes("/") || sub.includes("\\")) {
  process.stderr.write("xsheel: script name must not contain path separators\n");
  process.exit(1);
}

const scripts = new Map(listScripts());
const scriptPath = scripts.get(sub);
if (!scriptPath) {
  process.stderr.write(`xsheel: unknown script: ${sub}\n`);
  printHelp();
  process.exit(1);
}

run(scriptPath, argv.slice(1));

