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

// ---------------------------------------------------------------------------
// Themes & messages
// ---------------------------------------------------------------------------

const THEMES: Record<string, { separator: string; bullet: string; doneMarker: string; openMarker: string }> = {
  default: { separator: "=", bullet: "-", doneMarker: "[x]", openMarker: "[ ]" },
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

function resolveTheme(name: string) {
  const theme = THEMES[name];
  if (!theme) throw new Error(`no theme registered under: ${name}`);
  return theme;
}

function resolveMessage(locale: string, key: string): string {
  const value = MESSAGES[locale]?.[key];
  if (value === undefined) throw new Error(`no message for key: ${key}`);
  return value;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

type Theme = ReturnType<typeof resolveTheme>;

interface RenderContext {
  readonly input: ReportInput;
  readonly separator: string;
  readonly bullet: string;
  readonly theme: Theme;
  readonly locale: string;
}

const formatHours = (hours: number): string => `${hours}h`;
const doneCountOf = (tasks: Task[]): number => tasks.filter((task) => task.done).length;
const totalHoursOf = (tasks: Task[]): number => tasks.reduce((sum, task) => sum + task.hours, 0);

const SECTION_RENDERERS: Record<string, (context: RenderContext) => string[]> = {
  header: ({ input, separator }) => [input.title, separator.repeat(input.title.length)],

  tasks: ({ input, bullet, theme }) =>
    input.tasks.map((task) => {
      const marker = task.done ? theme.doneMarker : theme.openMarker;
      return `${bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
    }),

  summary: ({ input, locale }) => [
    `${resolveMessage(locale, "doneLabel")}: ${doneCountOf(input.tasks)}`,
    `${resolveMessage(locale, "openLabel")}: ${input.tasks.length - doneCountOf(input.tasks)}`,
    `${resolveMessage(locale, "hoursLabel")}: ${formatHours(totalHoursOf(input.tasks))}`,
  ],

  footer: ({ input, locale }) => [
    `${doneCountOf(input.tasks)}/${input.tasks.length} ${resolveMessage(locale, "done")}, ` +
      `${formatHours(totalHoursOf(input.tasks))} ${resolveMessage(locale, "total")}`,
  ],
};

function renderSection(section: string, context: RenderContext): string[] {
  const renderer = SECTION_RENDERERS[section];
  if (!renderer) throw new Error(`no renderer for section: ${section}`);
  return renderer(context);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
  const context: RenderContext = {
    input,
    separator: opts.separator,
    bullet: opts.bullet,
    theme: resolveTheme(opts.theme),
    locale: opts.locale,
  };
  return opts.sections.flatMap((section) => renderSection(section, context)).join("\n");
}
