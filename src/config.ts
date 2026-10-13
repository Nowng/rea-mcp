import { createConfigSchematics } from "@lmstudio/sdk";

// Global (application-wide) config: external analysis tool paths.
// Empty / blank values leave REA on its platform defaults, which assume the
// tools are already installed and on PATH. When a tool cannot be reached,
// REA returns an error that the proxy forwards to the LLM.
export const globalConfigSchematics = createConfigSchematics()
  .field("analysisProvider", "string", {
    displayName: "Native analysis provider",
    subtitle: "hopper | ghidra | ida | dotnet | javascript | auto. Blank = auto.",
  }, "auto")
  .field("hopperLauncherPath", "string", {
    displayName: "Hopper launcher path",
    subtitle: "Absolute path to the Hopper executable. Blank = platform default.",
  }, "")
  .field("ghidraInstallDir", "string", {
    displayName: "Ghidra install dir",
    subtitle: "Absolute path to a Ghidra installation. Blank = default.",
  }, "")
  .field("javaHome", "string", {
    displayName: "JAVA_HOME",
    subtitle: "Absolute path to a JDK (needed by Ghidra). Blank = default.",
  }, "")
  .field("idaMcpConfig", "string", {
    displayName: "IDA MCP config path",
    subtitle: "Absolute path to an idamcp.json config for IDA. Blank = default.",
  }, "")
  .field("ilspyCmdPath", "string", {
    displayName: "ILSpy command path",
    subtitle: "Absolute path to the ILSpy CLI for .NET. Blank = default.",
  }, "")
  .field("ghidraNativeAotJar", "string", {
    displayName: "Ghidra NativeAOT jar",
    subtitle: "Absolute path to a Ghidra NativeAOT jar. Blank = default.",
  }, "")
  .field("ghidraSeedFile", "string", {
    displayName: "Ghidra seed file",
    subtitle: "Absolute path to a Ghidra seed file. Blank = default.",
  }, "")
  .field("ghidraStartupTimeoutMs", "string", {
    displayName: "Ghidra startup timeout (ms)",
    subtitle: "Raise this for slow or large binaries. Blank = default.",
  }, "")
  .field("logLevel", "string", {
    displayName: "Log level",
    subtitle: "trace | debug | info | warn | error | fatal | silent. Blank = info.",
  }, "info")
  .build();

// Per-chat config: none is needed for this proxy.
export const configSchematics = createConfigSchematics().build();
