/**
 * Shared state model for the "ops" mock MCP server.
 *
 * Both the server (mcp-ops-server.ts) and the E1 generator import this module,
 * so the fabricated pre-kill seeds and the live server apply IDENTICAL
 * semantics: the generator computes "state after the first k steps" by folding
 * applyCall over the reference op calls, and the server folds the same
 * function over the model's live calls on top of the loaded seed.
 *
 * The server deliberately never refuses a repeated call — repeats are what E1
 * measures — so applyCall is total: a second refund for the same order simply
 * appends a second refund record.
 */

export interface OpsState {
  tickets: Record<string, { status: string; comments: string[] }>;
  refunds: { order_id: string; amount: number }[];
  emails: { to: string; subject: string }[];
  deploys: Record<string, string>;
  notes: Record<string, string>;
}

export function emptyState(): OpsState {
  return { tickets: {}, refunds: [], emails: [], deploys: {}, notes: {} };
}

/** Side-effect tools the server exposes (ops_lookup is read-only, not listed). */
export const SIDE_EFFECT_TOOLS = [
  "ticket_update",
  "refund_issue",
  "email_send",
  "deploy_service",
  "record_note",
] as const;

export type SideEffectTool = (typeof SIDE_EFFECT_TOOLS)[number];

/**
 * Apply one side-effect call to the state (mutating) and return the tool's
 * result text. Unknown tools throw; the caller decides how to surface that.
 */
export function applyCall(
  state: OpsState,
  tool: string,
  args: Record<string, unknown>,
): string {
  switch (tool) {
    case "ticket_update": {
      const id = String(args.ticket_id ?? "");
      const status = String(args.status ?? "");
      const prev = state.tickets[id] ?? { status: "open", comments: [] };
      const comments =
        typeof args.comment === "string" && args.comment.trim() !== ""
          ? [...prev.comments, args.comment]
          : prev.comments;
      state.tickets[id] = { status, comments };
      return "ok";
    }
    case "refund_issue": {
      state.refunds.push({
        order_id: String(args.order_id ?? ""),
        amount: Number(args.amount ?? 0),
      });
      return "ok";
    }
    case "email_send": {
      state.emails.push({
        to: String(args.to ?? ""),
        subject: String(args.subject ?? ""),
      });
      return "sent";
    }
    case "deploy_service": {
      state.deploys[String(args.service ?? "")] = String(args.version ?? "");
      return "deployed";
    }
    case "record_note": {
      state.notes[String(args.note_id ?? "")] = String(args.text ?? "");
      return "ok";
    }
    default:
      throw new Error(`unknown tool: ${tool}`);
  }
}
