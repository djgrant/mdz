/**
 * Task report module.
 *
 * Formats a list of tasks into a plain-text report: a title header, one line
 * per task, and a footer with totals.
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
// Rendering abstractions
// ---------------------------------------------------------------------------

interface RenderContext {
  readonly input: ReportInput;
  readonly separator: string;
  readonly bullet: string;
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
    const underline = context.separator.repeat(title.length);
    return [title, underline];
  }
}

class TaskListRenderer extends BaseSectionRenderer {
  readonly section = "tasks";

  protected renderLines(context: RenderContext): string[] {
    const lines: string[] = [];
    for (const task of context.input.tasks) {
      if (task.done) {
        const marker = "[x]";
        lines.push(`${context.bullet} ${marker} ${task.title} (${task.hours}h)`);
      } else {
        const marker = "[ ]";
        lines.push(`${context.bullet} ${marker} ${task.title} (${task.hours}h)`);
      }
    }
    return lines;
  }
}

class FooterRenderer extends BaseSectionRenderer {
  readonly section = "footer";

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
    return [`${doneCount}/${total} done, ${totalHours}h total`];
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
      .register(new FooterRenderer());
  }
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export interface ReportOptions {
  separator?: string;
  bullet?: string;
  sections?: string[];
}

const DEFAULT_REPORT_OPTIONS: Required<ReportOptions> = {
  separator: "=",
  bullet: "-",
  sections: ["header", "tasks", "footer"],
};

class ReportBuilder {
  private readonly registry: RendererRegistry;
  private readonly options: Required<ReportOptions>;

  constructor(options?: ReportOptions) {
    this.registry = RendererFactory.createRegistry();
    this.options = { ...DEFAULT_REPORT_OPTIONS, ...(options ?? {}) };
  }

  build(input: ReportInput): string {
    const context: RenderContext = {
      input,
      separator: this.options.separator,
      bullet: this.options.bullet,
    };
    const lines: string[] = [];
    for (const section of this.options.sections) {
      for (const line of this.registry.resolve(section).render(context)) {
        lines.push(line);
      }
    }
    return lines.join("\n");
  }
}

export function formatReport(input: ReportInput): string {
  return new ReportBuilder().build(input);
}
