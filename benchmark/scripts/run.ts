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

import { readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { gateway } from "@ai-sdk/gateway";
import { generateText, tool } from "ai";
import { z } from "zod";

// Configuration
const BENCHMARK_ROOT = dirname(dirname(Bun.main));
const RESULTS_DIR = join(BENCHMARK_ROOT, "results");
const DEFAULT_MODEL = "anthropic/claude-sonnet-4-20250514";

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

function createSandboxTools(
  files: Map<string, string>,
  skills: Map<string, string>,
  toolCalls: ToolCallRecord[]
) {
  return {
    read_file: tool({
      description: "Read the contents of a file",
      parameters: z.object({
        path: z.string().describe("The path to the file to read"),
      }),
      execute: async ({ path }) => {
        const start = performance.now();
        const content = files.get(path);
        const result = content !== undefined 
          ? { content } 
          : { error: `File not found: ${path}` };
        toolCalls.push({
          name: "read_file",
          args: { path },
          result,
          durationMs: performance.now() - start,
        });
        return result;
      },
    }),
    write_file: tool({
      description: "Write content to a file",
      parameters: z.object({
        path: z.string().describe("The path to the file to write"),
        content: z.string().describe("The content to write"),
      }),
      execute: async ({ path, content }) => {
        const start = performance.now();
        files.set(path, content);
        const result = { success: true };
        toolCalls.push({
          name: "write_file",
          args: { path, content },
          result,
          durationMs: performance.now() - start,
        });
        return result;
      },
    }),
    list_directory: tool({
      description: "List the contents of a directory",
      parameters: z.object({
        path: z.string().describe("The path to the directory"),
      }),
      execute: async ({ path }) => {
        const start = performance.now();
        const normalizedPath = path.endsWith("/") ? path : `${path}/`;
        const entries = new Set<string>();
        for (const filePath of files.keys()) {
          if (filePath.startsWith(normalizedPath)) {
            const relative = filePath.slice(normalizedPath.length);
            const first = relative.split("/")[0];
            if (first) entries.add(first);
          }
        }
        const result = { entries: [...entries].sort() };
        toolCalls.push({
          name: "list_directory",
          args: { path },
          result,
          durationMs: performance.now() - start,
        });
        return result;
      },
    }),
    skill: tool({
      description: "Load a skill by name",
      parameters: z.object({
        name: z.string().describe("The name of the skill to load"),
      }),
      execute: async ({ name }) => {
        const start = performance.now();
        const content = skills.get(name);
        const result = content !== undefined
          ? { content }
          : { error: `Skill not found: ${name}` };
        toolCalls.push({
          name: "skill",
          args: { name },
          result,
          durationMs: performance.now() - start,
        });
        return result;
      },
    }),
  };
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
  const tools = createSandboxTools(files, skills, toolCalls);

  const modelId = benchmarkCase.input.model || DEFAULT_MODEL;
  log(`Model: ${modelId} (via Vercel AI Gateway)`);

  try {
    log("Running...");
    
    const result = await generateText({
      model: gateway(modelId),
      system: systemPrompt,
      prompt: benchmarkCase.input.prompt,
      tools,
      maxSteps: benchmarkCase.input.maxSteps ?? 15,
    });

    const durationMs = performance.now() - startTime;

    // Extract usage
    const usage = result.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    
    // Extract cost from providerMetadata if available
    const providerMeta = result.providerMetadata as Record<string, unknown> | undefined;
    const gatewayCost = providerMeta?.gateway as { cost?: { input: number; output: number; total: number } } | undefined;

    return {
      sessionId,
      success: true,
      finalResponse: result.text,
      toolCalls,
      tokenUsage: {
        input: usage.promptTokens,
        output: usage.completionTokens,
        total: usage.totalTokens,
      },
      cost: gatewayCost?.cost,
      durationMs,
    };
  } catch (error) {
    const durationMs = performance.now() - startTime;
    return {
      sessionId,
      success: false,
      finalResponse: "",
      toolCalls,
      tokenUsage: { input: 0, output: 0, total: 0 },
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// CLI entry point
if (import.meta.main) {
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
    console.log(`  Input:        $${result.cost.input.toFixed(6)}`);
    console.log(`  Output:       $${result.cost.output.toFixed(6)}`);
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

  // Save result
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultPath = join(RESULTS_DIR, `${casePath.replace(/\//g, "_")}_${testName}_${timestamp}.json`);
  Bun.write(resultPath, JSON.stringify(result, null, 2));
  console.log(`Result saved to: ${resultPath}`);
}
