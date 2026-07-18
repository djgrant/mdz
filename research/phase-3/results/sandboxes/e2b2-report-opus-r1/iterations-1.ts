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
  let doneCount = 0;
  let totalHours = 0;
  for (const task of tasks) {
    if (task.done) doneCount += 1;
    totalHours += task.hours;
  }
  return { doneCount, openCount: tasks.length - doneCount, totalHours };
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

  const theme = THEMES[opts.theme];
  if (!theme) {
    throw new Error(`no theme registered under: ${opts.theme}`);
  }

  const table = MESSAGES[opts.locale];
  if (!table) {
    throw new Error(`no messages for locale: ${opts.locale}`);
  }
  const msg = (key: string) => {
    const value = table[key];
    if (value === undefined) {
      throw new Error(`no message for key: ${key}`);
    }
    return value;
  };

  const ctx: Ctx = { input, separator: opts.separator, bullet: opts.bullet, theme, msg };

  const lines: string[] = [];
  for (const section of opts.sections) {
    const render = SECTION_RENDERERS[section];
    if (!render) {
      throw new Error(`no renderer for section: ${section}`);
    }
    lines.push(...render(ctx));
  }
  return lines.join("\n");
}
