import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { execSync } from "child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export interface ReaTool {
  name: string;
  description: string;
  inputSchema: unknown;
  annotations?: Record<string, unknown> | null;
}

export interface ReaCallResult {
  content: string;
  isError: boolean;
}

// Compiled path: dist/core/reaClient.js  ->  plugin root  ->  REA/dist/main.js
// Plugin root = the directory that holds the cloned REA/ folder. We WALK UP
// from this file to find it, because the DEPTH of the build differs: `tsc` compiles to dist.core/... while `lms dev` compiles shallowly to
// .lmstudio/... A fixed dirname(N) depth therefore points at the wrong
// directory and fails to find REA/dist/main.js (the spawned MCP server).
// Walking up to the nearest ancestor that contains REA/ is depth-agnostic.
function findPluginRoot(startFile: string): string {
  let dir = dirname(startFile);
  for (;;) {
    if (existsSync(join(dir, "REA"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break; // reached the filesystem root
    dir = parent;
  }
  return dirname(startFile); // fallback: nearest known location
}

const PLUGIN_ROOT = findPluginRoot(__filename);
const REA_DIR = join(PLUGIN_ROOT, "REA");
const REA_MAIN = join(REA_DIR, "dist", "main.js");

// ---------------------------------------------------------------------------
// Lazy REA setup — moves the old postinstall logic into runtime so it works
// even when LM Studio's Hub install skips `postinstall` scripts.
// ---------------------------------------------------------------------------

let setupPromise: Promise<void> | null = null;
let setupComplete = false;

function logSetup(...args: string[]): void {
  console.log("[rea-mcp/setup]", ...args);
}

function setupExists(p: string): boolean {
  try {
    return existsSync(p);
  } catch {
    return false;
  }
}

function setupRun(cmd: string, { cwd = PLUGIN_ROOT }: { cwd?: string } = {}): boolean {
  logSetup("$ " + cmd);
  try {
    execSync(cmd, { cwd, stdio: "inherit" });
    return true;
  } catch (err) {
    const msg = String((err as Error & { stack?: string })?.stack ?? err ?? "");
    process.stderr.write("[rea-mcp/setup] ERROR: " + msg.replace(/\n.*/, "") + "\n");
    return false;
  }
}

/**
 * Ensure REA is cloned, dependencies installed, and runtime built.
 *
 * LM Studio explicitly does NOT run `postinstall` scripts when installing
 * plugins from the Hub (see their docs: "For safety reasons, we do not run
 * postinstall scripts."). This function moves that setup into runtime so the
 * plugin works regardless of how it was installed.
 *
 * Steps:
 *   [a] Clone https://github.com/morluto/rea into ./REA  (if missing)
 *   [b] `npm ci --ignore-scripts`  in REA/               (install deps)
 *   [c] Build REA runtime with tsc                         (build dist/)
 *
 * Each step is best-effort; a failure in one step does not silently break
 * the others.  A missing `git`/`npm` is reported as a clear error so the
 * user knows how to fix it.
 */
export async function ensureReaAvailable(): Promise<void> {
  if (setupComplete) return;
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    const REA_PACKJSON = join(REA_DIR, "package.json");

    // [a] Clone (or refresh) the original REA source tree, unchanged.
    if (!setupExists(join(REA_DIR, ".git")) && !setupExists(REA_PACKJSON)) {
      logSetup("Cloning morluto/rea into ./REA ...");
      if (!setupRun("git clone --depth 1 https://github.com/morluto/rea REA")) {
        logSetup("ERROR: git clone failed. The plugin needs REA to proxy its tools.");
        return;
      }
    } else {
      logSetup("./REA already present; refreshing with git pull ...");
      setupRun("git -C REA pull");
    }

    // [b][c] Shared Node environment: install REA's dependencies and build its runtime.
    if (setupExists(REA_PACKJSON)) {
      logSetup("Installing REA dependencies (npm ci; build scripts skipped) ...");
      let ok = setupRun("npm ci --ignore-scripts", { cwd: REA_DIR });
      if (!ok) {
        logSetup("npm ci failed; falling back to npm install --ignore-scripts ...");
        ok = setupRun("npm install --ignore-scripts", { cwd: REA_DIR });
      }
      // Build REA's compiled runtime (dist/) so the proxy can spawn its MCP server.
      if (setupExists(join(REA_DIR, "tsconfig.build.json"))) {
        logSetup("Building REA runtime (tsc -p tsconfig.build.json) ...");
        const tscBin = join(REA_DIR, "node_modules", "typescript", "bin", "tsc");
        if (setupExists(tscBin)) {
          setupRun("node " + tscBin + " -p tsconfig.build.json", { cwd: REA_DIR });
        } else {
          logSetup("NOTE: TypeScript not found; skipping REA build (proxy tools may be unavailable).");
        }
      }
    }

    if (!setupExists(REA_MAIN)) {
      logSetup("WARNING: REA/dist/main.js is missing.");
    } else {
      logSetup("Done. REA is ready at " + REA_MAIN);
    }

    setupComplete = true;
  })();

  try {
    await setupPromise;
  } catch (err) {
    // Log the error but don't throw — the first tool call will handle it.
    logSetup("Setup encountered an error: " + String((err as Error)?.message ?? err));
    setupComplete = true; // mark complete so we don't retry on every call
  }

  return setupPromise;
}

// Global (per-process) environment merged into each spawned REA server.
// `setReaEnv` is called by the tools provider with the LM Studio config.
let currentEnv: Record<string, string> = { ...process.env } as Record<string, string>;
export function setReaEnv(env: Record<string, string>): void {
  currentEnv = env;
}

interface Cache {
  client: Client | null;
  ready: boolean;
  error?: string;
}
let cache: Cache = { client: null, ready: false };

/**
 * Lazily (re)connect to REA's MCP server as a black-box child process.
 * The plugin never imports REA's code; it only spawns and talks to it over stdio.
 */
export async function getReaClient(): Promise<Client> {
  if (cache.ready && cache.client) return cache.client;
  if (!cache.ready && cache.error) throw new Error(cache.error);

  // Ensure REA is set up before spawning.
  await ensureReaAvailable();

  const transport = new StdioClientTransport({
    command: "node",
    args: [REA_MAIN],
    cwd: PLUGIN_ROOT,
    env: currentEnv,
    stderr: "inherit",
  });
  const client = new Client({ name: "rea-mcp-wrapper", version: "0.1.0" }, { capabilities: {} });
  try {
    await client.connect(transport);
  } catch (cause) {
    const msg = String((cause as Error)?.message ?? cause).replace(/\n.*/, "").slice(0, 200);
    cache = { client: null, ready: false, error: "REA MCP server failed to start: " + msg };
    throw new Error(cache.error);
  }
  cache = { client, ready: true };
  return client;
}

/** List every REA MCP tool (name, description, JSON inputSchema, annotations). */
export async function listReaTools(): Promise<ReaTool[]> {
  const client = await getReaClient();
  const res = await client.listTools();
  return (res.tools ?? []).map((t) => ({
    name: t.name,
    description: t.description ?? "",
    inputSchema: (t as { inputSchema?: unknown }).inputSchema,
    annotations: ((t as { annotations?: Record<string, unknown> | null }).annotations ?? null),
  }));
}

/** Call one REA MCP tool and return its formatted text result. */
export async function callReaTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
  signal?: AbortSignal | null,
): Promise<ReaCallResult> {
  const call = await client.callTool({ name, arguments: args ?? {} }, { signal: signal ?? undefined });
  const anyCall = call as { isError?: unknown; content?: unknown };
  return { content: formatContent(anyCall?.content), isError: Boolean(anyCall?.isError)};
}

const MAX_OUTPUT_CHARS = 16000;

function formatContent(content: unknown): string {
  if (!content) return "";
  const parts: string[] = [];
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block === "object") {
        const b = block as { type?: unknown; text?: unknown; name?: unknown; input?: unknown };
        if (b.type === "text" && typeof b.text === "string") {
          parts.push(b.text);
        } else if (b.type === "tool_use" || b.type === "toolUse") {
          parts.push(`[tool use: ${b.name ?? "unknown"} ${JSON.stringify(b.input ?? {}).slice(0, 300)}`);
        } else {
          parts.push(JSON.stringify(b));
        }
      } else {
        parts.push(String(block));
      }
    }
  } else {
    parts.push(String(content));
  }
  let text = parts.join("\n\n");
  if (text.length > MAX_OUTPUT_CHARS) {
    text = text.slice(0, MAX_OUTPUT_CHARS) + "\n... [output truncated]";
  }
  return text;
}
