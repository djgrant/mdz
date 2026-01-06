/**
 * Execution harness for MDZ observability
 *
 * Combines TraceWriter, sandbox tools, and AI SDK integration
 * to provide a complete execution environment for MDZ skills.
 */

import { generateText, type LanguageModel } from "ai";
import { randomUUID } from "crypto";
import {
  TraceWriter,
  type TraceWriterOutput,
  type TokenUsage,
} from "./trace.js";
import {
  createSandboxTools,
  type SandboxState,
} from "./tools.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Session state during skill execution.
 */
export interface Session {
  id: string;
  startTime: number;
  sandboxState: SandboxState;
  traceWriter: TraceWriter;
  model: LanguageModel;
  totalTokenUsage: TokenUsage;
}

/**
 * Options for configuring the execution harness.
 */
export interface HarnessOptions {
  /** The AI SDK language model to use */
  model: LanguageModel;
  /** Where to write trace events */
  traceOutput: TraceWriterOutput;
  /** Max length for content fields before truncation (default: 1000) */
  maxContentLength?: number;
}

/**
 * Options for running a skill.
 */
export interface RunSkillOptions {
  /** Harness configuration */
  harness: HarnessOptions;
  /** The compiled MDZ skill content to use as system prompt */
  skillContent: string;
  /** Path to the skill file (for metadata/tracing) */
  skillPath?: string;
  /** Initial files in the sandbox filesystem */
  initialFiles?: Map<string, string>;
  /** Initial skills available in the sandbox */
  initialSkills?: Map<string, string>;
  /** The user prompt to start execution */
  prompt: string;
  /** Maximum number of tool use iterations (default: 10) */
  maxSteps?: number;
}

/**
 * Result of skill execution.
 */
export interface ExecutionResult {
  /** Unique session identifier */
  sessionId: string;
  /** Whether execution completed successfully */
  success: boolean;
  /** The final text response from the model */
  finalResponse: string;
  /** Total token usage across all steps */
  tokenUsage: TokenUsage;
  /** Total number of tool calls made */
  toolCallCount: number;
  /** Total execution duration in milliseconds */
  durationMs: number;
  /** Final state of the sandbox filesystem */
  finalFiles: Map<string, string>;
  /** Path to trace file (if output type is 'file') */
  tracePath?: string;
  /** Error message if execution failed */
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique session ID.
 */
function generateSessionId(): string {
  return randomUUID();
}

/**
 * Create initial sandbox state from options.
 */
function createSandboxState(options: RunSkillOptions): SandboxState {
  return {
    files: new Map(options.initialFiles ?? []),
    skills: new Map(options.initialSkills ?? []),
  };
}

/**
 * Get model identifier string from LanguageModel.
 */
function getModelId(model: LanguageModel): string {
  // AI SDK models have a modelId property
  return model.modelId ?? "unknown";
}

/**
 * Add token usage from a step to the total.
 */
function addTokenUsage(total: TokenUsage, step?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }): void {
  if (!step) return;
  total.input += step.promptTokens ?? 0;
  total.output += step.completionTokens ?? 0;
  total.total += step.totalTokens ?? (step.promptTokens ?? 0) + (step.completionTokens ?? 0);
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Run a skill in the execution harness.
 *
 * This function:
 * 1. Creates a session with unique ID
 * 2. Initializes TraceWriter and SandboxState
 * 3. Wires sandbox tools to trace via callbacks
 * 4. Uses AI SDK's generateText with tools and maxSteps
 * 5. Tracks each step via onStepFinish callback
 * 6. Returns final state and execution result
 *
 * @example
 * ```typescript
 * import { createAnthropic } from "@ai-sdk/anthropic";
 *
 * const result = await runSkill({
 *   harness: {
 *     model: createAnthropic()("claude-3-5-sonnet-20241022"),
 *     traceOutput: { type: "file", path: "./trace.jsonl" },
 *   },
 *   skillContent: "# Code Reviewer\n\nYou review code for best practices...",
 *   prompt: "Review the code in /src/index.ts",
 *   initialFiles: new Map([["/src/index.ts", "const x = 1;"]]),
 * });
 *
 * console.log(`Completed in ${result.durationMs}ms`);
 * console.log(`Tool calls: ${result.toolCallCount}`);
 * ```
 */
export async function runSkill(options: RunSkillOptions): Promise<ExecutionResult> {
  const sessionId = generateSessionId();
  const startTime = performance.now();
  const maxSteps = options.maxSteps ?? 10;

  // Initialize trace writer
  const traceWriter = new TraceWriter({
    output: options.harness.traceOutput,
    maxContentLength: options.harness.maxContentLength,
  });

  // Initialize sandbox state
  const sandboxState = createSandboxState(options);

  // Track metrics
  const totalTokenUsage: TokenUsage = { input: 0, output: 0, total: 0 };
  let toolCallCount = 0;
  const pendingToolCalls = new Map<string, { toolName: string; args: unknown; startTime: number }>();

  // Create sandbox tools with trace callbacks
  const tools = createSandboxTools(sandboxState, {
    onCall: (toolName, args) => {
      const toolCallId = `${sessionId}-${toolCallCount++}`;
      pendingToolCalls.set(`${toolName}-${JSON.stringify(args)}`, {
        toolName,
        args,
        startTime: performance.now(),
      });

      // Fire and forget - we don't want to block tool execution
      traceWriter.toolCall({
        sessionId,
        toolCallId,
        toolName,
        args,
      }).catch(() => {});
    },
    onResult: (toolName, args, result, durationMs) => {
      const key = `${toolName}-${JSON.stringify(args)}`;
      const pending = pendingToolCalls.get(key);
      pendingToolCalls.delete(key);

      const toolCallId = pending
        ? `${sessionId}-${toolCallCount - 1}`
        : `${sessionId}-unknown`;

      // Fire and forget
      traceWriter.toolResult({
        sessionId,
        toolCallId,
        toolName,
        result,
        durationMs,
      }).catch(() => {});
    },
  });

  try {
    // Log session start
    await traceWriter.sessionStart({
      sessionId,
      skillPath: options.skillPath,
      model: getModelId(options.harness.model),
      systemPrompt: options.skillContent,
    });

    // Log initial LLM request
    await traceWriter.llmRequest({
      sessionId,
      messageCount: 2, // system + user
      messageSummary: `System: ${options.skillContent.slice(0, 100)}... | User: ${options.prompt.slice(0, 100)}...`,
      toolNames: Object.keys(tools),
    });

    // Execute with AI SDK
    const result = await generateText({
      model: options.harness.model,
      system: options.skillContent,
      prompt: options.prompt,
      tools,
      maxSteps,
      onStepFinish: async (step) => {
        // Track token usage
        addTokenUsage(totalTokenUsage, step.usage);

        // Log step based on type
        if (step.text) {
          await traceWriter.llmResponse({
            sessionId,
            content: step.text,
            finishReason: step.finishReason ?? null,
            tokenUsage: step.usage ? {
              input: step.usage.promptTokens ?? 0,
              output: step.usage.completionTokens ?? 0,
              total: step.usage.totalTokens ?? 0,
            } : undefined,
          });
        }

        // If there are tool calls in this step, log continuation request
        if (step.toolCalls && step.toolCalls.length > 0) {
          await traceWriter.llmRequest({
            sessionId,
            messageCount: 1,
            messageSummary: `Tool results: ${step.toolCalls.map(tc => tc.toolName).join(", ")}`,
            toolNames: Object.keys(tools),
          });
        }
      },
    });

    const durationMs = performance.now() - startTime;

    // Add final usage if available
    if (result.usage) {
      // Note: onStepFinish already tracked per-step usage,
      // but result.usage is the total - use it if steps didn't track
      if (totalTokenUsage.total === 0) {
        totalTokenUsage.input = result.usage.promptTokens ?? 0;
        totalTokenUsage.output = result.usage.completionTokens ?? 0;
        totalTokenUsage.total = result.usage.totalTokens ?? 0;
      }
    }

    // Log session end
    await traceWriter.sessionEnd({
      sessionId,
      durationMs,
      tokenUsage: totalTokenUsage,
    });

    // Close trace writer
    await traceWriter.close();

    return {
      sessionId,
      success: true,
      finalResponse: result.text,
      tokenUsage: totalTokenUsage,
      toolCallCount,
      durationMs,
      finalFiles: new Map(sandboxState.files),
      tracePath: options.harness.traceOutput.type === "file"
        ? options.harness.traceOutput.path
        : undefined,
    };
  } catch (error) {
    const durationMs = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error
    await traceWriter.error({
      sessionId,
      errorType: error instanceof Error ? error.constructor.name : "Error",
      message: errorMessage,
      stack: errorStack,
    }).catch(() => {});

    // Log session end even on error
    await traceWriter.sessionEnd({
      sessionId,
      durationMs,
      tokenUsage: totalTokenUsage,
    }).catch(() => {});

    // Close trace writer
    await traceWriter.close().catch(() => {});

    return {
      sessionId,
      success: false,
      finalResponse: "",
      tokenUsage: totalTokenUsage,
      toolCallCount,
      durationMs,
      finalFiles: new Map(sandboxState.files),
      tracePath: options.harness.traceOutput.type === "file"
        ? options.harness.traceOutput.path
        : undefined,
      error: errorMessage,
    };
  }
}

/**
 * Create a harness options object with sensible defaults.
 *
 * @example
 * ```typescript
 * const harness = createHarness({
 *   model: createAnthropic()("claude-3-5-sonnet-20241022"),
 *   traceOutput: { type: "file", path: "./traces/run.jsonl" },
 * });
 * ```
 */
export function createHarness(options: HarnessOptions): HarnessOptions {
  return {
    model: options.model,
    traceOutput: options.traceOutput,
    maxContentLength: options.maxContentLength ?? 1000,
  };
}

/**
 * Create a callback-based trace output for real-time event handling.
 *
 * @example
 * ```typescript
 * const events: TraceEvent[] = [];
 * const output = createCallbackOutput((event) => {
 *   events.push(event);
 *   console.log(`[${event.type}]`, event);
 * });
 * ```
 */
export function createCallbackOutput(
  onEvent: (event: import("./trace.js").TraceEvent) => void
): TraceWriterOutput {
  return { type: "callback", onEvent };
}

/**
 * Create a file-based trace output.
 *
 * @example
 * ```typescript
 * const output = createFileOutput("./traces/session.jsonl");
 * ```
 */
export function createFileOutput(path: string): TraceWriterOutput {
  return { type: "file", path };
}
