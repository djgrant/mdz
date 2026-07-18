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

const DEFAULT_OPTIONS: Required<ReportOptions> = {
  separator: "=",
  bullet: "-",
  sections: ["header", "tasks", "footer"],
  theme: "default",
  locale: "en",
  outputFormat: "text",
};

const MARKERS = {
  done: "[x]",
  open: "[ ]",
};

const MESSAGES = {
  done: "done",
  total: "total",
  doneLabel: "Done",
  openLabel: "Open",
  hoursLabel: "Hours",
};

const formatHours = (hours: number): string => `${hours}h`;

function getTaskStats(tasks: Task[]) {
  const doneCount = tasks.filter((t) => t.done).length;
  const totalHours = tasks.reduce((sum, t) => sum + t.hours, 0);
  return { doneCount, totalHours };
}

interface Context {
  readonly input: ReportInput;
  readonly separator: string;
  readonly bullet: string;
}

const renderers: Record<string, (context: Context) => string[]> = {
  header: (context) => {
    const title = context.input.title;
    return [title, context.separator.repeat(title.length)];
  },

  tasks: (context) =>
    context.input.tasks.map((task) => {
      const marker = task.done ? MARKERS.done : MARKERS.open;
      return `${context.bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
    }),

  summary: (context) => {
    const { doneCount, totalHours } = getTaskStats(context.input.tasks);
    const open = context.input.tasks.length - doneCount;
    return [
      `${MESSAGES.doneLabel}: ${doneCount}`,
      `${MESSAGES.openLabel}: ${open}`,
      `${MESSAGES.hoursLabel}: ${formatHours(totalHours)}`,
    ];
  },

  footer: (context) => {
    const { doneCount, totalHours } = getTaskStats(context.input.tasks);
    const total = context.input.tasks.length;
    return [
      `${doneCount}/${total} ${MESSAGES.done}, ${formatHours(totalHours)} ${MESSAGES.total}`,
    ];
  },
};

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...(options ?? {}) };

  const context: Context = {
    input,
    separator: opts.separator,
    bullet: opts.bullet,
  };

  const lines: string[] = [];
  for (const section of opts.sections) {
    const renderer = renderers[section];
    if (!renderer) {
      throw new Error(`no renderer for section: ${section}`);
    }
    lines.push(...renderer(context));
  }

  return lines.join("\n");
}
