export interface Task {
  title: string;
  done: boolean;
  hours: number;
}

export interface ReportInput {
  title: string;
  tasks: Task[];
}

export interface ReportOptions {
  separator?: string;
  bullet?: string;
  sections?: string[];
  theme?: string;
  locale?: string;
  outputFormat?: "text";
}

const MESSAGES = {
  done: "done",
  total: "total",
  doneLabel: "Done",
  openLabel: "Open",
  hoursLabel: "Hours",
};

const THEME = {
  separator: "=",
  bullet: "-",
  doneMarker: "[x]",
  openMarker: "[ ]",
};

const DEFAULT_OPTIONS: Required<ReportOptions> = {
  separator: "=",
  bullet: "-",
  sections: ["header", "tasks", "footer"],
  theme: "default",
  locale: "en",
  outputFormat: "text",
};

function renderHeader(title: string, separator: string): string[] {
  const underline = separator.repeat(title.length);
  return [title, underline];
}

function renderTasks(tasks: Task[], bullet: string): string[] {
  return tasks.map((task) => {
    const marker = task.done ? THEME.doneMarker : THEME.openMarker;
    return `${bullet} ${marker} ${task.title} (${task.hours}h)`;
  });
}

function renderSummary(): string[] {
  return [
    `${MESSAGES.doneLabel}: 0`,
    `${MESSAGES.openLabel}: 0`,
    `${MESSAGES.hoursLabel}: 0h`,
  ];
}

function renderFooter(tasks: Task[]): string[] {
  let doneCount = 0;
  let totalHours = 0;
  for (const task of tasks) {
    if (task.done) doneCount += 1;
    totalHours += task.hours;
  }
  const total = tasks.length;
  return [`${doneCount}/${total} ${MESSAGES.done}, ${totalHours}h ${MESSAGES.total}`];
}

const renderers: Record<string, (input: ReportInput, options: Required<ReportOptions>) => string[]> = {
  header: (input, opts) => renderHeader(input.title, opts.separator),
  tasks: (input, opts) => renderTasks(input.tasks, opts.bullet),
  summary: (input) => renderSummary(),
  footer: (input) => renderFooter(input.tasks),
};

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const lines: string[] = [];

  for (const section of opts.sections) {
    const renderer = renderers[section];
    if (!renderer) {
      throw new Error(`no renderer for section: ${section}`);
    }
    lines.push(...renderer(input, opts));
  }

  return lines.join("\n");
}
