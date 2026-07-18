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
  en: {
    done: "done",
    total: "total",
    doneLabel: "Done",
    openLabel: "Open",
    hoursLabel: "Hours",
  },
};

const THEMES = {
  default: {
    separator: "=",
    bullet: "-",
    doneMarker: "[x]",
    openMarker: "[ ]",
  },
};

const DEFAULT_OPTIONS: Required<ReportOptions> = {
  separator: "=",
  bullet: "-",
  sections: ["header", "tasks", "footer"],
  theme: "default",
  locale: "en",
  outputFormat: "text",
};

function summarizeTasks(tasks: Task[]) {
  let doneCount = 0, openCount = 0, totalHours = 0;
  for (const task of tasks) {
    if (task.done) doneCount += 1;
    else openCount += 1;
    totalHours += task.hours;
  }
  return { doneCount, openCount, totalHours };
}

function renderHeader(input: ReportInput, sep: string): string[] {
  return [input.title, sep.repeat(input.title.length)];
}

function renderTasks(input: ReportInput, bullet: string, doneMarker: string, openMarker: string): string[] {
  return input.tasks.map((task) => {
    const marker = task.done ? doneMarker : openMarker;
    return `${bullet} ${marker} ${task.title} (${task.hours}h)`;
  });
}

function renderSummary(input: ReportInput, messages: typeof MESSAGES.en): string[] {
  const { doneCount, openCount, totalHours } = summarizeTasks(input.tasks);
  return [
    `${messages.doneLabel}: ${doneCount}`,
    `${messages.openLabel}: ${openCount}`,
    `${messages.hoursLabel}: ${totalHours}h`,
  ];
}

function renderFooter(input: ReportInput, messages: typeof MESSAGES.en): string[] {
  const { doneCount, totalHours } = summarizeTasks(input.tasks);
  return [`${doneCount}/${input.tasks.length} ${messages.done}, ${totalHours}h ${messages.total}`];
}

const renderers: Record<string, (...args: any[]) => string[]> = {
  header: renderHeader,
  tasks: renderTasks,
  summary: renderSummary,
  footer: renderFooter,
};

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const theme = THEMES[opts.theme as keyof typeof THEMES];
  if (!theme) throw new Error(`no theme registered under: ${opts.theme}`);

  const messages = MESSAGES[opts.locale as keyof typeof MESSAGES];
  if (!messages) throw new Error(`no messages for locale: ${opts.locale}`);

  const lines: string[] = [];
  for (const section of opts.sections) {
    const render = renderers[section];
    if (!render) throw new Error(`no renderer for section: ${section}`);

    if (section === "header") {
      lines.push(...render(input, opts.separator));
    } else if (section === "tasks") {
      lines.push(...render(input, opts.bullet, theme.doneMarker, theme.openMarker));
    } else if (section === "summary" || section === "footer") {
      lines.push(...render(input, messages));
    }
  }

  return lines.join("\n");
}
