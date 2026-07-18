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

interface RenderContext {
  readonly input: ReportInput;
  readonly separator: string;
  readonly bullet: string;
  readonly theme: Theme;
  readonly messages: Record<string, string>;
}

const SECTION_RENDERERS: Record<string, (context: RenderContext) => string[]> = {
  header(context) {
    const { title } = context.input;
    return [title, context.separator.repeat(title.length)];
  },

  tasks(context) {
    return context.input.tasks.map((task) => {
      const marker = task.done ? context.theme.doneMarker : context.theme.openMarker;
      return `${context.bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
    });
  },

  summary(context) {
    const doneCount = context.input.tasks.filter((task) => task.done).length;
    const openCount = context.input.tasks.length - doneCount;
    const totalHours = context.input.tasks.reduce((sum, task) => sum + task.hours, 0);
    return [
      `${context.messages.doneLabel}: ${doneCount}`,
      `${context.messages.openLabel}: ${openCount}`,
      `${context.messages.hoursLabel}: ${formatHours(totalHours)}`,
    ];
  },

  footer(context) {
    const doneCount = context.input.tasks.filter((task) => task.done).length;
    const totalHours = context.input.tasks.reduce((sum, task) => sum + task.hours, 0);
    return [
      `${doneCount}/${context.input.tasks.length} ${context.messages.done}, ` +
        `${formatHours(totalHours)} ${context.messages.total}`,
    ];
  },
};

function renderSection(section: string, context: RenderContext): string[] {
  const renderer = SECTION_RENDERERS[section];
  if (!renderer) {
    throw new Error(`no renderer for section: ${section}`);
  }
  return renderer(context);
}

const DEFAULT_SECTIONS = ["header", "tasks", "footer"];

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const context: RenderContext = {
    input,
    separator: options?.separator ?? "=",
    bullet: options?.bullet ?? "-",
    theme: resolveTheme(options?.theme ?? "default"),
    messages: resolveMessages(options?.locale ?? "en"),
  };
  const sections = options?.sections ?? DEFAULT_SECTIONS;
  return sections.flatMap((section) => renderSection(section, context)).join("\n");
}
