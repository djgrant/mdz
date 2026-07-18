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

// ---------------------------------------------------------------------------
// Themes: only "default" is registered today.
// ---------------------------------------------------------------------------

const THEMES: Record<string, { doneMarker: string; openMarker: string }> = {
  default: { doneMarker: "[x]", openMarker: "[ ]" },
};

function resolveTheme(name: string) {
  const theme = THEMES[name];
  if (!theme) {
    throw new Error(`no theme registered under: ${name}`);
  }
  return theme;
}

// ---------------------------------------------------------------------------
// Messages: only "en" is provided.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Section rendering
// ---------------------------------------------------------------------------

const formatHours = (hours: number): string => `${hours}h`;

type RenderContext = {
  input: ReportInput;
  separator: string;
  bullet: string;
  theme: { doneMarker: string; openMarker: string };
  locale: string;
};

function renderHeader({ input, separator }: RenderContext): string[] {
  return [input.title, separator.repeat(input.title.length)];
}

function renderTasks({ input, bullet, theme }: RenderContext): string[] {
  return input.tasks.map((task) => {
    const marker = task.done ? theme.doneMarker : theme.openMarker;
    return `${bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
  });
}

function renderSummary({ input, locale }: RenderContext): string[] {
  const doneCount = input.tasks.filter((t) => t.done).length;
  const openCount = input.tasks.length - doneCount;
  const totalHours = input.tasks.reduce((sum, t) => sum + t.hours, 0);
  return [
    `${message(locale, "doneLabel")}: ${doneCount}`,
    `${message(locale, "openLabel")}: ${openCount}`,
    `${message(locale, "hoursLabel")}: ${formatHours(totalHours)}`,
  ];
}

function renderFooter({ input, locale }: RenderContext): string[] {
  const doneCount = input.tasks.filter((t) => t.done).length;
  const totalHours = input.tasks.reduce((sum, t) => sum + t.hours, 0);
  const total = input.tasks.length;
  return [
    `${doneCount}/${total} ${message(locale, "done")}, ${formatHours(totalHours)} ${message(locale, "total")}`,
  ];
}

const SECTION_RENDERERS: Record<string, (context: RenderContext) => string[]> = {
  header: renderHeader,
  tasks: renderTasks,
  summary: renderSummary,
  footer: renderFooter,
};

function renderSection(section: string, context: RenderContext): string[] {
  const renderer = SECTION_RENDERERS[section];
  if (!renderer) {
    throw new Error(`no renderer for section: ${section}`);
  }
  return renderer(context);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_REPORT_OPTIONS, ...(options ?? {}) };
  const context: RenderContext = {
    input,
    separator: opts.separator,
    bullet: opts.bullet,
    theme: resolveTheme(opts.theme),
    locale: opts.locale,
  };
  const lines = opts.sections.flatMap((section) => renderSection(section, context));
  return lines.join("\n");
}
