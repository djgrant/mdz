// @mdz/observability - Trace event types and TraceWriter
import { z } from "zod";

// ============================================================================
// Zod Schemas
// ============================================================================

const TokenUsageSchema = z.object({
  input: z.number(),
  output: z.number(),
  total: z.number(),
});

const BaseEventSchema = z.object({
  timestamp: z.string().datetime(),
  sequence: z.number().int().nonnegative(),
});

const SessionStartEventSchema = BaseEventSchema.extend({
  type: z.literal("session_start"),
  sessionId: z.string(),
  skillPath: z.string().optional(),
  model: z.string(),
  systemPrompt: z.string(),
});

const SessionEndEventSchema = BaseEventSchema.extend({
  type: z.literal("session_end"),
  sessionId: z.string(),
  durationMs: z.number(),
  tokenUsage: TokenUsageSchema,
});

const ToolCallEventSchema = BaseEventSchema.extend({
  type: z.literal("tool_call"),
  sessionId: z.string(),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.unknown(),
});

const ToolResultEventSchema = BaseEventSchema.extend({
  type: z.literal("tool_result"),
  sessionId: z.string(),
  toolCallId: z.string(),
  toolName: z.string(),
  result: z.unknown(),
  durationMs: z.number(),
});

const LLMRequestEventSchema = BaseEventSchema.extend({
  type: z.literal("llm_request"),
  sessionId: z.string(),
  messageCount: z.number(),
  messageSummary: z.string(),
  toolNames: z.array(z.string()),
});

const LLMResponseEventSchema = BaseEventSchema.extend({
  type: z.literal("llm_response"),
  sessionId: z.string(),
  content: z.string(),
  contentTruncated: z.boolean(),
  finishReason: z.string().nullable(),
  tokenUsage: TokenUsageSchema.optional(),
});

const ErrorEventSchema = BaseEventSchema.extend({
  type: z.literal("error"),
  sessionId: z.string(),
  errorType: z.string(),
  message: z.string(),
  stack: z.string().optional(),
});

export const TraceEventSchema = z.discriminatedUnion("type", [
  SessionStartEventSchema,
  SessionEndEventSchema,
  ToolCallEventSchema,
  ToolResultEventSchema,
  LLMRequestEventSchema,
  LLMResponseEventSchema,
  ErrorEventSchema,
]);

// ============================================================================
// TypeScript Types (inferred from Zod schemas)
// ============================================================================

export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export type BaseEvent = z.infer<typeof BaseEventSchema>;
export type SessionStartEvent = z.infer<typeof SessionStartEventSchema>;
export type SessionEndEvent = z.infer<typeof SessionEndEventSchema>;
export type ToolCallEvent = z.infer<typeof ToolCallEventSchema>;
export type ToolResultEvent = z.infer<typeof ToolResultEventSchema>;
export type LLMRequestEvent = z.infer<typeof LLMRequestEventSchema>;
export type LLMResponseEvent = z.infer<typeof LLMResponseEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;
export type TraceEvent = z.infer<typeof TraceEventSchema>;

// ============================================================================
// TraceWriter
// ============================================================================

export type TraceWriterOutput =
  | { type: "file"; path: string }
  | { type: "callback"; onEvent: (event: TraceEvent) => void };

export interface TraceWriterOptions {
  output: TraceWriterOutput;
  /** Max length for content fields before truncation (default: 1000) */
  maxContentLength?: number;
}

export class TraceWriter {
  private sequence = 0;
  private output: TraceWriterOutput;
  private maxContentLength: number;
  private writeStream: import("fs").WriteStream | null = null;

  constructor(options: TraceWriterOptions) {
    this.output = options.output;
    this.maxContentLength = options.maxContentLength ?? 1000;
  }

  private async ensureStream(): Promise<void> {
    if (this.output.type === "file" && !this.writeStream) {
      const fs = await import("fs");
      this.writeStream = fs.createWriteStream(this.output.path, {
        flags: "a",
        encoding: "utf-8",
      });
    }
  }

  private async write(event: TraceEvent): Promise<void> {
    const line = JSON.stringify(event) + "\n";

    if (this.output.type === "callback") {
      this.output.onEvent(event);
    } else {
      await this.ensureStream();
      await new Promise<void>((resolve, reject) => {
        this.writeStream!.write(line, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  private createBase(): BaseEvent {
    return {
      timestamp: new Date().toISOString(),
      sequence: this.sequence++,
    };
  }

  private truncate(content: string): { text: string; truncated: boolean } {
    if (content.length <= this.maxContentLength) {
      return { text: content, truncated: false };
    }
    return {
      text: content.slice(0, this.maxContentLength) + "...",
      truncated: true,
    };
  }

  async sessionStart(data: {
    sessionId: string;
    skillPath?: string;
    model: string;
    systemPrompt: string;
  }): Promise<void> {
    const event: SessionStartEvent = {
      ...this.createBase(),
      type: "session_start",
      ...data,
    };
    await this.write(event);
  }

  async sessionEnd(data: {
    sessionId: string;
    durationMs: number;
    tokenUsage: TokenUsage;
  }): Promise<void> {
    const event: SessionEndEvent = {
      ...this.createBase(),
      type: "session_end",
      ...data,
    };
    await this.write(event);
  }

  async toolCall(data: {
    sessionId: string;
    toolCallId: string;
    toolName: string;
    args: unknown;
  }): Promise<void> {
    const event: ToolCallEvent = {
      ...this.createBase(),
      type: "tool_call",
      ...data,
    };
    await this.write(event);
  }

  async toolResult(data: {
    sessionId: string;
    toolCallId: string;
    toolName: string;
    result: unknown;
    durationMs: number;
  }): Promise<void> {
    const event: ToolResultEvent = {
      ...this.createBase(),
      type: "tool_result",
      ...data,
    };
    await this.write(event);
  }

  async llmRequest(data: {
    sessionId: string;
    messageCount: number;
    messageSummary: string;
    toolNames: string[];
  }): Promise<void> {
    const event: LLMRequestEvent = {
      ...this.createBase(),
      type: "llm_request",
      ...data,
    };
    await this.write(event);
  }

  async llmResponse(data: {
    sessionId: string;
    content: string;
    finishReason: string | null;
    tokenUsage?: TokenUsage;
  }): Promise<void> {
    const { text, truncated } = this.truncate(data.content);
    const event: LLMResponseEvent = {
      ...this.createBase(),
      type: "llm_response",
      sessionId: data.sessionId,
      content: text,
      contentTruncated: truncated,
      finishReason: data.finishReason,
      tokenUsage: data.tokenUsage,
    };
    await this.write(event);
  }

  async error(data: {
    sessionId: string;
    errorType: string;
    message: string;
    stack?: string;
  }): Promise<void> {
    const event: ErrorEvent = {
      ...this.createBase(),
      type: "error",
      ...data,
    };
    await this.write(event);
  }

  async close(): Promise<void> {
    if (this.writeStream) {
      await new Promise<void>((resolve, reject) => {
        this.writeStream!.end((err: Error | null | undefined) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.writeStream = null;
    }
  }
}

// ============================================================================
// Utility: Parse JSONL trace file
// ============================================================================

export async function parseTraceFile(path: string): Promise<TraceEvent[]> {
  const fs = await import("fs/promises");
  const content = await fs.readFile(path, "utf-8");
  return parseTraceLines(content);
}

export function parseTraceLines(content: string): TraceEvent[] {
  const lines = content.trim().split("\n").filter(Boolean);
  return lines.map((line, index) => {
    const parsed = JSON.parse(line);
    const result = TraceEventSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `Invalid trace event at line ${index + 1}: ${result.error.message}`
      );
    }
    return result.data;
  });
}
