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
// Themes
// ---------------------------------------------------------------------------

interface Theme {
  readonly separator: string;
  readonly bullet: string;
  readonly doneMarker: string;
  readonly openMarker: string;
}

const THEMES: Record<string, Theme> = {
  default: {
    separator: "=",
    bullet: "-",
    doneMarker: "[x]",
    openMarker: "[ ]",
  },
};

function getTheme(name: string): Theme {
  const theme = THEMES[name];
  if (!theme) {
    throw new Error(`no theme registered under: ${name}`);
  }
  return theme;
}

// ---------------------------------------------------------------------------
// Messages
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

function getMessage(locale: string, key: string): string {
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
// Rendering helpers
// ---------------------------------------------------------------------------

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

interface SectionRenderer {
  readonly section: string;
  render(context: RenderContext): string[];
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

class HeaderRenderer implements SectionRenderer {
  readonly section = "header";

  render(context: RenderContext): string[] {
    const title = context.input.title;
    const underline = context.separator.repeat(title.length);
    return [title, underline];
  }
}

class TaskListRenderer implements SectionRenderer {
  readonly section = "tasks";

  render(context: RenderContext): string[] {
    return context.input.tasks.map((task) => {
      const marker = task.done ? context.theme.doneMarker : context.theme.openMarker;
      const hours = formatHours(task.hours);
      return `${context.bullet} ${marker} ${task.title} (${hours})`;
    });
  }
}

class SummaryRenderer implements SectionRenderer {
  readonly section = "summary";

  render(context: RenderContext): string[] {
    const tasks = context.input.tasks;
    const doneCount = tasks.filter((t) => t.done).length;
    const openCount = tasks.length - doneCount;
    const totalHours = tasks.reduce((sum, t) => sum + t.hours, 0);
    return [
      `${getMessage(context.locale, "doneLabel")}: ${doneCount}`,
      `${getMessage(context.locale, "openLabel")}: ${openCount}`,
      `${getMessage(context.locale, "hoursLabel")}: ${formatHours(totalHours)}`,
    ];
  }
}

class FooterRenderer implements SectionRenderer {
  readonly section = "footer";

  render(context: RenderContext): string[] {
    const tasks = context.input.tasks;
    const doneCount = tasks.filter((t) => t.done).length;
    const totalHours = tasks.reduce((sum, t) => sum + t.hours, 0);
    const doneWord = getMessage(context.locale, "done");
    const totalWord = getMessage(context.locale, "total");
    return [`${doneCount}/${tasks.length} ${doneWord}, ${formatHours(totalHours)} ${totalWord}`];
  }
}

// ---------------------------------------------------------------------------
// Renderer registry
// ---------------------------------------------------------------------------

class RendererRegistry {
  private readonly renderers: Map<string, SectionRenderer>;

  constructor() {
    this.renderers = new Map([
      [new HeaderRenderer().section, new HeaderRenderer()],
      [new TaskListRenderer().section, new TaskListRenderer()],
      [new SummaryRenderer().section, new SummaryRenderer()],
      [new FooterRenderer().section, new FooterRenderer()],
    ]);
  }

  resolve(section: string): SectionRenderer {
    const renderer = this.renderers.get(section);
    if (!renderer) {
      throw new Error(`no renderer for section: ${section}`);
    }
    return renderer;
  }
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export interface ReportOptions {
  separator?: string;
  bullet?: string;
  sections?: string[];
  theme?: string;
  locale?: string;
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

class ReportBuilder {
  private readonly registry: RendererRegistry;
  private readonly options: Required<ReportOptions>;

  constructor(options?: ReportOptions) {
    this.registry = new RendererRegistry();
    this.options = { ...DEFAULT_REPORT_OPTIONS, ...(options ?? {}) };
  }

  build(input: ReportInput): string {
    const context: RenderContext = {
      input,
      separator: this.options.separator,
      bullet: this.options.bullet,
      theme: getTheme(this.options.theme),
      locale: this.options.locale,
    };
    const lines: string[] = [];
    for (const section of this.options.sections) {
      const sectionLines = this.registry.resolve(section).render(context);
      lines.push(...sectionLines);
    }
    return lines.join("\n");
  }
}

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  return new ReportBuilder(options).build(input);
}
