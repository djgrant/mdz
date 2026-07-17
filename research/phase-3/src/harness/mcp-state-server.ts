/**
 * Mock stdio MCP server: an in-memory key/value "state" store.
 *
 * Exposes two tools to the model:
 *   - get(name)          -> returns the stored value (or null)
 *   - set(name, value)   -> stores the value, returns "ok"
 *
 * Every call is appended as one JSON line to the file named by env STATE_LOG:
 *   { "ts": <iso>, "tool": "get"|"set", "name": <string>,
 *     "value"?: <any>, "result": <any> }
 * The `set` log doubles as an assign trace; `get` records reads.
 *
 * Transport: newline-delimited JSON-RPC 2.0 over stdin/stdout (the MCP stdio
 * framing used by Claude Code). Hand-rolled — no npm deps, matching the
 * dependency-free ethos of the phase-1 harness.
 *
 * Run standalone:  STATE_LOG=/tmp/state.log npx tsx mcp-state-server.ts
 */

import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";

const PROTOCOL_VERSION = "2024-11-05";
const STATE_LOG = process.env.STATE_LOG ?? "";

const store = new Map<string, unknown>();

function logCall(entry: Record<string, unknown>): void {
  if (!STATE_LOG) return;
  try {
    appendFileSync(STATE_LOG, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
  } catch {
    /* logging must never crash the server */
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC plumbing
// ---------------------------------------------------------------------------

interface RpcMessage {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: unknown;
}

function send(msg: RpcMessage): void {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function reply(id: number | string, result: unknown): void {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id: number | string, code: number, message: string): void {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "get",
    description: "Read a value previously stored under `name`. Returns null if unset.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: "Variable name to read." } },
      required: ["name"],
    },
  },
  {
    name: "set",
    description: "Store `value` under `name` in the external state store.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Variable name to write." },
        value: { description: "Value to store (any JSON)." },
      },
      required: ["name", "value"],
    },
  },
];

function callTool(name: string, args: Record<string, unknown>): {
  content: { type: "text"; text: string }[];
} {
  const varName = String(args.name ?? "");
  if (name === "set") {
    const value = args.value;
    store.set(varName, value);
    logCall({ tool: "set", name: varName, value, result: "ok" });
    return { content: [{ type: "text", text: "ok" }] };
  }
  if (name === "get") {
    const value = store.has(varName) ? store.get(varName) : null;
    logCall({ tool: "get", name: varName, result: value });
    return {
      content: [{ type: "text", text: JSON.stringify(value ?? null) }],
    };
  }
  throw new Error(`unknown tool: ${name}`);
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

function handle(msg: RpcMessage): void {
  const { method, id } = msg;

  // Notifications (no id): acknowledge silently.
  if (id === undefined) return;

  switch (method) {
    case "initialize":
      reply(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "state", version: "0.1.0" },
      });
      return;
    case "tools/list":
      reply(id, { tools: TOOLS });
      return;
    case "tools/call": {
      const params = msg.params ?? {};
      const toolName = String(params.name ?? "");
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      try {
        reply(id, callTool(toolName, args));
      } catch (e) {
        replyError(id, -32602, (e as Error).message);
      }
      return;
    }
    case "ping":
      reply(id, {});
      return;
    default:
      replyError(id, -32601, `method not found: ${method}`);
  }
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg: RpcMessage;
  try {
    msg = JSON.parse(trimmed) as RpcMessage;
  } catch {
    return;
  }
  handle(msg);
});
