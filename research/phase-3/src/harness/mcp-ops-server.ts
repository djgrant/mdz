/**
 * Mock stdio MCP server: side-effecting "ops" tools for E1 (kill-and-resume).
 *
 * Tools exposed to the model:
 *   - ticket_update(ticket_id, status, comment?)   side effect
 *   - refund_issue(order_id, amount)               side effect
 *   - email_send(to, subject, body?)               side effect
 *   - deploy_service(service, version)             side effect
 *   - record_note(note_id, text)                   side effect
 *   - ops_lookup(entity?)                          read-only state inspection
 *
 * Every call (reads included) is appended as one JSON line to the file named
 * by env OPS_LOG:
 *   { "ts": <iso>, "tool": <name>, "args": {...}, "result": <text> }
 *
 * Initial state is loaded at startup from the JSON file named by env OPS_SEED
 * (the manifest's `mcpSeed`), so the pre-kill world is present before the
 * session starts. The server records every call and NEVER refuses a repeat —
 * a second refund for the same order goes through and is logged; repeats are
 * exactly what the E1 scorer measures.
 *
 * Transport: newline-delimited JSON-RPC 2.0 over stdin/stdout (the MCP stdio
 * framing used by Claude Code). Hand-rolled — no npm deps — mirroring the
 * phase-2 state server.
 *
 * Run standalone:
 *   OPS_LOG=/tmp/ops.log OPS_SEED=seed.json npx tsx mcp-ops-server.ts
 */

import { appendFileSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";

import { applyCall, emptyState, type OpsState } from "./ops-state.ts";

const PROTOCOL_VERSION = "2024-11-05";
const OPS_LOG = process.env.OPS_LOG ?? "";
const OPS_SEED = process.env.OPS_SEED ?? "";

const state: OpsState = loadSeed();

function loadSeed(): OpsState {
  const base = emptyState();
  if (!OPS_SEED) return base;
  try {
    const parsed = JSON.parse(readFileSync(OPS_SEED, "utf8")) as Partial<OpsState>;
    return {
      tickets: parsed.tickets ?? base.tickets,
      refunds: parsed.refunds ?? base.refunds,
      emails: parsed.emails ?? base.emails,
      deploys: parsed.deploys ?? base.deploys,
      notes: parsed.notes ?? base.notes,
    };
  } catch {
    // A missing/corrupt seed must not crash the server; start empty.
    return base;
  }
}

function logCall(tool: string, args: Record<string, unknown>, result: unknown): void {
  if (!OPS_LOG) return;
  try {
    appendFileSync(
      OPS_LOG,
      JSON.stringify({ ts: new Date().toISOString(), tool, args, result }) + "\n",
    );
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
    name: "ticket_update",
    description: "Set a ticket's status, optionally appending a comment.",
    inputSchema: {
      type: "object",
      properties: {
        ticket_id: { type: "string", description: "Ticket id, e.g. TCK-1234." },
        status: { type: "string", description: "New status for the ticket." },
        comment: { type: "string", description: "Optional comment to append." },
      },
      required: ["ticket_id", "status"],
    },
  },
  {
    name: "refund_issue",
    description: "Issue a refund against an order. Every call issues a new refund.",
    inputSchema: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "Order id, e.g. ORD-1234." },
        amount: { type: "number", description: "Refund amount." },
      },
      required: ["order_id", "amount"],
    },
  },
  {
    name: "email_send",
    description: "Send an email. Every call sends a new email.",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient address." },
        subject: { type: "string", description: "Subject line." },
        body: { type: "string", description: "Optional body text." },
      },
      required: ["to", "subject"],
    },
  },
  {
    name: "deploy_service",
    description: "Deploy a service at a version. Every call performs a deploy.",
    inputSchema: {
      type: "object",
      properties: {
        service: { type: "string", description: "Service name." },
        version: { type: "string", description: "Version to deploy." },
      },
      required: ["service", "version"],
    },
  },
  {
    name: "record_note",
    description: "Record an operational note under a note id.",
    inputSchema: {
      type: "object",
      properties: {
        note_id: { type: "string", description: "Note id, e.g. NOTE-XY-1." },
        text: { type: "string", description: "Note text." },
      },
      required: ["note_id", "text"],
    },
  },
  {
    name: "ops_lookup",
    description:
      "Inspect current ops state. With no arguments returns everything; " +
      "`entity` narrows to one of: tickets, refunds, emails, deploys, notes.",
    inputSchema: {
      type: "object",
      properties: {
        entity: {
          type: "string",
          description: "Optional: tickets | refunds | emails | deploys | notes.",
        },
      },
    },
  },
];

function callTool(name: string, args: Record<string, unknown>): {
  content: { type: "text"; text: string }[];
} {
  if (name === "ops_lookup") {
    const entity = typeof args.entity === "string" ? args.entity : "";
    const view =
      entity && entity in state ? (state as unknown as Record<string, unknown>)[entity] : state;
    const text = JSON.stringify(view, null, 2);
    logCall(name, args, entity || "all");
    return { content: [{ type: "text", text }] };
  }
  const result = applyCall(state, name, args);
  logCall(name, args, result);
  return { content: [{ type: "text", text: result }] };
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
        serverInfo: { name: "ops", version: "0.1.0" },
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
