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

function resolveMessages(locale: string): Record<string, string> {
  const table = MESSAGES[locale];
  if (!table) {
    throw new Error(`no messages for locale: ${locale}`);
  }
  return table;
}

function formatHours(hours: number): string {
  return `${hours}h`;
}

function taskTotals(tasks: Task[]): { doneCount: number; openCount: number; totalHours: number } {
  let doneCount = 0;
  let totalHours = 0;
  for (const task of tasks) {
    if (task.done) doneCount += 1;
    totalHours += task.hours;
  }
  return { doneCount, openCount: tasks.length - doneCount, totalHours };
}

interface RenderContext {
  readonly input: ReportInput;
  readonly separator: string;
  readonly bullet: string;
  readonly theme: Theme;
  readonly messages: Record<string, string>;
}

const SECTION_RENDERERS: Record<string, (context: RenderContext) => string[]> = {
  header(context) {
    const title = context.input.title;
    return [title, context.separator.repeat(title.length)];
  },

  tasks(context) {
    return context.input.tasks.map((task) => {
      const marker = task.done ? context.theme.doneMarker : context.theme.openMarker;
      return `${context.bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
    });
  },

  summary(context) {
    const { doneCount, openCount, totalHours } = taskTotals(context.input.tasks);
    return [
      `${context.messages.doneLabel}: ${doneCount}`,
      `${context.messages.openLabel}: ${openCount}`,
      `${context.messages.hoursLabel}: ${formatHours(totalHours)}`,
    ];
  },

  footer(context) {
    const { doneCount, totalHours } = taskTotals(context.input.tasks);
    const total = context.input.tasks.length;
    return [
      `${doneCount}/${total} ${context.messages.done}, ${formatHours(totalHours)} ${context.messages.total}`,
    ];
  },
};

function renderSection(section: string, context: RenderContext): string[] {
  const render = SECTION_RENDERERS[section];
  if (!render) {
    throw new Error(`no renderer for section: ${section}`);
  }
  return render(context);
}

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_REPORT_OPTIONS, ...options };
  const context: RenderContext = {
    input,
    separator: opts.separator,
    bullet: opts.bullet,
    theme: resolveTheme(opts.theme),
    messages: resolveMessages(opts.locale),
  };
  return opts.sections.flatMap((section) => renderSection(section, context)).join("\n");
}
