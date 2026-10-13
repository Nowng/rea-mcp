import { tool, Tool, ToolsProviderController } from "@lmstudio/sdk";
import * as z from "zod";

import { globalConfigSchematics } from "./config.js";
import { ExternalConfig, reaEnvOverrides } from "./core/externalConfig.js";
import { getReaClient, listReaTools, callReaTool, setReaEnv, ensureReaAvailable, type ReaTool } from "./core/reaClient.js";
import { jsonSchemaToRawShape } from "./core/schemaConverter.js";

const firstLine = (e: unknown): string => String(e).replace(/\n.*/, "").slice(0, 300);

/**
 * LM Studio tools provider.
 *
 * Re-declares every REA MCP tool for LM Studio and delegates each call to the
 * original REA MCP server (spawning it as a black-box child process). REA's
 * source is never imported or modified, so it stays updatable with git pull.
 */
export async function toolsProvider(ctl: ToolsProviderController): Promise<Tool[]> {
  // 0) Ensure REA is available (clone + npm ci + tsc build).
  //    This replaces the old `postinstall` script that LM Studio Hub skips.
  try {
    await ensureReaAvailable();
  } catch (e) {
    console.error("[rea-mcp] REA setup failed: " + firstLine(e));
    return [];
  }

  // 1) Read the global config and merge it into the environment of each REA server.
  const rp = ctl.getGlobalPluginConfig(globalConfigSchematics);
  const cfg: ExternalConfig = {
    analysisProvider: rp.get("analysisProvider") as string | undefined,
    hopperLauncherPath: rp.get("hopperLauncherPath") as string | undefined,
    ghidraInstallDir: rp.get("ghidraInstallDir") as string | undefined,
    javaHome: rp.get("javaHome") as string | undefined,
    idaMcpConfig: rp.get("idaMcpConfig") as string | undefined,
    ilspyCmdPath: rp.get("ilspyCmdPath") as string | undefined,
    ghidraNativeAotJar: rp.get("ghidraNativeAotJar") as string | undefined,
    ghidraSeedFile: rp.get("ghidraSeedFile") as string | undefined,
    ghidraStartupTimeoutMs: rp.get("ghidraStartupTimeoutMs") as string | undefined,
    logLevel: rp.get("logLevel") as string | undefined,
  };
  setReaEnv({ ...process.env, ...reaEnvOverrides(cfg) } as Record<string, string>);

  // 2) List REA's tools and re-declare each one for LM Studio.
  let reaTools: ReaTool[];
  try {
    reaTools = await listReaTools();
  } catch (e) {
    console.error("[rea-mcp] Failed to list REA tools: " + firstLine(e));
    return [];
  }

  return reaTools.map(
    (t) =>
      tool({
        name: t.name,
        description: t.description,
        parameters: jsonSchemaToRawShape(t.inputSchema) as z.ZodRawShape,
        implementation: async (args, ctx) => {
          try {
            if (typeof ctx.status === "function") ctx.status("REA: " + t.name);
            const client = await getReaClient();
            const result = await callReaTool(client, t.name, (args ?? {}) as Record<string, unknown>, ctx.signal ?? null);
            return result.content;
          } catch (e) {
            const msg = firstLine(e);
            if (typeof ctx.warn === "function") ctx.warn("REA tool failed: " + msg);
            return "Error: " + msg;
          }
        },
      }),
  );
}
