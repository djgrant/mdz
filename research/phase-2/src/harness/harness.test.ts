/**
 * Phase-2 harness unit tests. No model calls.
 *
 * Covers: transcript parsing, resume logic, manifest loading, cwd munging,
 * and the mock MCP server's stdio protocol + log format (spawned as a child
 * process and driven with minimal newline-delimited JSON-RPC).
 */

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

import {
  collectDoneIds,
  loadManifest,
  mungeCwd,
  parseTranscript,
} from "./transcript.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "fixtures");

describe("parseTranscript", () => {
  const text = readFileSync(join(FIXTURES, "transcript.jsonl"), "utf8");
  const { spawns, toolCalls } = parseTranscript(text);

  it("extracts every Task tool_use as a spawn", () => {
    expect(spawns).toHaveLength(2);
    expect(spawns[0]).toMatchObject({
      subagentType: "general-purpose",
      prompt: "Process item alpha (canary A1B2).",
    });
    expect(spawns[1].prompt).toContain("C3D4");
  });

  it("extracts mcp__ tool_use entries (set and get) but not Task", () => {
    expect(toolCalls.map((c) => c.name)).toEqual(["mcp__state__set", "mcp__state__get"]);
    expect(toolCalls[0].input).toMatchObject({ name: "total", value: 42 });
  });

  it("tolerates blank lines and non-JSON noise", () => {
    const noisy = "\n" + text + "\nnot json\n{bad}\n";
    expect(parseTranscript(noisy).spawns).toHaveLength(2);
  });

  it("recognises the `Agent` tool_use alias (claude 2.1.207 records Task as Agent)", () => {
    const line = JSON.stringify({
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            name: "Agent",
            input: { subagent_type: "general-purpose", prompt: "do it" },
          },
        ],
      },
    });
    const { spawns } = parseTranscript(line);
    expect(spawns).toEqual([
      { subagentType: "general-purpose", prompt: "do it", description: null },
    ]);
  });
});

describe("collectDoneIds (resume)", () => {
  it("counts ids recorded without error, skips errored and corrupt lines", () => {
    const jsonl = [
      JSON.stringify({ id: "a", error: null }),
      JSON.stringify({ id: "b", error: "timeout after 600000ms" }),
      JSON.stringify({ id: "c", error: null }),
      "{ corrupt",
      "",
    ].join("\n");
    const done = collectDoneIds(jsonl);
    expect(done.has("a")).toBe(true);
    expect(done.has("c")).toBe(true);
    expect(done.has("b")).toBe(false); // errored -> re-run
  });
});

describe("loadManifest", () => {
  it("loads and normalises the fixture manifest", async () => {
    const m = await loadManifest(join(FIXTURES, "manifest.json"));
    expect(m).toHaveLength(3);
    const e2 = m.find((e) => e.id === "e2-inline-3")!;
    expect(e2.runMode).toBe("agentic");
    expect(e2.allowedTools).toEqual(["Task"]);
    expect(e2.sandbox).toHaveProperty("skills/map-reduce.mdz");
    const e3 = m.find((e) => e.id === "e3-store-size100")!;
    expect(e3.mcp).toBe("state");
    expect(e3.arm).toBe("store");
  });
});

describe("mungeCwd", () => {
  it("maps / and . to - (observed claude 2.1.207 munging)", () => {
    expect(mungeCwd("/Users/coder/.craft/x")).toBe("-Users-coder--craft-x");
    expect(mungeCwd("/private/var/folders/T/mdz-abc")).toBe(
      "-private-var-folders-T-mdz-abc",
    );
  });
});

describe("mcp-state-server (child process, JSON-RPC over stdio)", () => {
  const logDir = mkdtempSync(join(tmpdir(), "mdz-mcp-test-"));
  const logPath = join(logDir, "state.log");
  afterAll(() => rmSync(logDir, { recursive: true, force: true }));

  it("speaks initialize/tools/list/tools/call and logs set + get", async () => {
    const serverPath = join(HERE, "mcp-state-server.ts");
    const child = spawn("npx", ["tsx", serverPath], {
      env: { ...process.env, STATE_LOG: logPath },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const responses: Record<string, unknown>[] = [];
    let buf = "";
    child.stdout.on("data", (d) => {
      buf += d.toString();
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) responses.push(JSON.parse(line));
      }
    });

    const send = (msg: unknown) => child.stdin.write(JSON.stringify(msg) + "\n");
    const waitFor = (id: number) =>
      new Promise<Record<string, unknown>>((resolvePromise, reject) => {
        const t = setTimeout(() => reject(new Error(`timeout waiting for id ${id}`)), 20000);
        const poll = setInterval(() => {
          const found = responses.find((r) => r.id === id);
          if (found) {
            clearInterval(poll);
            clearTimeout(t);
            resolvePromise(found);
          }
        }, 25);
      });

    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    const init = await waitFor(1);
    expect((init.result as any).serverInfo.name).toBe("state");

    send({ jsonrpc: "2.0", method: "notifications/initialized" }); // no reply expected

    send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const list = await waitFor(2);
    expect((list.result as any).tools.map((t: any) => t.name).sort()).toEqual(["get", "set"]);

    send({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "set", arguments: { name: "x", value: 7 } },
    });
    const setRes = await waitFor(3);
    expect((setRes.result as any).content[0].text).toBe("ok");

    send({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "get", arguments: { name: "x" } },
    });
    const getRes = await waitFor(4);
    expect((getRes.result as any).content[0].text).toBe("7");

    child.stdin.end();
    child.kill();

    const logLines = (await readFile(logPath, "utf8"))
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    expect(logLines).toHaveLength(2);
    expect(logLines[0]).toMatchObject({ tool: "set", name: "x", value: 7, result: "ok" });
    expect(logLines[1]).toMatchObject({ tool: "get", name: "x", result: 7 });
    expect(typeof logLines[0].ts).toBe("string");
  }, 30000);
});
