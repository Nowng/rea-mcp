import { type PluginContext } from "@lmstudio/sdk";
import { toolsProvider } from "./toolsProvider.js";
import { configSchematics, globalConfigSchematics } from "./config.js";

export { toolsProvider, configSchematics, globalConfigSchematics };

/**
 * LM Studio plugin entry point. It is loaded by `.lmstudio/entry.ts` via
 * `import("../src/index.ts").then((m) => m.main(pluginContext` and registers
 * the REA tools provider and the plugin's configuration schemas with LM Studio.
 */
export async function main(context: PluginContext): Promise<void> {
  context.withToolsProvider(toolsProvider);
  context.withConfigSchematics(configSchematics);
  context.withGlobalConfigSchematics(globalConfigSchematics);
}

