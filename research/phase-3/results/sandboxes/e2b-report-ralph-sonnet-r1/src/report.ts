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

const DEFAULT_REPORT_OPTIONS: Required<ReportOptions> = {
  separator: "=",
  bullet: "-",
  sections: ["header", "tasks", "footer"],
  theme: "default",
  locale: "en",
  outputFormat: "text",
};

function hours(n: number): string {
  return `${n}h`;
}

function totals(tasks: Task[]) {
  let doneCount = 0;
  let totalHours = 0;
  for (const task of tasks) {
    if (task.done) doneCount += 1;
    totalHours += task.hours;
  }
  return { doneCount, openCount: tasks.length - doneCount, totalHours };
}

const RENDERERS: Record<string, (input: ReportInput, opts: Required<ReportOptions>) => string[]> = {
  header(input, opts) {
    return [input.title, opts.separator.repeat(input.title.length)];
  },

  tasks(input, opts) {
    return input.tasks.map((task) => {
      const marker = task.done ? "[x]" : "[ ]";
      return `${opts.bullet} ${marker} ${task.title} (${hours(task.hours)})`;
    });
  },

  summary(input) {
    const { doneCount, openCount, totalHours } = totals(input.tasks);
    return [`Done: ${doneCount}`, `Open: ${openCount}`, `Hours: ${hours(totalHours)}`];
  },

  footer(input) {
    const { doneCount, totalHours } = totals(input.tasks);
    return [`${doneCount}/${input.tasks.length} done, ${hours(totalHours)} total`];
  },
};

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_REPORT_OPTIONS, ...options };

  if (opts.theme !== "default") throw new Error(`no theme registered under: ${opts.theme}`);
  if (opts.locale !== "en") throw new Error(`no messages for locale: ${opts.locale}`);

  const lines: string[] = [];
  for (const section of opts.sections) {
    const renderer = RENDERERS[section];
    if (!renderer) throw new Error(`no renderer for section: ${section}`);
    lines.push(...renderer(input, opts));
  }
  return lines.join("\n");
}
