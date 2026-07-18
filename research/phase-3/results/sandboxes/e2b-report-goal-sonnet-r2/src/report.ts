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

interface Theme {
  readonly doneMarker: string;
  readonly openMarker: string;
}

const THEMES: Record<string, Theme> = {
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

function resolveTheme(name: string): Theme {
  const theme = THEMES[name];
  if (!theme) {
    throw new Error(`no theme registered under: ${name}`);
  }
  return theme;
}

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

interface RenderContext {
  readonly input: ReportInput;
  readonly separator: string;
  readonly bullet: string;
  readonly theme: Theme;
  readonly locale: string;
}

const SECTION_RENDERERS: Record<string, (context: RenderContext) => string[]> = {
  header: ({ input, separator }) => [input.title, separator.repeat(input.title.length)],

  tasks: ({ input, bullet, theme }) =>
    input.tasks.map((task) => {
      const marker = task.done ? theme.doneMarker : theme.openMarker;
      return `${bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
    }),

  summary: ({ input, locale }) => {
    const doneCount = input.tasks.filter((task) => task.done).length;
    const totalHours = input.tasks.reduce((sum, task) => sum + task.hours, 0);
    return [
      `${message(locale, "doneLabel")}: ${doneCount}`,
      `${message(locale, "openLabel")}: ${input.tasks.length - doneCount}`,
      `${message(locale, "hoursLabel")}: ${formatHours(totalHours)}`,
    ];
  },

  footer: ({ input, locale }) => {
    const doneCount = input.tasks.filter((task) => task.done).length;
    const totalHours = input.tasks.reduce((sum, task) => sum + task.hours, 0);
    const doneWord = message(locale, "done");
    const totalWord = message(locale, "total");
    return [`${doneCount}/${input.tasks.length} ${doneWord}, ${formatHours(totalHours)} ${totalWord}`];
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
  const context: RenderContext = {
    input,
    separator: opts.separator,
    bullet: opts.bullet,
    theme: resolveTheme(opts.theme),
    locale: opts.locale,
  };
  const lines = opts.sections.flatMap((section) => {
    const render = SECTION_RENDERERS[section];
    if (!render) {
      throw new Error(`no renderer for section: ${section}`);
    }
    return render(context);
  });
  return lines.join("\n");
}
