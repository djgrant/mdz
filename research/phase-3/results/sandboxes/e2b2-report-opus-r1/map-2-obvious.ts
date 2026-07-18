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

const THEMES: Record<string, { doneMarker: string; openMarker: string }> = {
  default: { doneMarker: "[x]", openMarker: "[ ]" },
};

const MESSAGES_BY_LOCALE: Record<string, Record<string, string>> = {
  en: {
    done: "done",
    total: "total",
    doneLabel: "Done",
    openLabel: "Open",
    hoursLabel: "Hours",
  },
};

function formatHours(n: number): string {
  return `${n}h`;
}

function countTasks(tasks: Task[]) {
  const doneCount = tasks.filter((task) => task.done).length;
  const openCount = tasks.length - doneCount;
  const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);
  return { doneCount, openCount, totalHours };
}

/** Everything a section renderer needs to produce its lines. */
interface RenderContext {
  input: ReportInput;
  separator: string;
  bullet: string;
  theme: { doneMarker: string; openMarker: string };
  translate: (key: string) => string;
}

function renderHeader({ input, separator }: RenderContext): string[] {
  return [input.title, separator.repeat(input.title.length)];
}

function renderTasks({ input, bullet, theme }: RenderContext): string[] {
  return input.tasks.map((task) => {
    const marker = task.done ? theme.doneMarker : theme.openMarker;
    return `${bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
  });
}

function renderSummary({ input, translate }: RenderContext): string[] {
  const { doneCount, openCount, totalHours } = countTasks(input.tasks);
  return [
    `${translate("doneLabel")}: ${doneCount}`,
    `${translate("openLabel")}: ${openCount}`,
    `${translate("hoursLabel")}: ${formatHours(totalHours)}`,
  ];
}

function renderFooter({ input, translate }: RenderContext): string[] {
  const { doneCount, totalHours } = countTasks(input.tasks);
  return [
    `${doneCount}/${input.tasks.length} ${translate("done")}, ${formatHours(totalHours)} ${translate("total")}`,
  ];
}

const SECTION_RENDERERS: Record<string, (ctx: RenderContext) => string[]> = {
  header: renderHeader,
  tasks: renderTasks,
  summary: renderSummary,
  footer: renderFooter,
};

function resolveTheme(name: string): { doneMarker: string; openMarker: string } {
  const theme = THEMES[name];
  if (!theme) {
    throw new Error(`no theme registered under: ${name}`);
  }
  return theme;
}

function resolveTranslator(locale: string): (key: string) => string {
  const messages = MESSAGES_BY_LOCALE[locale];
  if (!messages) {
    throw new Error(`no messages for locale: ${locale}`);
  }
  return (key: string) => {
    const value = messages[key];
    if (value === undefined) {
      throw new Error(`no message for key: ${key}`);
    }
    return value;
  };
}

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...(options ?? {}) };

  const context: RenderContext = {
    input,
    separator: opts.separator,
    bullet: opts.bullet,
    theme: resolveTheme(opts.theme),
    translate: resolveTranslator(opts.locale),
  };

  const lines: string[] = [];
  for (const section of opts.sections) {
    const render = SECTION_RENDERERS[section];
    if (!render) {
      throw new Error(`no renderer for section: ${section}`);
    }
    lines.push(...render(context));
  }
  return lines.join("\n");
}
