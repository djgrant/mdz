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

/**
 * A theme bundles the characters used to draw the report. Only the default
 * theme ships today; the provider exists so branded reports can be added
 * without touching the renderers.
 */
interface Theme {
  readonly name: string;
  readonly separator: string;
  readonly bullet: string;
  readonly doneMarker: string;
  readonly openMarker: string;
}

class ThemeProvider {
  private readonly themes = new Map<string, Theme>();

  constructor() {
    this.themes.set("default", {
      name: "default",
      separator: "=",
      bullet: "-",
      doneMarker: "[x]",
      openMarker: "[ ]",
    });
  }

  resolve(name: string): Theme {
    const theme = this.themes.get(name);
    if (!theme) {
      throw new Error(`no theme registered under: ${name}`);
    }
    return theme;
  }
}

// ---------------------------------------------------------------------------
// Message catalogue
// ---------------------------------------------------------------------------

/**
 * Localisable message fragments. Only "en" is provided; the catalogue exists
 * so translated reports can be introduced without touching the renderers.
 */
const MESSAGES: Record<string, Record<string, string>> = {
  en: {
    done: "done",
    total: "total",
    doneLabel: "Done",
    openLabel: "Open",
    hoursLabel: "Hours",
  },
};

class MessageCatalogue {
  constructor(private readonly locale: string) {}

  message(key: string): string {
    const table = MESSAGES[this.locale];
    if (!table) {
      throw new Error(`no messages for locale: ${this.locale}`);
    }
    const value = table[key];
    if (value === undefined) {
      throw new Error(`no message for key: ${key}`);
    }
    return value;
  }
}

// ---------------------------------------------------------------------------
// Line buffer
// ---------------------------------------------------------------------------

class LineBuffer {
  private readonly lines: string[] = [];

  push(line: string): void {
    this.lines.push(line);
  }

  pushAll(lines: string[]): void {
    for (const line of lines) {
      this.lines.push(line);
    }
  }

  toLines(): string[] {
    return [...this.lines];
  }
}

// ---------------------------------------------------------------------------
// Rendering abstractions
// ---------------------------------------------------------------------------

interface RenderContext {
  readonly input: ReportInput;
  readonly separator: string;
  readonly bullet: string;
  readonly theme: Theme;
  readonly messages: MessageCatalogue;
}

interface SectionRenderer {
  readonly section: string;
  render(context: RenderContext): string[];
}

abstract class BaseSectionRenderer implements SectionRenderer {
  abstract readonly section: string;

  protected beforeRender(_context: RenderContext): void {
    // Hook for subclasses; intentionally empty.
  }

  protected afterRender(_context: RenderContext, lines: string[]): string[] {
    return lines;
  }

  render(context: RenderContext): string[] {
    this.beforeRender(context);
    const lines = this.renderLines(context);
    return this.afterRender(context, lines);
  }

  protected abstract renderLines(context: RenderContext): string[];
}

class HeaderRenderer extends BaseSectionRenderer {
  readonly section = "header";

  protected renderLines(context: RenderContext): string[] {
    const title = context.input.title;
    let underline = "";
    for (let i = 0; i < title.length; i++) {
      underline += context.separator;
    }
    return [title, underline];
  }
}

class TaskListRenderer extends BaseSectionRenderer {
  readonly section = "tasks";

  private formatHours(hours: number): string {
    return `${hours}h`;
  }

  protected renderLines(context: RenderContext): string[] {
    const lines: string[] = [];
    for (const task of context.input.tasks) {
      if (task.done) {
        const marker = context.theme.doneMarker;
        const hours = this.formatHours(task.hours);
        lines.push(`${context.bullet} ${marker} ${task.title} (${hours})`);
      } else {
        const marker = context.theme.openMarker;
        const hours = this.formatHours(task.hours);
        lines.push(`${context.bullet} ${marker} ${task.title} (${hours})`);
      }
    }
    return lines;
  }
}

class SummaryRenderer extends BaseSectionRenderer {
  readonly section = "summary";

  private formatHours(hours: number): string {
    return `${hours}h`;
  }

  protected renderLines(context: RenderContext): string[] {
    let doneCount = 0;
    let openCount = 0;
    let totalHours = 0;
    for (const task of context.input.tasks) {
      if (task.done) {
        doneCount += 1;
      } else {
        openCount += 1;
      }
      totalHours += task.hours;
    }
    return [
      `${context.messages.message("doneLabel")}: ${doneCount}`,
      `${context.messages.message("openLabel")}: ${openCount}`,
      `${context.messages.message("hoursLabel")}: ${this.formatHours(totalHours)}`,
    ];
  }
}

class FooterRenderer extends BaseSectionRenderer {
  readonly section = "footer";

  private formatHours(hours: number): string {
    return `${hours}h`;
  }

  protected renderLines(context: RenderContext): string[] {
    let doneCount = 0;
    let totalHours = 0;
    for (const task of context.input.tasks) {
      if (task.done) {
        doneCount += 1;
      }
      totalHours += task.hours;
    }
    const total = context.input.tasks.length;
    const doneWord = context.messages.message("done");
    const totalWord = context.messages.message("total");
    const hours = this.formatHours(totalHours);
    return [`${doneCount}/${total} ${doneWord}, ${hours} ${totalWord}`];
  }
}

// ---------------------------------------------------------------------------
// Renderer registry and factory
// ---------------------------------------------------------------------------

class RendererRegistry {
  private readonly renderers = new Map<string, SectionRenderer>();

  register(renderer: SectionRenderer): RendererRegistry {
    this.renderers.set(renderer.section, renderer);
    return this;
  }

  resolve(section: string): SectionRenderer {
    const renderer = this.renderers.get(section);
    if (!renderer) {
      throw new Error(`no renderer for section: ${section}`);
    }
    return renderer;
  }
}

class RendererFactory {
  static createRegistry(): RendererRegistry {
    return new RendererRegistry()
      .register(new HeaderRenderer())
      .register(new TaskListRenderer())
      .register(new SummaryRenderer())
      .register(new FooterRenderer());
  }
}

// ---------------------------------------------------------------------------
// Rendering engine
// ---------------------------------------------------------------------------

interface EngineHooks {
  beforeSection?(section: string): void;
  afterSection?(section: string, lines: string[]): void;
}

class RenderingEngine {
  constructor(
    private readonly registry: RendererRegistry,
    private readonly hooks: EngineHooks,
  ) {}

  renderSections(sections: string[], context: RenderContext): LineBuffer {
    const buffer = new LineBuffer();
    for (const section of sections) {
      if (this.hooks.beforeSection) {
        this.hooks.beforeSection(section);
      }
      const lines = this.registry.resolve(section).render(context);
      buffer.pushAll(lines);
      if (this.hooks.afterSection) {
        this.hooks.afterSection(section, lines);
      }
    }
    return buffer;
  }
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

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

class ReportBuilder {
  private readonly engine: RenderingEngine;
  private readonly themeProvider: ThemeProvider;
  private readonly options: Required<ReportOptions>;

  constructor(options?: ReportOptions) {
    this.engine = new RenderingEngine(RendererFactory.createRegistry(), {});
    this.themeProvider = new ThemeProvider();
    this.options = { ...DEFAULT_REPORT_OPTIONS, ...(options ?? {}) };
  }

  build(input: ReportInput): string {
    const context: RenderContext = {
      input,
      separator: this.options.separator,
      bullet: this.options.bullet,
      theme: this.themeProvider.resolve(this.options.theme),
      messages: new MessageCatalogue(this.options.locale),
    };
    const buffer = this.engine.renderSections(this.options.sections, context);
    return buffer.toLines().join("\n");
  }
}

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  return new ReportBuilder(options).build(input);
}
