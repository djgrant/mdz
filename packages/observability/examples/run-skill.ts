/**
 * Example: Run a skill with the observability harness
 *
 * Demonstrates how the MDZ observability harness works by:
 * 1. Loading an MDZ skill file
 * 2. Setting up a mock environment with files and tools
 * 3. Using a mock language model to simulate multi-step tool use
 * 4. Printing the JSONL trace to stdout
 * 5. Summarizing execution results
 *
 * Run with: pnpm exec tsx packages/observability/examples/run-skill.ts
 */

import * as fs from "fs";
import * as path from "path";
import type { LanguageModel } from "ai";
import {
  runSkill,
  createCallbackOutput,
  type TraceEvent,
} from "../src/index.js";

// ============================================================================
// Mock Language Model
// ============================================================================

interface MockDoGenerateOptions {
  prompt?: string;
  system?: string;
  tools?: Array<{ name: string }>;
  messages?: Array<{ role: string; content: unknown }>;
}

interface MockDoGenerateResult {
  text?: string;
  finishReason: string;
  usage?: { promptTokens?: number; completionTokens?: number };
  rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown> };
  toolCalls?: Array<{
    toolCallType: string;
    toolCallId: string;
    toolName: string;
    args: string;
  }>;
}

/**
 * Create a mock language model that simulates realistic multi-step behavior.
 *
 * The model:
 * 1. First lists the PR directory to see what files exist
 * 2. Reads the diff file
 * 3. Returns a code review
 */
function createMockModel(): LanguageModel {
  let step = 0;

  const doGenerate = async (
    _options: MockDoGenerateOptions
  ): Promise<MockDoGenerateResult> => {
    step++;

    // Step 1: List directory to find files
    if (step === 1) {
      return {
        text: "",
        finishReason: "tool-calls",
        usage: { promptTokens: 150, completionTokens: 25 },
        rawCall: { rawPrompt: null, rawSettings: {} },
        toolCalls: [
          {
            toolCallType: "function",
            toolCallId: "call-1",
            toolName: "list_directory",
            args: JSON.stringify({ path: "/pr" }),
          },
        ],
      };
    }

    // Step 2: Read the diff file
    if (step === 2) {
      return {
        text: "",
        finishReason: "tool-calls",
        usage: { promptTokens: 200, completionTokens: 30 },
        rawCall: { rawPrompt: null, rawSettings: {} },
        toolCalls: [
          {
            toolCallType: "function",
            toolCallId: "call-2",
            toolName: "read_file",
            args: JSON.stringify({ path: "/pr/diff.patch" }),
          },
        ],
      };
    }

    // Step 3: Read the description
    if (step === 3) {
      return {
        text: "",
        finishReason: "tool-calls",
        usage: { promptTokens: 300, completionTokens: 35 },
        rawCall: { rawPrompt: null, rawSettings: {} },
        toolCalls: [
          {
            toolCallType: "function",
            toolCallId: "call-3",
            toolName: "read_file",
            args: JSON.stringify({ path: "/pr/description.md" }),
          },
        ],
      };
    }

    // Step 4: Return the review
    return {
      text: `## Code Review Summary

**PR Type:** feature
**Outcome:** approve

### Positive Observations
- Clean implementation of the new configuration parser
- Good error handling with descriptive messages
- Test coverage looks adequate

### Suggestions (Minor)
1. Consider adding a type annotation on line 42 for better readability
2. The \`parseConfig\` function could benefit from JSDoc comments

### Overall
This is a well-structured PR that adds the configuration parsing feature. 
The code is readable and follows project conventions. Approved with minor suggestions.`,
      finishReason: "stop",
      usage: { promptTokens: 450, completionTokens: 180 },
      rawCall: { rawPrompt: null, rawSettings: {} },
    };
  };

  return {
    specificationVersion: "v1",
    provider: "mock",
    modelId: "mock-reviewer-v1",
    defaultObjectGenerationMode: undefined,
    supportsStructuredOutputs: false,
    doGenerate: doGenerate as unknown as LanguageModel["doGenerate"],
    doStream: async () => {
      throw new Error("Streaming not implemented in mock");
    },
  } as LanguageModel;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("=".repeat(70));
  console.log("MDZ Observability Harness Demo");
  console.log("=".repeat(70));
  console.log();

  // Load the PR reviewer skill
  const skillPath = path.resolve(
    __dirname,
    "../../../examples/demo/pr-reviewer.mdz"
  );
  console.log(`Loading skill: ${skillPath}`);

  let skillContent: string;
  try {
    skillContent = fs.readFileSync(skillPath, "utf-8");
    console.log(`Loaded skill: ${skillContent.split("\n").length} lines`);
  } catch (error) {
    console.error(`Failed to load skill: ${error}`);
    process.exit(1);
  }

  // Set up mock PR files
  const initialFiles = new Map<string, string>([
    [
      "/pr/diff.patch",
      `diff --git a/src/config.ts b/src/config.ts
new file mode 100644
index 0000000..a1b2c3d
--- /dev/null
+++ b/src/config.ts
@@ -0,0 +1,45 @@
+import { z } from "zod";
+
+const ConfigSchema = z.object({
+  apiKey: z.string(),
+  baseUrl: z.string().url(),
+  timeout: z.number().default(5000),
+  retries: z.number().default(3),
+});
+
+export type Config = z.infer<typeof ConfigSchema>;
+
+export function parseConfig(input: unknown): Config {
+  const result = ConfigSchema.safeParse(input);
+  if (!result.success) {
+    throw new Error(\`Invalid config: \${result.error.message}\`);
+  }
+  return result.data;
+}
+
+export function loadConfigFromEnv(): Config {
+  return parseConfig({
+    apiKey: process.env.API_KEY,
+    baseUrl: process.env.BASE_URL,
+    timeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : undefined,
+    retries: process.env.RETRIES ? parseInt(process.env.RETRIES) : undefined,
+  });
+}`,
    ],
    [
      "/pr/description.md",
      `# Add Configuration Parser

## Summary
This PR adds a new configuration parsing module with Zod validation.

## Changes
- New \`src/config.ts\` with schema validation
- Support for loading config from environment variables
- Type-safe configuration object

## Testing
- Added unit tests for parseConfig
- Added integration tests for loadConfigFromEnv
`,
    ],
    [
      "/pr/metadata.json",
      JSON.stringify(
        {
          number: 123,
          title: "Add Configuration Parser",
          author: "developer",
          branch: "feature/config-parser",
          base: "main",
          commits: 3,
          additions: 45,
          deletions: 0,
        },
        null,
        2
      ),
    ],
  ]);

  console.log(`\nMock PR files:`);
  for (const [filePath] of initialFiles) {
    console.log(`  - ${filePath}`);
  }
  console.log();

  // Collect trace events
  const traceEvents: TraceEvent[] = [];

  // Run the skill
  console.log("Running skill with mock model...\n");
  console.log("-".repeat(70));
  console.log("JSONL Trace Output:");
  console.log("-".repeat(70));

  const result = await runSkill({
    harness: {
      model: createMockModel(),
      traceOutput: createCallbackOutput((event) => {
        traceEvents.push(event);
        // Print each event as JSONL to stdout
        console.log(JSON.stringify(event));
      }),
      maxContentLength: 500,
    },
    skillContent,
    skillPath,
    initialFiles,
    prompt:
      "Review PR #123. The PR files are in /pr directory. Focus on correctness and readability.",
    maxSteps: 10,
  });

  console.log("-".repeat(70));
  console.log();

  // Print summary
  console.log("=".repeat(70));
  console.log("Execution Summary");
  console.log("=".repeat(70));
  console.log();
  console.log(`Session ID:     ${result.sessionId}`);
  console.log(`Success:        ${result.success}`);
  console.log(`Duration:       ${result.durationMs.toFixed(2)}ms`);
  console.log(`Tool Calls:     ${result.toolCallCount}`);
  console.log();
  console.log("Token Usage:");
  console.log(`  Input:        ${result.tokenUsage.input}`);
  console.log(`  Output:       ${result.tokenUsage.output}`);
  console.log(`  Total:        ${result.tokenUsage.total}`);
  console.log();

  // Summarize trace events by type
  const eventCounts = new Map<string, number>();
  for (const event of traceEvents) {
    eventCounts.set(event.type, (eventCounts.get(event.type) || 0) + 1);
  }

  console.log("Trace Events:");
  for (const [type, count] of eventCounts) {
    console.log(`  ${type}: ${count}`);
  }
  console.log();

  // Print final response
  console.log("=".repeat(70));
  console.log("Final Response");
  console.log("=".repeat(70));
  console.log();
  console.log(result.finalResponse);
  console.log();

  if (result.error) {
    console.log("Error:", result.error);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
