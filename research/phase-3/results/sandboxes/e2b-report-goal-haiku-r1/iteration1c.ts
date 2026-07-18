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
  en: { done: "done", total: "total", doneLabel: "Done", openLabel: "Open", hoursLabel: "Hours" },
};

const THEMES = {
  default: { separator: "=", bullet: "-", doneMarker: "[x]", openMarker: "[ ]" },
};

const DEFAULT_OPTIONS: Required<ReportOptions> = {
  separator: "=",
  bullet: "-",
  sections: ["header", "tasks", "footer"],
  theme: "default",
  locale: "en",
  outputFormat: "text",
};

type RenderFn = (input: ReportInput, separator: string, bullet: string) => string[];

const renderSections: Record<string, RenderFn> = {
  header: (input, sep) => [input.title, sep.repeat(input.title.length)],

  tasks: (input, _sep, bullet) => {
    const doneMarker = THEMES.default.doneMarker;
    const openMarker = THEMES.default.openMarker;
    return input.tasks.map((task) => {
      const marker = task.done ? doneMarker : openMarker;
      return `${bullet} ${marker} ${task.title} (${task.hours}h)`;
    });
  },

  summary: (input) => {
    let done = 0, open = 0, hours = 0;
    for (const task of input.tasks) {
      (task.done ? done : open)++;
      hours += task.hours;
    }
    const m = MESSAGES.en;
    return [`${m.doneLabel}: ${done}`, `${m.openLabel}: ${open}`, `${m.hoursLabel}: ${hours}h`];
  },

  footer: (input) => {
    let done = 0, hours = 0;
    for (const task of input.tasks) {
      if (task.done) done++;
      hours += task.hours;
    }
    const m = MESSAGES.en;
    return [`${done}/${input.tasks.length} ${m.done}, ${hours}h ${m.total}`];
  },
};

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const lines: string[] = [];

  for (const section of opts.sections) {
    const render = renderSections[section];
    if (!render) throw new Error(`no renderer for section: ${section}`);
    lines.push(...render(input, opts.separator, opts.bullet));
  }

  return lines.join("\n");
}
