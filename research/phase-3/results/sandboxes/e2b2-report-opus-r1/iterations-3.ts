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
  en: { done: "done", total: "total", doneLabel: "Done", openLabel: "Open", hoursLabel: "Hours" },
};

const formatHours = (n: number) => `${n}h`;

function tally(tasks: Task[]) {
  const doneCount = tasks.filter((t) => t.done).length;
  const totalHours = tasks.reduce((sum, t) => sum + t.hours, 0);
  return { doneCount, openCount: tasks.length - doneCount, totalHours };
}

// Shared "find or throw" helper behind every `no <what>: <key>` error.
function lookup<T>(table: Record<string, T>, key: string, what: string): T {
  const value = table[key];
  if (value === undefined) throw new Error(`no ${what}: ${key}`);
  return value;
}

type Ctx = {
  input: ReportInput;
  separator: string;
  bullet: string;
  theme: { doneMarker: string; openMarker: string };
  msg: (key: string) => string;
};

// One renderer per section name in `sections`; each returns the lines for that section.
const SECTION_RENDERERS: Record<string, (ctx: Ctx) => string[]> = {
  header: ({ input, separator }) => [input.title, separator.repeat(input.title.length)],
  tasks: ({ input, bullet, theme }) =>
    input.tasks.map((t) => `${bullet} ${t.done ? theme.doneMarker : theme.openMarker} ${t.title} (${formatHours(t.hours)})`),
  summary: ({ input, msg }) => {
    const { doneCount, openCount, totalHours } = tally(input.tasks);
    return [
      `${msg("doneLabel")}: ${doneCount}`,
      `${msg("openLabel")}: ${openCount}`,
      `${msg("hoursLabel")}: ${formatHours(totalHours)}`,
    ];
  },
  footer: ({ input, msg }) => {
    const { doneCount, totalHours } = tally(input.tasks);
    return [`${doneCount}/${input.tasks.length} ${msg("done")}, ${formatHours(totalHours)} ${msg("total")}`];
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
  const opts = { ...DEFAULT_REPORT_OPTIONS, ...options };
  const theme = lookup(THEMES, opts.theme, "theme registered under");
  const table = lookup(MESSAGES, opts.locale, "messages for locale");
  const msg = (key: string) => lookup(table, key, "message for key");
  const ctx: Ctx = { input, separator: opts.separator, bullet: opts.bullet, theme, msg };

  return opts.sections
    .flatMap((section) => lookup(SECTION_RENDERERS, section, "renderer for section")(ctx))
    .join("\n");
}
