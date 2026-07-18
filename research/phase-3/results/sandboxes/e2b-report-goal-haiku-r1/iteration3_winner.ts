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
  input: ReportInput;
  separator: string;
  bullet: string;
  theme: typeof THEMES.default;
  messages: typeof MESSAGES.en;
}

function summarizeTasks(tasks: Task[]) {
  let doneCount = 0, openCount = 0, totalHours = 0;
  for (const task of tasks) {
    if (task.done) doneCount += 1;
    else openCount += 1;
    totalHours += task.hours;
  }
  return { doneCount, openCount, totalHours };
}

function renderHeader(ctx: RenderContext): string[] {
  const { title } = ctx.input;
  return [title, ctx.separator.repeat(title.length)];
}

function renderTasks(ctx: RenderContext): string[] {
  return ctx.input.tasks.map((task) => {
    const marker = task.done ? ctx.theme.doneMarker : ctx.theme.openMarker;
    return `${ctx.bullet} ${marker} ${task.title} (${task.hours}h)`;
  });
}

function renderSummary(ctx: RenderContext): string[] {
  const { doneCount, openCount, totalHours } = summarizeTasks(ctx.input.tasks);
  return [
    `${ctx.messages.doneLabel}: ${doneCount}`,
    `${ctx.messages.openLabel}: ${openCount}`,
    `${ctx.messages.hoursLabel}: ${totalHours}h`,
  ];
}

function renderFooter(ctx: RenderContext): string[] {
  const { doneCount, totalHours } = summarizeTasks(ctx.input.tasks);
  return [`${doneCount}/${ctx.input.tasks.length} ${ctx.messages.done}, ${totalHours}h ${ctx.messages.total}`];
}

const renderers: Record<string, (ctx: RenderContext) => string[]> = {
  header: renderHeader,
  tasks: renderTasks,
  summary: renderSummary,
  footer: renderFooter,
};

function buildContext(input: ReportInput, options: Required<ReportOptions>): RenderContext {
  const theme = THEMES[options.theme as keyof typeof THEMES];
  if (!theme) throw new Error(`no theme registered under: ${options.theme}`);

  const messages = MESSAGES[options.locale as keyof typeof MESSAGES];
  if (!messages) throw new Error(`no messages for locale: ${options.locale}`);

  return {
    input,
    separator: options.separator,
    bullet: options.bullet,
    theme,
    messages,
  };
}

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const context = buildContext(input, opts);

  const lines: string[] = [];
  for (const section of opts.sections) {
    const render = renderers[section];
    if (!render) throw new Error(`no renderer for section: ${section}`);
    lines.push(...render(context));
  }

  return lines.join("\n");
}
