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

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const THEMES = {
  default: {
    separator: "=",
    bullet: "-",
    doneMarker: "[x]",
    openMarker: "[ ]",
  },
};

const MESSAGES = {
  en: {
    done: "done",
    total: "total",
    doneLabel: "Done",
    openLabel: "Open",
    hoursLabel: "Hours",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTheme(name: string) {
  const theme = THEMES[name as keyof typeof THEMES];
  if (!theme) throw new Error(`no theme registered under: ${name}`);
  return theme;
}

function getMessage(locale: string, key: string): string {
  const table = MESSAGES[locale as keyof typeof MESSAGES];
  if (!table) throw new Error(`no messages for locale: ${locale}`);
  const value = table[key as keyof typeof table];
  if (value === undefined) throw new Error(`no message for key: ${key}`);
  return value;
}

function taskStats(tasks: Task[]): {
  done: number;
  open: number;
  hours: number;
} {
  const done = tasks.filter((t) => t.done).length;
  return {
    done,
    open: tasks.length - done,
    hours: tasks.reduce((sum, t) => sum + t.hours, 0),
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

interface Options {
  separator: string;
  bullet: string;
  theme: ReturnType<typeof getTheme>;
  locale: string;
}

function renderHeader(input: ReportInput, opts: Options): string[] {
  const underline = opts.separator.repeat(input.title.length);
  return [input.title, underline];
}

function renderTasks(input: ReportInput, opts: Options): string[] {
  return input.tasks.map((task) => {
    const marker = task.done ? opts.theme.doneMarker : opts.theme.openMarker;
    return `${opts.bullet} ${marker} ${task.title} (${task.hours}h)`;
  });
}

function renderSummary(input: ReportInput, opts: Options): string[] {
  const { done, open, hours } = taskStats(input.tasks);
  return [
    `${getMessage(opts.locale, "doneLabel")}: ${done}`,
    `${getMessage(opts.locale, "openLabel")}: ${open}`,
    `${getMessage(opts.locale, "hoursLabel")}: ${hours}h`,
  ];
}

function renderFooter(input: ReportInput, opts: Options): string[] {
  const { done, hours } = taskStats(input.tasks);
  const doneWord = getMessage(opts.locale, "done");
  const totalWord = getMessage(opts.locale, "total");
  return [`${done}/${input.tasks.length} ${doneWord}, ${hours}h ${totalWord}`];
}

const RENDERERS = {
  header: renderHeader,
  tasks: renderTasks,
  summary: renderSummary,
  footer: renderFooter,
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ReportOptions {
  separator?: string;
  bullet?: string;
  sections?: string[];
  theme?: string;
  locale?: string;
  outputFormat?: "text";
}

const DEFAULTS = {
  separator: "=",
  bullet: "-",
  sections: ["header", "tasks", "footer"],
  theme: "default",
  locale: "en",
} as const;

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULTS, ...(options ?? {}) };
  const renderOpts = {
    separator: opts.separator,
    bullet: opts.bullet,
    theme: getTheme(opts.theme),
    locale: opts.locale,
  };

  const lines: string[] = [];
  for (const section of opts.sections) {
    const renderer = RENDERERS[section as keyof typeof RENDERERS];
    if (!renderer) throw new Error(`no renderer for section: ${section}`);
    lines.push(...renderer(input, renderOpts));
  }
  return lines.join("\n");
}
