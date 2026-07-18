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

function message(locale: string, key: string): string {
  const value = MESSAGES[locale]?.[key];
  if (value === undefined) {
    throw new Error(
      MESSAGES[locale] ? `no message for key: ${key}` : `no messages for locale: ${locale}`,
    );
  }
  return value;
}

const formatHours = (hours: number): string => `${hours}h`;

type RenderContext = {
  input: ReportInput;
  separator: string;
  bullet: string;
  theme: { doneMarker: string; openMarker: string };
  locale: string;
};

function taskCounts({ input }: RenderContext) {
  const done = input.tasks.filter((t) => t.done).length;
  const hours = input.tasks.reduce((sum, t) => sum + t.hours, 0);
  return { done, open: input.tasks.length - done, hours, total: input.tasks.length };
}

const SECTION_RENDERERS: Record<string, (context: RenderContext) => string[]> = {
  header: ({ input, separator }) => [input.title, separator.repeat(input.title.length)],

  tasks: ({ input, bullet, theme }) =>
    input.tasks.map((task) => {
      const marker = task.done ? theme.doneMarker : theme.openMarker;
      return `${bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
    }),

  summary: (ctx) => {
    const { done, open, hours } = taskCounts(ctx);
    return [
      `${message(ctx.locale, "doneLabel")}: ${done}`,
      `${message(ctx.locale, "openLabel")}: ${open}`,
      `${message(ctx.locale, "hoursLabel")}: ${formatHours(hours)}`,
    ];
  },

  footer: (ctx) => {
    const { done, hours, total } = taskCounts(ctx);
    return [
      `${done}/${total} ${message(ctx.locale, "done")}, ${formatHours(hours)} ${message(ctx.locale, "total")}`,
    ];
  },
};

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_REPORT_OPTIONS, ...(options ?? {}) };
  const theme = THEMES[opts.theme];
  if (!theme) {
    throw new Error(`no theme registered under: ${opts.theme}`);
  }
  const context: RenderContext = {
    input,
    separator: opts.separator,
    bullet: opts.bullet,
    theme,
    locale: opts.locale,
  };
  const lines = opts.sections.flatMap((section) => {
    const renderer = SECTION_RENDERERS[section];
    if (!renderer) {
      throw new Error(`no renderer for section: ${section}`);
    }
    return renderer(context);
  });
  return lines.join("\n");
}
