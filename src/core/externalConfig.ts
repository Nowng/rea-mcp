export interface ExternalConfig {
  analysisProvider?: string;
  hopperLauncherPath?: string;
  ghidraInstallDir?: string;
  javaHome?: string;
  idaMcpConfig?: string;
  ilspyCmdPath?: string;
  ghidraNativeAotJar?: string;
  ghidraSeedFile?: string;
  ghidraStartupTimeoutMs?: string;
  logLevel?: string;
}

/**
 * Map LM Studio config (external analysis tool paths) to REA's environment
 * variables. Empty / undefined values are skipped so REA keeps its platform
 * defaults, which assume the tools are already installed and on PATH.
 */
export function reaEnvOverrides(cfg: ExternalConfig): Record<string, string> {
  const map: Array<[string, string | undefined]> = [
    ["REA_ANALYSIS_PROVIDER", cfg.analysisProvider],
    ["HOPPER_LAUNCHER_PATH", cfg.hopperLauncherPath],
    ["GHIDRA_INSTALL_DIR", cfg.ghidraInstallDir],
    ["JAVA_HOME", cfg.javaHome],
    ["REA_IDA_MCP_CONFIG", cfg.idaMcpConfig],
    ["REA_ILSPY_CMD_PATH", cfg.ilspyCmdPath],
    ["REA_GHIDRA_NATIVEAOT_JAR", cfg.ghidraNativeAotJar],
    ["REA_GHIDRA_SEED_FILE", cfg.ghidraSeedFile],
    ["REA_GHIDRA_STARTUP_TIMEOUT_MS", cfg.ghidraStartupTimeoutMs],
    ["REA_LOG_LEVEL", cfg.logLevel],
  ];
  const out: Record<string, string> = {};
  for (const [envName, value] of map) {
    if (typeof value === "string" && value.trim().length > 0) out[envName] = value.trim();
  }
  return out;
}
