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

const MESSAGES = { en: { done: "done", total: "total", doneLabel: "Done", openLabel: "Open", hoursLabel: "Hours" } };
const THEMES = { default: { separator: "=", bullet: "-", doneMarker: "[x]", openMarker: "[ ]" } };
const DEFAULT_OPTIONS: Required<ReportOptions> = {
  separator: "=", bullet: "-", sections: ["header", "tasks", "footer"], theme: "default", locale: "en", outputFormat: "text",
};

const renderers: Record<string, (input: ReportInput, sep: string, bullet: string) => string[]> = {
  header: ({ title }) => [title, "=".repeat(title.length)],

  tasks: ({ tasks }, _sep, bullet) => tasks.map((task) => {
    const marker = task.done ? "[x]" : "[ ]";
    return `${bullet} ${marker} ${task.title} (${task.hours}h)`;
  }),

  summary: ({ tasks }) => {
    let done = 0, open = 0, hours = 0;
    for (const task of tasks) {
      (task.done ? done : open)++;
      hours += task.hours;
    }
    return [`Done: ${done}`, `Open: ${open}`, `Hours: ${hours}h`];
  },

  footer: ({ tasks }) => {
    let done = 0, hours = 0;
    for (const task of tasks) {
      if (task.done) done++;
      hours += task.hours;
    }
    return [`${done}/${tasks.length} done, ${hours}h total`];
  },
};

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const lines: string[] = [];

  for (const section of opts.sections) {
    const render = renderers[section];
    if (!render) throw new Error(`no renderer for section: ${section}`);
    lines.push(...render(input, opts.separator, opts.bullet));
  }

  return lines.join("\n");
}
