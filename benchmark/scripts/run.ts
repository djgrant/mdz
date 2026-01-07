/**
 * Benchmark runner script
 * 
 * Runs a benchmark case against a real LLM via Vercel AI Gateway
 * and captures the execution trace.
 * 
 * Usage:
 *   bun benchmark/scripts/run.ts <case-path> <test-name>
 * 
 * Example:
 *   bun benchmark/scripts/run.ts cases/unit/for-each-basic simple
 * 
 * Environment:
 *   AI_GATEWAY_API_KEY - Required for Vercel AI Gateway authentication
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

// Configuration - use import.meta.url which works in both Node and Bun
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BENCHMARK_ROOT = dirname(__dirname);
const RESULTS_DIR = join(BENCHMARK_ROOT, "results");
const DEFAULT_MODEL = "openai/gpt-4o-mini";

interface TestInput {
  prompt: string;
  initialFiles?: Record<string, string>;
  initialSkills?: Record<string, string>;
  model?: string;
  maxSteps?: number;
}

interface BenchmarkCase {
  casePath: string;
  testName: string;
  projectPath: string;
  testPath: string;
  agentsContent: string;
  skillContent: string;
  input: TestInput;
}

interface ToolCallRecord {
  name: string;
  args: unknown;
  result: unknown;
  durationMs: number;
}

interface BenchmarkResult {
  sessionId: string;
  success: boolean;
  finalResponse: string;
  toolCalls: ToolCallRecord[];
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  cost?: {
    input: number;
    output: number;
    total: number;
  };
  durationMs: number;
  error?: string;
}

function loadBenchmarkCase(casePath: string, testName: string): BenchmarkCase {
  const fullCasePath = join(BENCHMARK_ROOT, casePath);
  const projectPath = join(fullCasePath, "project");
  const testPath = join(fullCasePath, "tests", testName);

  // Load AGENTS.md
  const agentsPath = join(projectPath, "AGENTS.md");
  if (!existsSync(agentsPath)) {
    throw new Error(`AGENTS.md not found: ${agentsPath}`);
  }
  const agentsContent = readFileSync(agentsPath, "utf-8");

  // Load main skill
  const skillPath = join(projectPath, "skill", "main.mdz");
  if (!existsSync(skillPath)) {
    throw new Error(`main.mdz not found: ${skillPath}`);
  }
  const skillContent = readFileSync(skillPath, "utf-8");

  // Load test input
  const inputPath = join(testPath, "input.json");
  if (!existsSync(inputPath)) {
    throw new Error(`input.json not found: ${inputPath}`);
  }
  const input: TestInput = JSON.parse(readFileSync(inputPath, "utf-8"));

  return {
    casePath,
    testName,
    projectPath,
    testPath,
    agentsContent,
    skillContent,
    input,
  };
}

function buildSystemPrompt(agentsContent: string, skillContent: string): string {
  return `${agentsContent}

---

## Skill to Execute

${skillContent}`;
}

// Define tools for the OpenAI API
const toolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The path to the file to read" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The path to the file to write" },
          content: { type: "string", description: "The content to write" }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description: "List the contents of a directory",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The path to the directory" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "skill",
      description: "Load a skill by name",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The name of the skill to load" }
        },
        required: ["name"]
      }
    }
  }
];

function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  files: Map<string, string>,
  skills: Map<string, string>,
  toolCalls: ToolCallRecord[]
): unknown {
  const start = performance.now();
  let result: unknown;

  switch (toolName) {
    case "read_file": {
      const path = args.path as string;
      const content = files.get(path);
      result = content !== undefined 
        ? { content } 
        : { error: `File not found: ${path}` };
      break;
    }
    case "write_file": {
      const path = args.path as string;
      const content = args.content as string;
      files.set(path, content);
      result = { success: true };
      break;
    }
    case "list_directory": {
      const path = args.path as string;
      const normalizedPath = path.endsWith("/") ? path : `${path}/`;
      const entries = new Set<string>();
      for (const filePath of files.keys()) {
        if (filePath.startsWith(normalizedPath)) {
          const relative = filePath.slice(normalizedPath.length);
          const first = relative.split("/")[0];
          if (first) entries.add(first);
        }
      }
      result = { entries: [...entries].sort() };
      break;
    }
    case "skill": {
      const name = args.name as string;
      const content = skills.get(name);
      result = content !== undefined
        ? { content }
        : { error: `Skill not found: ${name}` };
      break;
    }
    default:
      result = { error: `Unknown tool: ${toolName}` };
  }

  toolCalls.push({
    name: toolName,
    args,
    result,
    durationMs: performance.now() - start,
  });

  return result;
}

export async function runBenchmark(
  casePath: string, 
  testName: string,
  onProgress?: (message: string) => void
): Promise<BenchmarkResult> {
  const log = onProgress || console.log;
  const sessionId = crypto.randomUUID();
  const startTime = performance.now();

  log(`Loading case: ${casePath}/${testName}`);
  const benchmarkCase = loadBenchmarkCase(casePath, testName);

  const systemPrompt = buildSystemPrompt(
    benchmarkCase.agentsContent,
    benchmarkCase.skillContent
  );

  // Initialize sandbox
  const files = new Map<string, string>(
    Object.entries(benchmarkCase.input.initialFiles || {})
  );
  const skills = new Map<string, string>(
    Object.entries(benchmarkCase.input.initialSkills || {})
  );
  const toolCalls: ToolCallRecord[] = [];

  const modelId = benchmarkCase.input.model || DEFAULT_MODEL;
  log(`Model: ${modelId} (via Vercel AI Gateway)`);

  // Initialize OpenAI client with Vercel AI Gateway
  const client = new OpenAI({
    apiKey: process.env.AI_GATEWAY_API_KEY,
    baseURL: "https://ai-gateway.vercel.sh/v1",
  });

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: benchmarkCase.input.prompt },
  ];

  const maxSteps = benchmarkCase.input.maxSteps ?? 15;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let finalResponse = "";

  try {
    log("Running...");
    
    for (let step = 0; step < maxSteps; step++) {
      const response = await client.chat.completions.create({
        model: modelId,
        messages,
        tools: toolDefinitions,
      });

      const choice = response.choices[0];
      const message = choice.message;

      // Track usage
      if (response.usage) {
        totalInputTokens += response.usage.prompt_tokens;
        totalOutputTokens += response.usage.completion_tokens;
      }

      // Extract cost from provider metadata if available
      const providerMeta = (message as any).provider_metadata;
      if (providerMeta?.gateway?.cost) {
        totalCost += parseFloat(providerMeta.gateway.cost);
      }

      // Add assistant message to history
      messages.push(message);

      // Check if there are tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== "function") continue;
          const args = JSON.parse(toolCall.function.arguments);
          const result = executeToolCall(
            toolCall.function.name,
            args,
            files,
            skills,
            toolCalls
          );

          // Add tool result to messages
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
      } else {
        // No tool calls, conversation is done
        finalResponse = message.content || "";
        break;
      }

      // If this was the last step and we still have tool calls, get final response
      if (step === maxSteps - 1) {
        const finalResp = await client.chat.completions.create({
          model: modelId,
          messages,
        });
        finalResponse = finalResp.choices[0].message.content || "";
        if (finalResp.usage) {
          totalInputTokens += finalResp.usage.prompt_tokens;
          totalOutputTokens += finalResp.usage.completion_tokens;
        }
      }
    }

    const durationMs = performance.now() - startTime;

    return {
      sessionId,
      success: true,
      finalResponse,
      toolCalls,
      tokenUsage: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      cost: totalCost > 0 ? {
        input: 0, // Gateway doesn't break down cost
        output: 0,
        total: totalCost,
      } : undefined,
      durationMs,
    };
  } catch (error) {
    const durationMs = performance.now() - startTime;
    return {
      sessionId,
      success: false,
      finalResponse: "",
      toolCalls,
      tokenUsage: { input: totalInputTokens, output: totalOutputTokens, total: totalInputTokens + totalOutputTokens },
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// CLI entry point - check if running as main module
const isMain = process.argv[1] && (
  process.argv[1] === __filename ||
  process.argv[1].endsWith('/run.ts')
);

if (isMain) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: bun benchmark/scripts/run.ts <case-path> <test-name>");
    console.error("Example: bun benchmark/scripts/run.ts cases/unit/for-each-basic simple");
    process.exit(1);
  }

  const [casePath, testName] = args;
  
  console.log("=".repeat(70));
  console.log("MDZ Benchmark Runner");
  console.log("=".repeat(70));
  console.log();

  const result = await runBenchmark(casePath, testName);

  console.log();
  console.log("=".repeat(70));
  console.log("Results");
  console.log("=".repeat(70));
  console.log();
  console.log(`Session ID:     ${result.sessionId}`);
  console.log(`Success:        ${result.success}`);
  console.log(`Duration:       ${result.durationMs.toFixed(2)}ms`);
  console.log(`Tool Calls:     ${result.toolCalls.length}`);
  console.log();
  console.log("Token Usage:");
  console.log(`  Input:        ${result.tokenUsage.input}`);
  console.log(`  Output:       ${result.tokenUsage.output}`);
  console.log(`  Total:        ${result.tokenUsage.total}`);
  
  if (result.cost) {
    console.log();
    console.log("Cost:");
    console.log(`  Total:        $${result.cost.total.toFixed(6)}`);
  }
  
  console.log();

  if (result.error) {
    console.log(`Error: ${result.error}`);
    console.log();
  }

  console.log("-".repeat(70));
  console.log("Tool Calls");
  console.log("-".repeat(70));
  for (const tc of result.toolCalls) {
    console.log(`  ${tc.name}(${JSON.stringify(tc.args)}) => ${JSON.stringify(tc.result).slice(0, 60)}...`);
  }
  console.log();

  console.log("-".repeat(70));
  console.log("Final Response");
  console.log("-".repeat(70));
  console.log();
  console.log(result.finalResponse || "(empty)");
  console.log();

  // Save result using Node.js fs
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultPath = join(RESULTS_DIR, `${casePath.replace(/\//g, "_")}_${testName}_${timestamp}.json`);
  writeFileSync(resultPath, JSON.stringify(result, null, 2));
  console.log(`Result saved to: ${resultPath}`);
}
