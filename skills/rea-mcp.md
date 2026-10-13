# Skill: use `rea-mcp (LM Studio)` to reverse engineer things

## What this skill is

`rea-mcp` gives you **reverse-engineering tools** through MCP. You can use them to
**understand how something works, down to the binary level**. It wraps the original
[`morluto/rea`](https://github.com/morluto/rea) ("Reverse Engineer Anything").

You can analyze:

- **Native binaries**: PE (Windows), Mach-O (macOS/iOS), ELF (Linux)
- **Apps**: JavaScript, Electron, web sites
- **Code packages**: .NET assemblies, EVM smart contracts, Android APKs, firmware, Apple IPAs

All analysis runs **locally**. REA returns **observations, limits, and unknowns** —
so "not found" or "not supported" is a real answer, not a bug.

---

## The tool interface

Each `rea-mcp` tool has the same shape:

- **`name`**: the tool name (for example `procedure_pseudo_code`).
- **`description`**: what the tool does. **Read it before every call.**
- **`parameters`**: the input. The tool tells you which fields are required.
- **returns**: **plain text**. It can be long; it is cut to a max size on purpose.

There are **170+ tools**. Most names start with a verb:

- `inspect_*` — look at one thing (instruction, type, class, package...)
- `list_*` — list many things (names, procedures, strings, segments, devices)
- `read_*` — read bytes, instructions, logcat, settings
- `set_*` / `comment` / `set_comment` — write a name or comment
- `open_*` / `close_*` — open or close a target (binary, project)
- `analyze_*` / `decompile_*` / `extract_*` — deep work
- `trace_*` / `observe_*` / `capture_*` — dynamic / live behavior
- `resolve_*` / `find_*` / `xrefs` — follow references and call sites
- `binary_session` / `binary_overview` — **start**: confirm the target and provider

If you are unsure which tool to use, **read the `description`**. Names starting with
`inspect_`, `list_`, `read_`, and `resolve_` cover most first steps.

---

## Rules to follow (important)

1. **Read the `description` before each call.** It tells you exactly what the tool
   needs and what it returns.
2. **Start small, then go deep.** First run `binary_session` or `binary_overview`
   to confirm the target and the provider (Hopper / Ghidra / IDA / ...). Then
   `list_names`, `list_procedures`, then `procedure_pseudo_code`.
3. **Give exact inputs.** Use exact addresses, symbol names, or procedure names.
   Hex addresses look like `0x...`. Ask the model to name the address before
   calling again.
4. **One job per call.** Ask for one procedure, one address, or one string. Large
   requests get cut off or fail.
5. **Handle long output.** Results are capped. If it is cut, narrow the request
   (one address / one procedure) and call again.
6. **Read errors as signals.** If a tool says "not found" or "not supported,"
   report it honestly. Do not invent results.
7. **Never paste secrets** (keys, passwords, tokens) into tool arguments. The model
   will see them.
8. **Be patient with native analysis.** It can be slow for large binaries. Use the
   status messages (`Working...`) and wait.

---

## How to call a tool (example)

A call has a `name` and `arguments`. For example, to decompile one procedure:

```json
{
  "name": "procedure_pseudo_code",
  "arguments": {
    "procedure": "main",
    "provider": "ghidra"
  }
}
```

The tool returns **text** (the decompiled code, or an error). Read it, then decide
the next step.

---

## Worked examples

### Example 1 — understand a native binary

1. `binary_session` → confirm the file and the provider.
2. `list_procedures` → get the list of functions.
3. `list_names` → get symbols / entry points.
4. `procedure_pseudo_code` with `procedure: "main"` → read the decompiled `main`.
5. `procedure_callees` / `procedure_callers` → see who `main` calls and who calls it.
6. `resolve_native_call_targets` → follow a specific call.
7. `set_comment` / `set_address_name` → record what you learned.

### Example 2 — find and read strings in a binary

1. `list_strings` → list string objects (optionally by address).
2. `find_xrefs_to_name` / `xrefs` → find which code uses a string.
3. `procedure_pseudo_code` at that code → read the context.

### Example 3 — analyze a JavaScript / Electron / web app

1. `analyze_javascript_application` / `analyze_web_bundle` → analyze the app.
2. `compare_web_screenshots` / `compare_web_captures` → diff two versions.
3. `export_web_scripts` / `export_evidence_bundle` → save the evidence.
4. `observe_web_execution` / `trace_javascript_semantics` → watch live behavior.

### Example 4 — Android (ADB)

1. `list_adb_devices` → list connected devices.
2. `install_adb_package` / `pull_adb_package` → install or extract an APK.
3. `inspect_android_package` / `inspect_android_class` → inspect classes.
4. `capture_adb_screen` / `capture_native_ui_scenario` → capture the UI.
5. `trace_android_references` / `read_adb_logcat` → trace and read logs.

### Example 5 — smart contract (EVM), .NET, firmware, Apple

- EVM: `inspect_evm_interface`, `analyze_*`, `trace_*`.
- .NET (ILSpy): `inspect_managed_members`, `batch_decompile`, `compare_managed_members`.
- Firmware: `extract_firmware`, `inspect_firmware_regions`.
- Apple: `inspect_macho`, `inspect_objc_classes`, `inspect_objc_protocols`,
  `decode_interface_builder`.

---

## Common tasks at a glance

| Goal | Tools |
| --- | --- |
| Confirm the target + engine | `binary_session`, `binary_overview` |
| List symbols / functions / strings | `list_names`, `list_procedures`, `list_strings` |
| Read / decompile one function | `procedure_pseudo_code`, `read_function_instructions`, `batch_decompile` |
| Follow calls and references | `resolve_native_call_targets`, `procedure_callees`, `procedure_callers`, `xrefs` |
| Read bytes / instructions | `read_bytes`, `inspect_native_instruction` |
| Record findings | `set_comment`, `set_address_name`, `set_bookmark` |
| Watch live behavior | `trace_*`, `observe_*`, `capture_*` |
| Save the evidence | `export_evidence_bundle`, `build_reconstruction_obligation_ledger` |

---

## Tips for success

- **Ask first, then call.** Restate the goal, then pick the verb that matches
  (inspect / list / read / trace / resolve).
- **Use `list_*` to get exact names/addresses**, then `inspect_*`/`read_*` on them.
- **Narrow, do not dump.** One target per call keeps output inside the size cap.
- **Trust REA's limits.** Report "unknown"/"not supported" honestly.
- **Keep the evidence.** Use `export_evidence_bundle` to save what you found.

---

## About the wrapper

`rea-mcp` is a **lightweight LM Studio plugin** that re-declares REA's tools and
forwards each call to the original REA MCP server (spawned as a child process).
It does **not** re-implement REA. The original source lives in [`./REA`](../REA)
and is left untouched, so it stays updatable with `git pull`.

Original: [`morluto/rea`](https://github.com/morluto/rea) — "Reverse Engineer
Anything." Licensed **MIT**, matching this plugin.
