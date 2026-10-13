import * as z from "zod";
import { jsonSchemaToZod } from "json-schema-to-zod";

const ESCAPE = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Convert an MCP tool JSON `inputSchema` into a zod v3 schema at runtime.
 *
 * REA advertises each tool with a JSON Schema. LM Studio tools need zod, so we
 * use `json-schema-to-zod` to emit zod v3 code, then instantiate that single
 * expression. Only the first `export const <name> = ...;` statement is used;
 * the expression is safely embedded as the body of a function scoped to `z`.
 */
export function jsonSchemaToZodSchema(schema: unknown, name: string): z.ZodTypeAny {
  const code = jsonSchemaToZod(schema as any, {
    name,
    zodVersion: 3,
    type: "statement",
    module: "esm",
    noImport: true,
  }) as string;

  // Collapse to one line so deep schemas still produce a single expression.
  const collapsed = code.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  let expr = collapsed
    .replace(new RegExp("^export\\s+const\\s+" + ESCAPE(name) + "\\s*=\\s*", "i"), "")
    .trim();
  const semi = expr.indexOf(";");
  if (semi !== -1) expr = expr.slice(0, semi).trim();

  // Escape backslash and quote so the expression is safe inside `new Function`.
  const body = "return (" + expr + ")".replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  const factory = new Function("z", body) as (mod: typeof z) => z.ZodTypeAny;
  return factory(z);
}

/**
 * Convert an MCP tool JSON `inputSchema` into a zod RawShape for `tool()`.
 * Falls back to a single `__input: z.any()` field the LLM can pass anything to.
 */
export function jsonSchemaToRawShape(schema: unknown): z.ZodRawShape {
  let obj: z.ZodTypeAny;
  try {
    obj = jsonSchemaToZodSchema(schema, "Args");
  } catch {
    return { __input: z.any() } as z.ZodRawShape;
  }
  const shape =
    obj && typeof obj === "object" && "shape" in (obj as any) ? ((obj as any).shape as z.ZodRawShape) : null;
  return shape ?? { __input: z.any() } as z.ZodRawShape;
}
