/**
 * Task report module.
 *
 * Formats a list of tasks into a plain-text report: a title header, one line
 * per task, an optional summary section, and a footer with totals. The public
 * surface is `formatReport` and the option/type exports; everything else is
 * internal machinery.
 */

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
  /** Only the "default" theme is registered. */
  theme?: string;
  /** Only "en" messages are provided. */
  locale?: string;
  /** Only plain text output is implemented; the enum anticipates markdown. */
  outputFormat?: "text";
}

const MESSAGES: Record<string, Record<string, string>> = {
  en: {
    done: "done",
    total: "total",
    doneLabel: "Done",
    openLabel: "Open",
    hoursLabel: "Hours",
  },
};

function getMessage(locale: string, key: string): string {
  const table = MESSAGES[locale];
  if (!table) throw new Error(`no messages for locale: ${locale}`);
  const value = table[key];
  if (value === undefined) throw new Error(`no message for key: ${key}`);
  return value;
}

function formatHours(hours: number): string {
  return `${hours}h`;
}

interface RenderContext {
  readonly input: ReportInput;
  readonly separator: string;
  readonly bullet: string;
  readonly locale: string;
}

function renderHeader({ input, separator }: RenderContext): string[] {
  return [input.title, separator.repeat(input.title.length)];
}

function renderTasks({ input, bullet }: RenderContext): string[] {
  return input.tasks.map((task) => {
    const marker = task.done ? "[x]" : "[ ]";
    return `${bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
  });
}

function countTasks(tasks: Task[]): { done: number; hours: number } {
  let done = 0;
  let hours = 0;
  for (const task of tasks) {
    if (task.done) done++;
    hours += task.hours;
  }
  return { done, hours };
}

function renderSummary(context: RenderContext): string[] {
  const { tasks } = context.input;
  const { done, hours } = countTasks(tasks);
  return [
    `${getMessage(context.locale, "doneLabel")}: ${done}`,
    `${getMessage(context.locale, "openLabel")}: ${tasks.length - done}`,
    `${getMessage(context.locale, "hoursLabel")}: ${formatHours(hours)}`,
  ];
}

function renderFooter(context: RenderContext): string[] {
  const { tasks } = context.input;
  const { done, hours } = countTasks(tasks);
  const doneWord = getMessage(context.locale, "done");
  const totalWord = getMessage(context.locale, "total");
  return [`${done}/${tasks.length} ${doneWord}, ${formatHours(hours)} ${totalWord}`];
}

const SECTION_RENDERERS: Record<string, (context: RenderContext) => string[]> = {
  header: renderHeader,
  tasks: renderTasks,
  summary: renderSummary,
  footer: renderFooter,
};

const DEFAULT_REPORT_OPTIONS: Required<ReportOptions> = {
  separator: "=",
  bullet: "-",
  sections: ["header", "tasks", "footer"],
  theme: "default",
  locale: "en",
  outputFormat: "text",
};

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_REPORT_OPTIONS, ...(options ?? {}) };

  if (opts.theme !== "default") {
    throw new Error(`no theme registered under: ${opts.theme}`);
  }

  const context: RenderContext = {
    input,
    separator: opts.separator,
    bullet: opts.bullet,
    locale: opts.locale,
  };

  const lines: string[] = [];
  for (const section of opts.sections) {
    const renderer = SECTION_RENDERERS[section];
    if (!renderer) throw new Error(`no renderer for section: ${section}`);
    lines.push(...renderer(context));
  }
  return lines.join("\n");
}
