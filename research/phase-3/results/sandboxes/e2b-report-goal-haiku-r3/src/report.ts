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

interface Theme {
  readonly separator: string;
  readonly bullet: string;
  readonly doneMarker: string;
  readonly openMarker: string;
}

const DEFAULT_THEME: Theme = {
  separator: "=",
  bullet: "-",
  doneMarker: "[x]",
  openMarker: "[ ]",
};

const DEFAULT_MESSAGES = {
  done: "done",
  total: "total",
  doneLabel: "Done",
  openLabel: "Open",
  hoursLabel: "Hours",
};

interface RenderContext {
  readonly input: ReportInput;
  readonly theme: Theme;
  readonly messages: typeof DEFAULT_MESSAGES;
}

interface SectionRenderer {
  readonly section: string;
  render(context: RenderContext): string[];
}

class HeaderRenderer implements SectionRenderer {
  readonly section = "header";

  render(context: RenderContext): string[] {
    const title = context.input.title;
    const underline = context.theme.separator.repeat(title.length);
    return [title, underline];
  }
}

class TaskListRenderer implements SectionRenderer {
  readonly section = "tasks";

  render(context: RenderContext): string[] {
    return context.input.tasks.map((task) => {
      const marker = task.done ? context.theme.doneMarker : context.theme.openMarker;
      return `${context.theme.bullet} ${marker} ${task.title} (${task.hours}h)`;
    });
  }
}

function countTasks(tasks: Task[]): { done: number; open: number; hours: number } {
  let done = 0;
  let open = 0;
  let hours = 0;

  for (const task of tasks) {
    if (task.done) done++;
    else open++;
    hours += task.hours;
  }

  return { done, open, hours };
}

function countDoneTasks(tasks: Task[]): { done: number; hours: number } {
  let done = 0;
  let hours = 0;

  for (const task of tasks) {
    if (task.done) done++;
    hours += task.hours;
  }

  return { done, hours };
}

class SummaryRenderer implements SectionRenderer {
  readonly section = "summary";

  render(context: RenderContext): string[] {
    const { done, open, hours } = countTasks(context.input.tasks);
    const { doneLabel, openLabel, hoursLabel } = context.messages;
    return [
      `${doneLabel}: ${done}`,
      `${openLabel}: ${open}`,
      `${hoursLabel}: ${hours}h`,
    ];
  }
}

class FooterRenderer implements SectionRenderer {
  readonly section = "footer";

  render(context: RenderContext): string[] {
    const { done, hours } = countDoneTasks(context.input.tasks);
    const { done: doneWord, total: totalWord } = context.messages;
    return [`${done}/${context.input.tasks.length} ${doneWord}, ${hours}h ${totalWord}`];
  }
}

const renderers = new Map<string, SectionRenderer>([
  ["header", new HeaderRenderer()],
  ["tasks", new TaskListRenderer()],
  ["summary", new SummaryRenderer()],
  ["footer", new FooterRenderer()],
]);

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

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_REPORT_OPTIONS, ...(options ?? {}) };

  if (opts.theme !== "default") throw new Error(`no theme registered under: ${opts.theme}`);
  if (opts.locale !== "en") throw new Error(`no messages for locale: ${opts.locale}`);

  const context: RenderContext = {
    input,
    theme: {
      ...DEFAULT_THEME,
      separator: opts.separator,
      bullet: opts.bullet,
    },
    messages: DEFAULT_MESSAGES,
  };

  const lines: string[] = [];
  for (const section of opts.sections) {
    const renderer = renderers.get(section);
    if (!renderer) throw new Error(`no renderer for section: ${section}`);
    lines.push(...renderer.render(context));
  }

  return lines.join("\n");
}
