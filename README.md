# rea-mcp

**A [LM Studio](https://lmstudio.ai/) plugin that exposes [REA](https://github.com/morluto/rea) ("Reverse Engineer Anything") reverse-engineering MCP tools inside LM Studio.**

---

## What this is

`rea-mcp` is a **lightweight TypeScript wrapper** around the original
[`morluto/rea`](https://github.com/morluto/rea) project. REA is a single MCP
server that lets you *see how something works, down to the binary level* —
static analysis of native binaries, JavaScript/Electron/web apps, .NET
assemblies, EVM bytecode, Android packages, firmware, and Apple apps — plus
dynamic tracing and capture.

This plugin **does not re-implement REA**. It *re-declares* each of REA's MCP
tools for LM Studio and **delegates each call to the original REA MCP server**,
spawned as a black-box child process. REA's source tree is cloned into `./REA`
and is **left untouched**, so you can still update REA with `git pull` / `npm
upgrade` independently of this plugin.

> This plugin is **only** the LM Studio Plugin MCP server. The original REA
> `standalone` MCP server, CLI, and all of its tooling are **not** ported or
> maintained here — they live in and are maintained by the upstream project.

---

## What you can do (tool summary)

After installing, `rea-mcp` exposes **170+ MCP tools** from REA. They fall into
roughly these groups:

| Group | What it does | Example tools |
| --- | --- | --- |
| **Native / static** | Disassemble & decompile PE/Mach-O/ELF, read instructions, names, procedures, strings, data types | `inspect_native_instruction`, `procedure_pseudo_code`, `list_names`, `read_bytes` |
| **Provider front-ends** | Drive Hopper, Ghidra, IDA, ILSpy (.NET), or the JS/Electron/web stack | `analysis_provider` (configurable) |
| **JavaScript / Electron / web** | Analyze, bundle, diff, extract, and observe running web apps | `analyze_javascript_application`, `analyze_web_bundle`, `compare_web_screenshots` |
| **.NET / EVM / Android / firmware / Apple** | Inspect and decompile managed code, smart contracts, APKs, firmware images, IPA packages | `inspect_managed_members`, `inspect_evm_interface`, `inspect_android_package`, `extract_firmware`, `inspect_macho` |
| **Dynamic / capture** | Attach to processes, ADB devices, browsers, Electron apps; trace values and calls | `capture_process_scenario`, `trace_native_values`, `capture_adb_screen`, `observe_web_execution` |
| **Inspect / resolve / trace** | Deep per-symbol inspection, call/reference resolution, semantic tracing | `inspect_native_api`, `resolve_native_call_targets`, `trace_javascript_semantics` |
| **Evidence / reconstruction** | Build and export evidence bundles, reconstruction ledgers, coverage | `export_evidence_bundle`, `build_reconstruction_obligation_ledger`, `evaluate_reconstruction_coverage` |
| **Filesystem / ADB helpers** | Read files, browse ADB directories, install/pull/pull packages | `extract_artifact`, `pull_adb_package`, `read_adb_logcat` |

Every tool keeps REA's original **name, description, and input schema**. The
plugin forwards your arguments to REA and returns the formatted result (with a
safety cap on output size). When an analysis tool is not reachable, REA returns
an error that the plugin forwards to you.

---

## Requirements

> **LM Studio Hub install note:** LM Studio does **not** run `postinstall`
> scripts when installing plugins from the Hub (per their docs: *"For safety
> reasons, we do not run postinstall scripts"*).  To compensate, this plugin
> contains a **runtime setup step** that clones and builds REA automatically
> when the plugin first loads — so installing from the Hub works out of the
> box as long as `git` and `npm` are on the system's `PATH`.

### Must install these external tools

Every tool is wired up and callable from LM Studio, but each **category** of tool
depends on an **external tool** that must be installed before that category of
tools can return real results. If the dependency is missing the tool still runs,
but returns `unavailable` / `capability_unavailable` instead.

| External tool | Install how | Must-have for these MCP tools |
| --- | --- | --- |
| **Ghidra** + **JDK (Java)** | download & set `ghidraInstallDir` / `JAVA_HOME` | `procedure_pseudo_code`, `procedure_assembly`, `procedure_info`, `procedure_callees`, `procedure_callers`, `procedure_references`, `read_function_instructions`, `inspect_native_instruction`, `inspect_native_data_type`, `inspect_native_load_image`, `resolve_native_call_targets`, `address_name`, `comment`, `goto_address`, `inline_comment`, `list_bookmarks`, `list_names`, `list_procedures`, `list_segments`, `list_strings`, `next_address`, `prev_address`, `procedure_address`, `search_procedures`, `search_strings`, `set_address_name`, `set_addresses_names`, `set_bookmark`, `set_comment`, `set_inline_comment`, `unset_bookmark`, `xrefs`, `trace_native_values`, `inspect_native_api`, `trace_feature`, `trace_call_path`, `batch_decompile`, `get_call_graph`, `analyze_swift_types`, `find_xrefs_to_name`, `binary_overview`, `analyze_function`, `inspect_native_dispatch_metadata`, `demangle_swift`, `get_objc_classes`, `get_objc_protocols`, `annotate_native_function`, `get_navigation_context`, `inspect_address_context` |
| **Hopper** | download & set `hopperLauncherPath` | Same as Ghidra **plus** `comment`, `set_comment`, `inline_comment`, `set_inline_comment`, `set_bookmark`, `unset_bookmark`, `list_bookmarks`, `goto_address`, `next_address`, `prev_address` (Hopper adds these nav/comment ops that Ghidra lacks) |
| **IDA** + `idamcp.json` | install IDA + set `idaMcpConfig` | Same as Ghidra / Hopper (provider-based) |
| **ILSpy** (.NET CLI) | install & set `ilspyCmdPath` | `inspect_managed_artifact`, `inspect_managed_members`, `inspect_managed_native_boundaries`, `compare_managed_members`, `verify_managed_native_boundaries`, `import_managed_reconstruction`, `project_managed_application_graph`, `inspect_managed_artifact` |
| **WABT** (1.0.42 — `wat2wasm`/`wasm2wat`) | install on `PATH` | `inspect_wasm_artifact` |
| **Chrome / Chromium** (with `--remote-debugging-port`) | launch with remote debugging | `analyze_web_bundle`, `inspect_web_page`, `observe_web_session`, `discover_webmcp_tools`, `compare_web_captures`, `capture_web_screenshot`, `compare_web_screenshots`, `capture_browser_scenario`, `list_browser_targets`, `list_electron_targets`, `inspect_electron_page`, `export_web_scripts`, `observe_web_execution`, `trace_web_module_imports`, `trace_web_source_location`, `inspect_web_network_capture`, `compare_web_captures`, `compare_web_screenshots` |
| **V8 inspector** endpoint | attach to Node / Deno | `observe_javascript_runtime`, `list_javascript_runtime_targets` |
| **Electron app** (with `--inspect`) | run the target with `--inspect` | `capture_electron_scenario`, `inspect_electron_page`, `list_electron_targets` |
| **Android platform-tools** (adb) | install Android SDK platform-tools | `inspect_adb_client`, `list_adb_devices`, `inspect_adb_device`, `list_adb_packages`, `pull_adb_package`, `read_adb_logcat`, `inspect_adb_package`, `pull_adb_file`, `push_adb_file`, `capture_adb_screen`, `list_adb_processes`, `list_adb_directory`, `list_adb_features`, `list_adb_services`, `inspect_adb_display`, `inspect_adb_window`, `read_adb_setting`, `collect_adb_bugreport`, `resolve_adb_packages`, `install_adb_package`, `uninstall_adb_package`, `start_adb_app`, `start_adb_activity`, `stop_adb_app` |
| **jadx** (jadx-headless-mcp 0.7.1) + JDK | download JAR, set `REAAJADX_MCP_JAR` | `inspect_android_package`, `search_android_classes`, `inspect_android_class`, `inspect_android_method`, `trace_android_references`, `decode_android_resources` |
| **JEB** (client) | start a JEB client | `inspect_jeb_client`, `open_jeb_project`, `list_jeb_units`, `decompile_jeb_item` |
| **apktool** | install (e.g. `apt install apktool` or `brew install apktool`) | `inspect_apktool_client`, `decode_android_resources` |
| **Unblob** | install (https://github.com/airbus-cert/unblob) | `inspect_firmware_regions`, `extract_firmware` |
| **pwntools** / **pyelftools** | `pip install pwntools pyelftools` | `inspect_binary_layout` |
| **pwndbg** (bridge) | run the pwndbg bridge | `inspect_recorded_crash` |
| **macOS** (native toolchain) | run on macOS (or cross-compile Mach-O artifacts) | `inspect_macho`, `inspect_signature`, `decode_interface_builder`, `inspect_keyed_archive`, `inspect_asset_catalog`, `trace_dylib_resolution`, `project_apple_application_graph` |

> **No extra tool needed:** these tools work out of the box without any
> external analysis tool:
> `inspect_evm_interface` (EVM bytecode), `inspect_plist` (Apple plist),
> `inspect_artifact` / `extract_artifact` (tar/zip archives), `binary_session`,
> `list_documents`, `list_unknowns`, `close_binary`, `get_evidence_bundle`,
> `export_evidence_bundle`, `import_evidence_bundle`, `capture_process_scenario`,
> `get_system_info`, `current_time`, `calculate`.
> Native analysis requires a provider (Hopper / Ghidra / IDA / `auto`) — choose
> one in **Settings → Native analysis provider**.

#### Optional — tools that only help with edge cases

| Tool | When you need it |
| --- | --- |
| **Go compiler** | *Not required.* `inspect_go_binary` parses Go metadata from ELF binaries without the Go toolchain. |
| **.NET SDK / dotnet** | *Not required.* `inspect_managed_artifact` reads .NET assemblies without the .NET runtime. |

#### How the plugin sets up REA (for Hub installs)

When installed from the LM Studio Hub (via `lms get`), the plugin's `postinstall`
script is **not** executed (LM Studio skips it for security).  This plugin
compensates by performing the setup at **runtime** on first use:

1. **Clone** `https://github.com/morluto/rea` into `./REA` (if not already present)
2. **Install** REA's dependencies (`npm ci --ignore-scripts` in `./REA`)
3. **Build** REA's compiled runtime (`tsc -p tsconfig.build.json`)

This requires `git` and `npm` to be on your system's `PATH`.  If either is
missing, the plugin logs a clear error message and the tools will be unavailable
until you install the missing tool and reload the plugin.

For local development, `scripts/setup.cjs` still runs via `postinstall` when
you run `npm install` directly — so the runtime setup is only a fallback.

---

## Installation

### Option A — from the LM Studio Hub

1. In LM Studio, open **Plugins** → **Install / Browse the Hub**.
2. Find **`rea-mcp`** (owner **`hoonowng`**) and click **Install**.
3. Enable the plugin. When the plugin first loads, it checks whether `./REA/dist/main.js` exists.
   If not, it runs a **runtime setup** (clone + `npm ci` + build).
   This replaces the old `postinstall` step that LM Studio Hub skips.

### Option B — from source (local / self-hosted)

```bash
git clone <this repository> rea-mcp
cd rea-mcp
npm install        # triggers scripts/setup.cjs: clones REA into ./REA, npm ci, build
npm run build      # compiles the plugin to dist/
```

Then load the compiled plugin in LM Studio, or expose it as an external MCP
server (see [Development](#development)).

---

## Updating REA (the upstream project)

`./REA` is the **original [`morluto/rea`](https://github.com/morluto/rea)** source
tree, cloned and left **untouched** — so you keep REA's own history and can update
it independently of this plugin. This plugin re-declares REA's tools at **each
load**, so new / renamed / removed tools show up automatically **once REA's
compiled runtime is rebuilt** (see step 2–3 below).

### 1. Pull the latest REA source

```bash
cd REA
git pull            # update the upstream source tree
```

> `setup.cjs` installs REA with `git clone --depth 1`, so `git pull` updates the
> shallow head. To follow the full history / tags, deep-clone instead:
> `git clone --depth 100 https://github.com/morluto/rea REA` (then `git pull`).

### 2. REBUILD REA (required)

REA's `dist/main.js` is **gitignored build output** (`.gitignore` → `dist/`). A
`git pull` only changes the **source**; the compiled server stays **stale** until
you rebuild it. **Without a rebuild, new tools will NOT appear.**

```bash
cd REA
npm run compile     # tsc -p tsconfig.build.json  ->  regenerates REA/dist/main.js
```

If `npm run compile` fails (e.g. a pinned / patched TypeScript), invoke the pinned
compiler directly — exactly as `setup.cjs` does:

```bash
cd REA
node node_modules/typescript/bin/tsc -p tsconfig.build.json
```

### 3. Reload the plugin

- **`lms dev`** hot-reloads the plugin — no restart needed.
- Otherwise, **restart** the MCP connection / LM Studio (Plugins → disable →
  enable `rea-mcp`).

Each reload re-queries REA (`tools/list`) and re-declares its tools, so the new
tools are available immediately.

### Easier alternative: re-run the install

Re-running the plugin's install re-does everything for you — it pulls **and**
rebuilds REA:

```bash
cd ..            # back in the rea-mcp plugin directory
npm install      # postinstall: git pull in ./REA + npm ci + build REA
npm run build    # (re)compile the wrapper
```

### Quick reference

| What you run | Effect | New tools appear? |
| --- | --- | --- |
| `cd REA && git pull` | updates **source** only (`dist` is gitignored) | **No** — must rebuild |
| `cd REA && npm run compile` | rebuilds `dist/main.js` | Yes, on next reload |
| `cd .. && npm install` | `git pull` **and** rebuilds REA | Yes, on next reload |

---

## Usage

1. Start the LM Studio local server:

   ```bash
   lms server start
   ```

2. Install and **enable** the `rea-mcp` plugin (Plugins tab).
3. In your chat, the REA tools appear as **MCP tools**. Describe what you want to
   understand and let the model call them, e.g. *"decompile this procedure"* or
   *"find all string references in this binary."*
4. If a native/managed tool is not on your `PATH`, set its path in the plugin's
   **Settings** (see [Configuration](#configuration)).
5. Each tool call streams status (`Working…`) and returns formatted text; errors
   are returned as clear messages you can act on.

**Tips**

- Start small: `binary_session` / `binary_overview` to confirm the target and
  provider, then `list_names`, `list_procedures`, `procedure_pseudo_code`.
- Large outputs are capped automatically; ask the model to focus or narrow the
  address/procedure before re-calling.
- Native analysis is **local** and returns observations, limitations, and
  unknowns — treat "not found / not supported" as real signal.

---

## Configuration (plugin Settings)

All settings are **global** (apply to every chat). Leave a field **blank** to
use REA's platform default. Open **Plugins → rea-mcp → Settings**.

| Setting | Purpose |
| --- | --- |
| **Native analysis provider** | `hopper` \| `ghidra` \| `ida` \| `dotnet` \| `javascript` \| `auto`. Blank = auto. |
| **Hopper launcher path** | Absolute path to the Hopper executable. Blank = default. |
| **Ghidra install dir** | Absolute path to a Ghidra installation. Blank = default. |
| **JAVA_HOME** | Path to a JDK (Ghidra needs one). Blank = default. |
| **IDA MCP config path** | Path to an `idamcp.json` for IDA. Blank = default. |
| **ILSpy command path** | Path to the ILSpy CLI for .NET. Blank = default. |
| **Ghidra NativeAOT jar** | Path to a Ghidra NativeAOT jar. Blank = default. |
| **Ghidra seed file** | Path to a Ghidra seed file. Blank = default. |
| **Ghidra startup timeout (ms)** | Raise for slow/large binaries. Blank = default. |
| **Log level** | `trace` … `silent`. Default `info`. |

> **Security:** no API keys or secrets are stored by this plugin. Never paste
> secrets into tool arguments you don't want the model to see.

---

## How it works / Migration summary

**Goal:** make REA usable as an LM Studio Plugin MCP server while keeping the
original REA source tree pristine and updatable.

**Approach — a thin wrapper, no re-implementation:**

- The original REA is cloned into `./REA` and is **never imported or modified**.
- `src/toolsProvider.ts` lists REA's tools and **re-declares each one** for LM
  Studio (same name/description/schema), then each `implementation` spawns REA's
  MCP server (`dist/main.js`) and forwards the call over stdio.
- `src/core/reaClient.ts` owns the black-box MCP client: lazy connect, tool
  listing, tool calling, output capping, and error formatting.
- `src/core/schemaConverter.ts` converts each tool's JSON `inputSchema` to the
  `zod` shape LM Studio needs.
- `src/core/externalConfig.ts` + `src/config.ts` map the plugin's global
  settings to REA's `REA_*` environment variables (empty = default).
- `scripts/setup.cjs` (`postinstall`) performs the clone + Node environment
  setup described under [Installation](#installation).

**Standalone MCP is intentionally not ported.** This repo maintains only the
LM Studio Plugin entry (`dist/index.js` → `toolsProvider`). The upstream REA
`standalone` server, CLI, and bridges remain in and are maintained by
[`morluto/rea`](https://github.com/morluto/rea).

**Build / verify:**

```bash
npm run typecheck   # tsc --noEmit, zero errors
npm run build       # tsc -> dist/
```

---

## Development

```bash
npm install            # postinstall clones + sets up REA
npm run typecheck      # type-check
npm run build          # compile to dist/
lms dev                # (if using the LM Studio dev loop) hot-reload the plugin
```

> **Tip:** This plugin re-declares REA's tools at **each load**, so to pick up
> upstream changes, update the cloned REA — see [Updating REA](#updating-rea-the-upstream-project).

To run the plugin as an **external MCP server** for other hosts, add your
project's `dist/index.js` (or the plugin's tool entry) to the host's `mcp.json`
`command`/`args`. (This repo's canonical entry point is the LM Studio Plugin.)

---

## Acknowledgments

**`rea-mcp` is a wrapper around [`morluto/rea`](https://github.com/morluto/rea).**
We strongly thank **morluto** and the REA contributors for building and
maintaining REA — an open, local, and powerful "reverse engineer anything" MCP
server and CLI. This plugin exists only to surface REA's tools inside LM Studio;
all tool logic, documentation, and the original source tree belong to the
upstream project. See [`REA/`](./REA) for the untouched original.

---

## License

This project is licensed under the **[MIT License](./LICENSE)**, **consistent
with the original REA project** (also MIT).

- Copyright (c) 2026 **morluto** — original [REA](https://github.com/morluto/rea).
- Copyright (c) 2026 **rea-mcp contributors** — this LM Studio wrapper.

See [`LICENSE`](./LICENSE) for the full text.

---

## Project layout

```text
rea-mcp/
├── manifest.json          # LM Studio plugin metadata (kebab-case: rea-mcp)
├── package.json           # deps + scripts; postinstall -> scripts/setup.cjs
├── tsconfig.json          # TS config for the wrapper
├── LICENSE                # MIT (matches original REA)
├── README.md
├── scripts/
│   └── setup.cjs          # postinstall: clone REA, env, install, build
├── src/                   # the wrapper (TypeScript)
│   ├── index.ts           # plugin entry point
│   ├── toolsProvider.ts   # re-declares every REA tool for LM Studio
│   ├── config.ts          # LM Studio global settings schema
│   └── core/
│       ├── reaClient.ts        # black-box MCP client to REA/dist/main.js
│       ├── schemaConverter.ts  # JSON schema -> zod (for LM Studio tools)
│       └── externalConfig.ts   # settings -> REA REA_* env vars
├── skills/
│   └── rea-mcp.md         # skill for small LLMs: tool interface + examples
├── REA/                   # original morluto/rea, cloned & UNTOUCHED (git-updatable)
└── dist/                  # compiled JS (from `npm run build`)
```
