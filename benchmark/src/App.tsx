import { createSignal, createEffect, For, Show } from 'solid-js';

interface ToolCall {
  name: string;
  args: unknown;
  result: unknown;
  durationMs: number;
}

interface BenchmarkResult {
  sessionId: string;
  success: boolean;
  finalResponse: string;
  toolCalls: ToolCall[];
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

interface BenchmarkCase {
  path: string;
  tests: string[];
}

// Icons as inline SVGs
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="6 3 20 12 6 21 6 3"></polygon>
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m6 9 6 6 6-6"></path>
  </svg>
);

const AlertCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" x2="12" y1="8" y2="12"></line>
    <line x1="12" x2="12.01" y1="16" y2="16"></line>
  </svg>
);

const TerminalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" x2="20" y1="19" y2="19"></line>
  </svg>
);

const BeakerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4.5 3h15"></path>
    <path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"></path>
    <path d="M6 14h12"></path>
  </svg>
);

export function App() {
  const [cases, setCases] = createSignal<BenchmarkCase[]>([]);
  const [selectedCase, setSelectedCase] = createSignal('');
  const [selectedTest, setSelectedTest] = createSignal('');
  const [isRunning, setIsRunning] = createSignal(false);
  const [result, setResult] = createSignal<BenchmarkResult | null>(null);
  const [expandedTools, setExpandedTools] = createSignal<Set<number>>(new Set());

  // Load cases on mount
  createEffect(async () => {
    try {
      const res = await fetch('/api/cases');
      const data = await res.json();
      setCases(data.cases);
      if (data.cases.length > 0) {
        setSelectedCase(data.cases[0].path);
        if (data.cases[0].tests.length > 0) {
          setSelectedTest(data.cases[0].tests[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load cases:', e);
    }
  });

  // Update selected test when case changes
  createEffect(() => {
    const currentCase = cases().find(c => c.path === selectedCase());
    if (currentCase && currentCase.tests.length > 0) {
      setSelectedTest(currentCase.tests[0]);
    }
  });

  const currentTests = () => {
    const c = cases().find(c => c.path === selectedCase());
    return c?.tests || [];
  };

  const runBenchmark = async () => {
    setIsRunning(true);
    setResult(null);
    setExpandedTools(new Set());

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          casePath: selectedCase(),
          testName: selectedTest(),
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({
        sessionId: '',
        success: false,
        finalResponse: '',
        toolCalls: [],
        tokenUsage: { input: 0, output: 0, total: 0 },
        durationMs: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsRunning(false);
    }
  };

  const toggleTool = (index: number) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatCost = (cost?: { total: number }) => {
    if (!cost) return '-';
    return `$${cost.total.toFixed(4)}`;
  };

  return (
    <div class="container">
      <header class="header">
        <h1 class="header-title">MDZ Benchmark Runner</h1>
        <span class="header-badge">v0.1.0</span>
      </header>

      <main class="main-layout">
        <aside class="control-panel">
          <div class="control-card">
            <div class="control-section">
              <label class="select-label">Case</label>
              <select
                id="case-select"
                class="select"
                value={selectedCase()}
                onChange={(e) => setSelectedCase(e.currentTarget.value)}
              >
                <For each={cases()}>
                  {(c) => <option value={c.path}>{c.path}</option>}
                </For>
              </select>
            </div>

            <div class="control-section">
              <label class="select-label">Test</label>
              <select
                id="test-select"
                class="select"
                value={selectedTest()}
                onChange={(e) => setSelectedTest(e.currentTarget.value)}
              >
                <For each={currentTests()}>
                  {(t) => <option value={t}>{t}</option>}
                </For>
              </select>
            </div>

            <div class="control-section">
              <button
                id="run-btn"
                class="btn-primary"
                onClick={runBenchmark}
                disabled={isRunning()}
              >
                <Show when={isRunning()} fallback={<><PlayIcon /> Run Benchmark</>}>
                  <div class="btn-spinner"></div>
                  Running...
                </Show>
              </button>
              <Show when={isRunning()}>
                <div class="progress-bar">
                  <div class="progress-bar-inner"></div>
                </div>
              </Show>
            </div>
          </div>
        </aside>

        <div class="results-area">
          <Show when={result()} fallback={
            <div class="empty-state">
              <BeakerIcon />
              <h2 class="empty-state-title">No results yet</h2>
              <p class="empty-state-description">
                Select a benchmark case and click "Run Benchmark" to see results.
              </p>
            </div>
          }>
            {(r) => (
              <div id="results" class="results-panel">
                <div class="stats-grid">
                  <div class={`stat-card ${r().success ? 'status-success' : 'status-error'}`}>
                    <div id="stat-status" class={`stat-value ${r().success ? 'success' : 'error'}`}>
                      {r().success ? '✓' : '✗'}
                    </div>
                    <div class="stat-label">Status</div>
                  </div>
                  <div class="stat-card">
                    <div id="stat-duration" class="stat-value">{formatDuration(r().durationMs)}</div>
                    <div class="stat-label">Duration</div>
                  </div>
                  <div class="stat-card">
                    <div id="stat-tools" class="stat-value">{r().toolCalls?.length ?? 0}</div>
                    <div class="stat-label">Tool Calls</div>
                  </div>
                  <div class="stat-card">
                    <div id="stat-tokens" class="stat-value">{r().tokenUsage?.total ?? 0}</div>
                    <div class="stat-label">Tokens</div>
                  </div>
                  <div class="stat-card">
                    <div id="stat-cost" class="stat-value">{formatCost(r().cost)}</div>
                    <div class="stat-label">Cost</div>
                  </div>
                </div>

                <Show when={r().toolCalls && r().toolCalls.length > 0}>
                  <div class="section">
                    <div class="section-header">
                      <h2 class="section-title">Tool Calls</h2>
                      <span class="section-badge">{r().toolCalls.length}</span>
                    </div>
                    <div id="tool-calls" class="timeline">
                      <For each={r().toolCalls}>
                        {(tc, index) => (
                          <div class={`timeline-item ${expandedTools().has(index()) ? 'expanded' : ''} ${tc.result && typeof tc.result === 'object' && 'error' in tc.result ? 'error' : ''}`}>
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                              <div class="timeline-header" onClick={() => toggleTool(index())}>
                                <span class="timeline-tool-name">
                                  <span class="timeline-tool-icon"><TerminalIcon /></span>
                                  {tc.name}
                                </span>
                                <span class="timeline-chevron"><ChevronDownIcon /></span>
                              </div>
                              <Show when={expandedTools().has(index())}>
                                <div class="timeline-body">
                                  <div class="timeline-detail">
                                    <div class="timeline-detail-label">Arguments</div>
                                    <pre class="timeline-code">{JSON.stringify(tc.args, null, 2)}</pre>
                                  </div>
                                  <div class="timeline-detail">
                                    <div class="timeline-detail-label">Result</div>
                                    <pre class="timeline-code">{JSON.stringify(tc.result, null, 2)}</pre>
                                  </div>
                                </div>
                              </Show>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                <div class="section">
                  <div class="response-panel">
                    <div class="response-header">
                      <span class="response-title">Response</span>
                    </div>
                    <div id="response" class="response-body">
                      <Show when={r().finalResponse} fallback={<span class="response-empty">(empty)</span>}>
                        {r().finalResponse}
                      </Show>
                    </div>
                  </div>
                </div>

                <Show when={r().error}>
                  <div id="error-section" class="error-panel">
                    <div class="error-header">
                      <span class="error-icon"><AlertCircleIcon /></span>
                      <span class="error-title">Error</span>
                    </div>
                    <div id="error-msg" class="error-body">{r().error}</div>
                  </div>
                </Show>
              </div>
            )}
          </Show>
        </div>
      </main>
    </div>
  );
}
