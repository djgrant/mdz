export interface Task {
  title: string;
  done: boolean;
  hours: number;
}

export interface ReportInput {
  title: string;
  tasks: Task[];
}

interface RenderContext {
  readonly input: ReportInput;
  readonly separator: string;
  readonly bullet: string;
  readonly doneMarker: string;
  readonly openMarker: string;
  readonly doneCount: number;
  readonly totalHours: number;
}

const formatHours = (hours: number): string => `${hours}h`;

const renderHeader = (ctx: RenderContext): string[] => {
  const { title } = ctx.input;
  return [title, ctx.separator.repeat(title.length)];
};

const renderTasks = (ctx: RenderContext): string[] =>
  ctx.input.tasks.map(
    (task) =>
      `${ctx.bullet} ${task.done ? ctx.doneMarker : ctx.openMarker} ${task.title} (${formatHours(task.hours)})`
  );

const renderSummary = (ctx: RenderContext): string[] => [
  `Done: ${ctx.doneCount}`,
  `Open: ${ctx.input.tasks.length - ctx.doneCount}`,
  `Hours: ${formatHours(ctx.totalHours)}`,
];

const renderFooter = (ctx: RenderContext): string[] => [
  `${ctx.doneCount}/${ctx.input.tasks.length} done, ${formatHours(ctx.totalHours)} total`,
];

const RENDERERS: Record<string, (ctx: RenderContext) => string[]> = {
  header: renderHeader,
  tasks: renderTasks,
  summary: renderSummary,
  footer: renderFooter,
};

export interface ReportOptions {
  separator?: string;
  bullet?: string;
  sections?: string[];
  theme?: string;
  locale?: string;
  outputFormat?: "text";
}

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  if (options?.theme && options.theme !== "default") {
    throw new Error(`no theme registered under: ${options.theme}`);
  }
  if (options?.locale && options.locale !== "en") {
    throw new Error(`no messages for locale: ${options.locale}`);
  }

  let doneCount = 0;
  let totalHours = 0;
  for (const task of input.tasks) {
    if (task.done) doneCount++;
    totalHours += task.hours;
  }

  const context: RenderContext = {
    input,
    separator: options?.separator ?? "=",
    bullet: options?.bullet ?? "-",
    doneMarker: "[x]",
    openMarker: "[ ]",
    doneCount,
    totalHours,
  };

  const sections = options?.sections ?? ["header", "tasks", "footer"];
  const lines: string[] = [];
  for (const section of sections) {
    const renderer = RENDERERS[section];
    if (!renderer) {
      throw new Error(`no renderer for section: ${section}`);
    }
    lines.push(...renderer(context));
  }

  return lines.join("\n");
}
