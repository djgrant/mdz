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

const THEMES: Record<string, { doneMarker: string; openMarker: string }> = {
  default: { doneMarker: "[x]", openMarker: "[ ]" },
};

const MESSAGES: Record<string, Record<string, string>> = {
  en: {
    done: "done",
    total: "total",
    doneLabel: "Done",
    openLabel: "Open",
    hoursLabel: "Hours",
  },
};

const hours = (n: number) => `${n}h`;

function tally(tasks: Task[]) {
  const doneCount = tasks.filter((task) => task.done).length;
  const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);
  return { doneCount, openCount: tasks.length - doneCount, totalHours };
}

/** Look up `key` in `record`, throwing `${label}: ${key}` if it's missing. */
function require<T>(record: Record<string, T>, key: string, label: string): T {
  const value = record[key];
  if (value === undefined) {
    throw new Error(`${label}: ${key}`);
  }
  return value;
}

type Ctx = {
  input: ReportInput;
  separator: string;
  bullet: string;
  theme: { doneMarker: string; openMarker: string };
  msg: (key: string) => string;
};

const SECTION_RENDERERS: Record<string, (ctx: Ctx) => string[]> = {
  header: ({ input, separator }) => [input.title, separator.repeat(input.title.length)],

  tasks: ({ input, bullet, theme }) =>
    input.tasks.map((task) => {
      const marker = task.done ? theme.doneMarker : theme.openMarker;
      return `${bullet} ${marker} ${task.title} (${hours(task.hours)})`;
    }),

  summary: ({ input, msg }) => {
    const { doneCount, openCount, totalHours } = tally(input.tasks);
    return [
      `${msg("doneLabel")}: ${doneCount}`,
      `${msg("openLabel")}: ${openCount}`,
      `${msg("hoursLabel")}: ${hours(totalHours)}`,
    ];
  },

  footer: ({ input, msg }) => {
    const { doneCount, totalHours } = tally(input.tasks);
    return [`${doneCount}/${input.tasks.length} ${msg("done")}, ${hours(totalHours)} ${msg("total")}`];
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

  const theme = require(THEMES, opts.theme, "no theme registered under");
  const table = require(MESSAGES, opts.locale, "no messages for locale");
  const msg = (key: string) => require(table, key, "no message for key");

  const ctx: Ctx = { input, separator: opts.separator, bullet: opts.bullet, theme, msg };

  const lines: string[] = [];
  for (const section of opts.sections) {
    const render = require(SECTION_RENDERERS, section, "no renderer for section");
    lines.push(...render(ctx));
  }
  return lines.join("\n");
}
