/**
 * Mock tools for MDZ observability sandbox
 *
 * Simulates claude-code/opencode tools using Vercel AI SDK's tool() function.
 * Tools operate on an in-memory filesystem and record calls via callbacks.
 */

import { tool, type Tool } from "ai";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

export interface MockToolOptions {
  /** Callback when tool is called (before execution) */
  onCall?: (toolName: string, args: unknown) => void;
  /** Callback when tool returns (after execution) */
  onResult?: (
    toolName: string,
    args: unknown,
    result: unknown,
    durationMs: number
  ) => void;
}

export interface SandboxState {
  /** In-memory filesystem: path -> content */
  files: Map<string, string>;
  /** Available skills by name */
  skills: Map<string, string>;
  /** Custom handler for bash commands */
  bashHandler?: (
    command: string,
    workdir?: string
  ) => { stdout: string; stderr: string; exitCode: number };
  /** Custom handler for web searches */
  webSearchHandler?: (
    query: string
  ) => Array<{ title: string; url: string; snippet: string }>;
}

// ============================================================================
// Tool Result Types
// ============================================================================

export interface ReadFileResult {
  content?: string;
  error?: string;
}

export interface WriteFileResult {
  success: boolean;
  error?: string;
}

export interface ListDirectoryResult {
  entries?: string[];
  error?: string;
}

export interface BashResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface WebSearchResult {
  results: Array<{ title: string; url: string; snippet: string }>;
}

export interface SkillResult {
  content?: string;
  error?: string;
}

// ============================================================================
// Helper: Wrap tool execution with timing and callbacks
// ============================================================================

function wrapToolExecute<TArgs, TResult>(
  toolName: string,
  execute: (args: TArgs) => TResult | Promise<TResult>,
  options?: MockToolOptions
): (args: TArgs) => Promise<TResult> {
  return async (args: TArgs): Promise<TResult> => {
    options?.onCall?.(toolName, args);
    const startTime = performance.now();

    try {
      const result = await execute(args);
      const durationMs = performance.now() - startTime;
      options?.onResult?.(toolName, args, result, durationMs);
      return result;
    } catch (error) {
      const durationMs = performance.now() - startTime;
      const errorResult = { error: String(error) };
      options?.onResult?.(toolName, args, errorResult, durationMs);
      throw error;
    }
  };
}

// ============================================================================
// Filesystem Tools
// ============================================================================

function createReadFileTool(
  state: SandboxState,
  options?: MockToolOptions
): Tool {
  return tool({
    description:
      "Read the contents of a file at the specified path. Returns the file content as a string, or an error if the file does not exist.",
    parameters: z.object({
      path: z.string().describe("The absolute or relative path to the file to read"),
    }),
    execute: wrapToolExecute<{ path: string }, ReadFileResult>(
      "read_file",
      ({ path }) => {
        const content = state.files.get(path);
        if (content === undefined) {
          return { error: `File not found: ${path}` };
        }
        return { content };
      },
      options
    ),
  });
}

function createWriteFileTool(
  state: SandboxState,
  options?: MockToolOptions
): Tool {
  return tool({
    description:
      "Write content to a file at the specified path. Creates the file if it does not exist, or overwrites it if it does.",
    parameters: z.object({
      path: z.string().describe("The absolute or relative path to the file to write"),
      content: z.string().describe("The content to write to the file"),
    }),
    execute: wrapToolExecute<{ path: string; content: string }, WriteFileResult>(
      "write_file",
      ({ path, content }) => {
        state.files.set(path, content);
        return { success: true };
      },
      options
    ),
  });
}

function createListDirectoryTool(
  state: SandboxState,
  options?: MockToolOptions
): Tool {
  return tool({
    description:
      "List the contents of a directory. Returns an array of file and directory names within the specified path.",
    parameters: z.object({
      path: z.string().describe("The absolute or relative path to the directory to list"),
    }),
    execute: wrapToolExecute<{ path: string }, ListDirectoryResult>(
      "list_directory",
      ({ path }) => {
        // Normalize path: ensure it ends with / for prefix matching
        const normalizedPath = path.endsWith("/") ? path : `${path}/`;
        const entries = new Set<string>();

        for (const filePath of state.files.keys()) {
          if (filePath.startsWith(normalizedPath)) {
            // Get the relative path after the directory
            const relativePath = filePath.slice(normalizedPath.length);
            // Get the first segment (file or subdirectory name)
            const firstSegment = relativePath.split("/")[0];
            if (firstSegment) {
              entries.add(firstSegment);
            }
          }
        }

        if (entries.size === 0) {
          // Check if any files exist with this exact prefix
          const hasPrefix = [...state.files.keys()].some(
            (f) => f.startsWith(normalizedPath) || f === path
          );
          if (!hasPrefix) {
            return { error: `Directory not found: ${path}` };
          }
        }

        return { entries: [...entries].sort() };
      },
      options
    ),
  });
}

// ============================================================================
// Bash Tool
// ============================================================================

function createBashTool(
  state: SandboxState,
  options?: MockToolOptions
): Tool {
  return tool({
    description:
      "Execute a bash command in the sandbox environment. Returns stdout, stderr, and exit code.",
    parameters: z.object({
      command: z.string().describe("The bash command to execute"),
      workdir: z
        .string()
        .optional()
        .describe("The working directory to execute the command in"),
    }),
    execute: wrapToolExecute<{ command: string; workdir?: string }, BashResult>(
      "bash",
      ({ command, workdir }) => {
        if (state.bashHandler) {
          return state.bashHandler(command, workdir);
        }

        // Default mock behavior: simulate common commands
        const trimmedCommand = command.trim();

        // Simulate `echo` command
        if (trimmedCommand.startsWith("echo ")) {
          const output = trimmedCommand.slice(5).replace(/^["']|["']$/g, "");
          return { stdout: output + "\n", stderr: "", exitCode: 0 };
        }

        // Simulate `pwd` command
        if (trimmedCommand === "pwd") {
          return { stdout: (workdir || "/sandbox") + "\n", stderr: "", exitCode: 0 };
        }

        // Simulate `cat` command
        if (trimmedCommand.startsWith("cat ")) {
          const path = trimmedCommand.slice(4).trim();
          const content = state.files.get(path);
          if (content !== undefined) {
            return { stdout: content, stderr: "", exitCode: 0 };
          }
          return { stdout: "", stderr: `cat: ${path}: No such file or directory`, exitCode: 1 };
        }

        // Simulate `ls` command
        if (trimmedCommand === "ls" || trimmedCommand.startsWith("ls ")) {
          const path = trimmedCommand === "ls" ? "." : trimmedCommand.slice(3).trim();
          const normalizedPath = path === "." ? "/" : path.endsWith("/") ? path : `${path}/`;
          const entries = new Set<string>();

          for (const filePath of state.files.keys()) {
            if (normalizedPath === "/" || filePath.startsWith(normalizedPath)) {
              const relativePath =
                normalizedPath === "/" ? filePath : filePath.slice(normalizedPath.length);
              const firstSegment = relativePath.split("/").filter(Boolean)[0];
              if (firstSegment) {
                entries.add(firstSegment);
              }
            }
          }

          return { stdout: [...entries].sort().join("\n") + "\n", stderr: "", exitCode: 0 };
        }

        // Default: command not found or not implemented
        return {
          stdout: "",
          stderr: `[sandbox] Command simulated: ${command}`,
          exitCode: 0,
        };
      },
      options
    ),
  });
}

// ============================================================================
// Web Search Tool
// ============================================================================

function createWebSearchTool(
  state: SandboxState,
  options?: MockToolOptions
): Tool {
  return tool({
    description:
      "Search the web for information. Returns a list of results with title, URL, and snippet.",
    parameters: z.object({
      query: z.string().describe("The search query"),
    }),
    execute: wrapToolExecute<{ query: string }, WebSearchResult>(
      "web_search",
      ({ query }) => {
        if (state.webSearchHandler) {
          return { results: state.webSearchHandler(query) };
        }

        // Default mock behavior: return generic results
        return {
          results: [
            {
              title: `Search result for: ${query}`,
              url: `https://example.com/search?q=${encodeURIComponent(query)}`,
              snippet: `This is a mock search result for the query "${query}". In a real environment, this would contain relevant information.`,
            },
            {
              title: `Documentation: ${query}`,
              url: `https://docs.example.com/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, "-"))}`,
              snippet: `Official documentation and guides related to ${query}.`,
            },
          ],
        };
      },
      options
    ),
  });
}

// ============================================================================
// Skill Tool
// ============================================================================

function createSkillTool(
  state: SandboxState,
  options?: MockToolOptions
): Tool {
  return tool({
    description:
      "Load a skill by name. Returns the skill content, or an error if the skill is not found.",
    parameters: z.object({
      name: z.string().describe("The name of the skill to load"),
    }),
    execute: wrapToolExecute<{ name: string }, SkillResult>(
      "skill",
      ({ name }) => {
        const content = state.skills.get(name);
        if (content === undefined) {
          return { error: `Skill not found: ${name}` };
        }
        return { content };
      },
      options
    ),
  });
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a set of sandbox tools for testing and simulation.
 *
 * @param state - The sandbox state containing files, skills, and optional handlers
 * @param options - Optional callbacks for tracking tool calls and results
 * @returns A record of tool instances that can be used with the Vercel AI SDK
 *
 * @example
 * ```typescript
 * const state: SandboxState = {
 *   files: new Map([
 *     ["/src/index.ts", "export const hello = 'world';"],
 *   ]),
 *   skills: new Map([
 *     ["code-review", "# Code Review\n\nReview code for best practices..."],
 *   ]),
 * };
 *
 * const tools = createSandboxTools(state, {
 *   onCall: (name, args) => console.log(`Calling ${name}`, args),
 *   onResult: (name, args, result, ms) => console.log(`${name} took ${ms}ms`),
 * });
 *
 * // Use with generateText or streamText
 * const result = await generateText({
 *   model,
 *   tools,
 *   prompt: "Read the file at /src/index.ts",
 * });
 * ```
 */
export function createSandboxTools(
  state: SandboxState,
  options?: MockToolOptions
): Record<string, Tool> {
  return {
    read_file: createReadFileTool(state, options),
    write_file: createWriteFileTool(state, options),
    list_directory: createListDirectoryTool(state, options),
    bash: createBashTool(state, options),
    web_search: createWebSearchTool(state, options),
    skill: createSkillTool(state, options),
  };
}

/**
 * Create an empty sandbox state for testing.
 *
 * @returns A fresh SandboxState with empty files and skills maps
 */
export function createEmptySandboxState(): SandboxState {
  return {
    files: new Map(),
    skills: new Map(),
  };
}
