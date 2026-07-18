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
  theme?: string;
  locale?: string;
  outputFormat?: "text";
}

const MESSAGES = {
  en: {
    done: "done",
    total: "total",
    doneLabel: "Done",
    openLabel: "Open",
    hoursLabel: "Hours",
  },
};

const THEMES = {
  default: {
    separator: "=",
    bullet: "-",
    doneMarker: "[x]",
    openMarker: "[ ]",
  },
};

const DEFAULT_OPTIONS: Required<ReportOptions> = {
  separator: "=",
  bullet: "-",
  sections: ["header", "tasks", "footer"],
  theme: "default",
  locale: "en",
  outputFormat: "text",
};

interface RenderContext {
  readonly input: ReportInput;
  readonly separator: string;
  readonly bullet: string;
  readonly theme: typeof THEMES.default;
  readonly messages: typeof MESSAGES.en;
}

interface SectionRenderer {
  render(context: RenderContext): string[];
}

class HeaderRenderer implements SectionRenderer {
  render(context: RenderContext): string[] {
    const title = context.input.title;
    const underline = context.separator.repeat(title.length);
    return [title, underline];
  }
}

class TaskListRenderer implements SectionRenderer {
  render(context: RenderContext): string[] {
    return context.input.tasks.map((task) => {
      const marker = task.done ? context.theme.doneMarker : context.theme.openMarker;
      return `${context.bullet} ${marker} ${task.title} (${task.hours}h)`;
    });
  }
}

class SummaryRenderer implements SectionRenderer {
  render(context: RenderContext): string[] {
    let doneCount = 0;
    let openCount = 0;
    let totalHours = 0;
    for (const task of context.input.tasks) {
      if (task.done) doneCount += 1;
      else openCount += 1;
      totalHours += task.hours;
    }
    return [
      `${context.messages.doneLabel}: ${doneCount}`,
      `${context.messages.openLabel}: ${openCount}`,
      `${context.messages.hoursLabel}: ${totalHours}h`,
    ];
  }
}

class FooterRenderer implements SectionRenderer {
  render(context: RenderContext): string[] {
    let doneCount = 0;
    let totalHours = 0;
    for (const task of context.input.tasks) {
      if (task.done) doneCount += 1;
      totalHours += task.hours;
    }
    const total = context.input.tasks.length;
    const doneWord = context.messages.done;
    const totalWord = context.messages.total;
    return [`${doneCount}/${total} ${doneWord}, ${totalHours}h ${totalWord}`];
  }
}

const renderers = new Map<string, SectionRenderer>([
  ["header", new HeaderRenderer()],
  ["tasks", new TaskListRenderer()],
  ["summary", new SummaryRenderer()],
  ["footer", new FooterRenderer()],
]);

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const theme = THEMES[opts.theme as keyof typeof THEMES];
  if (!theme) throw new Error(`no theme registered under: ${opts.theme}`);

  const messages = MESSAGES[opts.locale as keyof typeof MESSAGES];
  if (!messages) throw new Error(`no messages for locale: ${opts.locale}`);

  const context: RenderContext = {
    input,
    separator: opts.separator,
    bullet: opts.bullet,
    theme,
    messages,
  };

  const lines: string[] = [];
  for (const section of opts.sections) {
    const renderer = renderers.get(section);
    if (!renderer) throw new Error(`no renderer for section: ${section}`);
    lines.push(...renderer.render(context));
  }

  return lines.join("\n");
}
