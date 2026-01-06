/**
 * Benchmark runner script
 * 
 * Runs a benchmark case against a real LLM via Vercel AI Gateway
 * and captures the execution trace.
 * 
 * Usage:
 *   pnpm exec tsx benchmark/scripts/run.ts <case-path> <test-name>
 * 
 * Example:
 *   pnpm exec tsx benchmark/scripts/run.ts cases/unit/for-each-basic simple
 * 
 * Environment:
 *   AI_GATEWAY_API_KEY - Required for Vercel AI Gateway authentication
 */

import { readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { gateway } from "@ai-sdk/gateway";
import { runSkill, createFileOutput } from "../../packages/observability/src/index.js";

// Configuration
const BENCHMARK_ROOT = dirname(dirname(new URL(import.meta.url).pathname));
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

async function runBenchmark(casePath: string, testName: string) {
  console.log("=".repeat(70));
  console.log("MDZ Benchmark Runner");
  console.log("=".repeat(70));
  console.log();

  // Load benchmark case
  console.log(`Loading case: ${casePath}/${testName}`);
  const benchmarkCase = loadBenchmarkCase(casePath, testName);
  console.log(`  Project: ${benchmarkCase.projectPath}`);
  console.log(`  Test: ${benchmarkCase.testPath}`);
  console.log();

  // Build system prompt
  const systemPrompt = buildSystemPrompt(
    benchmarkCase.agentsContent,
    benchmarkCase.skillContent
  );
  console.log(`System prompt: ${systemPrompt.length} chars`);
  console.log();

  // Prepare output
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const caseSlug = casePath.replace(/\//g, "_");
  const tracePath = join(RESULTS_DIR, `${caseSlug}_${testName}_${timestamp}.jsonl`);
  
  // Ensure results directory exists
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // Convert initialFiles to Map
  const initialFiles = new Map<string, string>(
    Object.entries(benchmarkCase.input.initialFiles || {})
  );

  // Create model via Vercel AI Gateway
  const modelId = benchmarkCase.input.model || DEFAULT_MODEL;
  const model = gateway(modelId);
  
  console.log(`Model: ${modelId} (via Vercel AI Gateway)`);
  console.log(`Trace output: ${tracePath}`);
  console.log();

  // Run the benchmark
  console.log("-".repeat(70));
  console.log("Running...");
  console.log("-".repeat(70));
  console.log();

  const result = await runSkill({
    harness: {
      model,
      traceOutput: createFileOutput(tracePath),
    },
    skillContent: systemPrompt,
    skillPath: join(benchmarkCase.projectPath, "skill", "main.mdz"),
    initialFiles,
    prompt: benchmarkCase.input.prompt,
    maxSteps: benchmarkCase.input.maxSteps ?? 15,
  });

  // Print results
  console.log("=".repeat(70));
  console.log("Results");
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

  if (result.error) {
    console.log(`Error: ${result.error}`);
    console.log();
  }

  console.log("-".repeat(70));
  console.log("Final Response");
  console.log("-".repeat(70));
  console.log();
  console.log(result.finalResponse || "(empty)");
  console.log();

  console.log(`Trace saved to: ${tracePath}`);
  console.log();

  return result;
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: pnpm exec tsx benchmark/scripts/run.ts <case-path> <test-name>");
  console.error("Example: pnpm exec tsx benchmark/scripts/run.ts cases/unit/for-each-basic simple");
  process.exit(1);
}

const [casePath, testName] = args;
runBenchmark(casePath, testName).catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
