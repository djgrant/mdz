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
  theme?: string;
  locale?: string;
  outputFormat?: "text";
}

const THEMES: Record<string, { doneMarker: string; openMarker: string }> = {
  default: { doneMarker: "[x]", openMarker: "[ ]" },
};

const MESSAGES: Record<string, Record<string, string>> = {
  en: { done: "done", total: "total", doneLabel: "Done", openLabel: "Open", hoursLabel: "Hours" },
};

function lookup<T>(table: Record<string, T>, key: string, what: string): T {
  const value = table[key];
  if (value === undefined) throw new Error(`no ${what}: ${key}`);
  return value;
}

const formatHours = (hours: number): string => `${hours}h`;

function summarize(tasks: Task[]) {
  const doneCount = tasks.filter((task) => task.done).length;
  const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);
  return { doneCount, openCount: tasks.length - doneCount, totalHours };
}

interface RenderContext {
  input: ReportInput;
  separator: string;
  bullet: string;
  theme: { doneMarker: string; openMarker: string };
  msg: (key: string) => string;
}

const SECTIONS: Record<string, (ctx: RenderContext) => string[]> = {
  header: ({ input, separator }) => [input.title, separator.repeat(input.title.length)],

  tasks: ({ input, theme, bullet }) =>
    input.tasks.map(
      (task) =>
        `${bullet} ${task.done ? theme.doneMarker : theme.openMarker} ${task.title} (${formatHours(task.hours)})`,
    ),

  summary: ({ input, msg }) => {
    const { doneCount, openCount, totalHours } = summarize(input.tasks);
    return [
      `${msg("doneLabel")}: ${doneCount}`,
      `${msg("openLabel")}: ${openCount}`,
      `${msg("hoursLabel")}: ${formatHours(totalHours)}`,
    ];
  },

  footer: ({ input, msg }) => {
    const { doneCount, totalHours } = summarize(input.tasks);
    return [
      `${doneCount}/${input.tasks.length} ${msg("done")}, ${formatHours(totalHours)} ${msg("total")}`,
    ];
  },
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
  const messages = lookup(MESSAGES, opts.locale, "messages for locale");
  const context: RenderContext = {
    input,
    separator: opts.separator,
    bullet: opts.bullet,
    theme: lookup(THEMES, opts.theme, "theme registered under"),
    msg: (key) => lookup(messages, key, "message for key"),
  };
  return opts.sections
    .flatMap((section) => lookup(SECTIONS, section, "renderer for section")(context))
    .join("\n");
}
