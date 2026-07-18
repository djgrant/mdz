/**
 * Task report module.
 *
 * Formats a list of tasks into a plain-text report: a title header, one line
 * per task, and a footer with totals. The public surface is `formatReport`
 * and the option/type exports; everything else is internal machinery.
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

const DONE_MARKER = "[x]";
const OPEN_MARKER = "[ ]";

const MESSAGES: Record<string, Record<string, string>> = {
  en: {
    done: "done",
    total: "total",
    doneLabel: "Done",
    openLabel: "Open",
    hoursLabel: "Hours",
  },
};

function message(locale: string, key: string): string {
  const table = MESSAGES[locale];
  if (!table) {
    throw new Error(`no messages for locale: ${locale}`);
  }
  const value = table[key];
  if (value === undefined) {
    throw new Error(`no message for key: ${key}`);
  }
  return value;
}

function formatHours(hours: number): string {
  return `${hours}h`;
}

function renderHeader(title: string, separator: string): string[] {
  return [title, separator.repeat(title.length)];
}

function renderTasks(tasks: Task[], bullet: string): string[] {
  return tasks.map((task) => {
    const marker = task.done ? DONE_MARKER : OPEN_MARKER;
    return `${bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
  });
}

function renderSummary(tasks: Task[], locale: string): string[] {
  const doneCount = tasks.filter((task) => task.done).length;
  const openCount = tasks.length - doneCount;
  const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);
  return [
    `${message(locale, "doneLabel")}: ${doneCount}`,
    `${message(locale, "openLabel")}: ${openCount}`,
    `${message(locale, "hoursLabel")}: ${formatHours(totalHours)}`,
  ];
}

function renderFooter(tasks: Task[], locale: string): string[] {
  const doneCount = tasks.filter((task) => task.done).length;
  const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);
  const doneWord = message(locale, "done");
  const totalWord = message(locale, "total");
  return [`${doneCount}/${tasks.length} ${doneWord}, ${formatHours(totalHours)} ${totalWord}`];
}

const SECTION_RENDERERS: Record<
  string,
  (input: ReportInput, separator: string, bullet: string, locale: string) => string[]
> = {
  header: (input, separator) => renderHeader(input.title, separator),
  tasks: (input, _separator, bullet) => renderTasks(input.tasks, bullet),
  summary: (input, _separator, _bullet, locale) => renderSummary(input.tasks, locale),
  footer: (input, _separator, _bullet, locale) => renderFooter(input.tasks, locale),
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

  // Only the "default" theme is registered; anything else is an error.
  if (opts.theme !== "default") {
    throw new Error(`no theme registered under: ${opts.theme}`);
  }

  const lines: string[] = [];
  for (const section of opts.sections) {
    const render = SECTION_RENDERERS[section];
    if (!render) {
      throw new Error(`no renderer for section: ${section}`);
    }
    lines.push(...render(input, opts.separator, opts.bullet, opts.locale));
  }
  return lines.join("\n");
}
