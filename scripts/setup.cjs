"use strict";

// postinstall entry point for the rea-mcp LM Studio Plugin.
// It sets up the REA reference clone and a shared Node.js environment:
//   [a] clone https://github.com/morluto/rea into ./REA (unchanged, git-updatable)
//   [b] create the shared Node environment (install REA's dependencies)
//   [c] build REA's compiled runtime so the plugin can proxy its MCP tools
// Each step is best-effort and logged; a failure in one step does not silently
// break the others.

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PLUGIN_ROOT = path.dirname(__dirname); // .../rea-mcp
const REA_DIR = path.join(PLUGIN_ROOT, "REA");
const REA_MAIN = path.join(REA_DIR, "dist", "main.js");

function log(...args) {
  console.log("[rea-mcp/setup]", ...args);
}

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function run(cmd, { cwd = PLUGIN_ROOT } = {}) {
  log("$ " + cmd);
  try {
    execSync(cmd, { cwd, shell: true, stdio: "inherit" });
    return true;
  } catch (err) {
    process.stderr.write("[rea-mcp/setup] ERROR: " + String(err && err.stack ? err.stack : err) + "\n");
    return false;
  }
}

// [a] Clone (or refresh) the original REA source tree, unchanged.
if (!exists(path.join(REA_DIR, ".git")) && !exists(path.join(REA_DIR, "package.json")) ) {
  log("Cloning morluto/rea into ./REA ...");
  if (!run("git clone --depth 1 https://github.com/morluto/rea REA")) {
    log("ERROR: git clone failed. The plugin needs REA to proxy its tools.");
  }
} else {
  log("./REA already present; refreshing with git pull ...");
  run("git -C REA pull");
}

// [b][c] Shared Node environment: install REA's dependencies and build its runtime.
if (exists(path.join(REA_DIR, "package.json")) ) {
  log("Installing REA dependencies (npm ci; build scripts skipped for robustness) ...");
  let ok = run("npm ci --ignore-scripts", { cwd: REA_DIR });
  if (!ok) {
    log("npm ci failed; falling back to npm install --ignore-scripts ...");
    ok = run("npm install --ignore-scripts", { cwd: REA_DIR });
  }
  // Build REA's compiled runtime (dist/) so the proxy can spawn its MCP server.
  if (exists(path.join(REA_DIR, "tsconfig.build.json")) ) {
    log("Building REA runtime (tsc -p tsconfig.build.json) ...");
    // The pinned TypeScript ships as a Node script; invoke it directly.
    const tscBin = path.join(REA_DIR, "node_modules", "typescript", "bin", "tsc");
    if (exists(tscBin) ) {
      run("node " + tscBin + " -p tsconfig.build.json", { cwd: REA_DIR });
    } else {
      log("NOTE: TypeScript not found; skipping REA build (proxy tools may be unavailable).");
    }
  }
}

if (!exists(REA_MAIN)) {
  log("WARNING: REA/dist/main.js is missing. Reinstall the plugin or build REA in ./REA.");
} else {
  log("Done. REA is ready at " + REA_MAIN);
}
