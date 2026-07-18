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
}

const DEFAULT_OPTIONS: Required<ReportOptions> = {
  separator: "=",
  bullet: "-",
  sections: ["header", "tasks", "footer"],
};

const MESSAGES = {
  en: {
    doneLabel: "Done",
    openLabel: "Open",
    hoursLabel: "Hours",
  },
};

function formatHours(hours: number): string {
  return `${hours}h`;
}

function calculateStats(tasks: Task[]): { doneCount: number; totalHours: number } {
  let doneCount = 0;
  let totalHours = 0;
  for (const task of tasks) {
    if (task.done) doneCount += 1;
    totalHours += task.hours;
  }
  return { doneCount, totalHours };
}

interface Ctx {
  input: ReportInput;
  separator: string;
  bullet: string;
  messages: typeof MESSAGES.en;
  stats: { doneCount: number; totalHours: number };
}

function renderHeader(ctx: Ctx): string[] {
  const { title } = ctx.input;
  return [title, ctx.separator.repeat(title.length)];
}

function renderTasks(ctx: Ctx): string[] {
  return ctx.input.tasks.map((task) => {
    const marker = task.done ? "[x]" : "[ ]";
    return `${ctx.bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
  });
}

function renderSummary(ctx: Ctx): string[] {
  const { doneCount, totalHours } = ctx.stats;
  const openCount = ctx.input.tasks.length - doneCount;
  return [
    `${ctx.messages.doneLabel}: ${doneCount}`,
    `${ctx.messages.openLabel}: ${openCount}`,
    `${ctx.messages.hoursLabel}: ${formatHours(totalHours)}`,
  ];
}

function renderFooter(ctx: Ctx): string[] {
  const { doneCount, totalHours } = ctx.stats;
  const total = ctx.input.tasks.length;
  return [`${doneCount}/${total} done, ${formatHours(totalHours)} total`];
}

const RENDERERS: Record<string, (ctx: Ctx) => string[]> = {
  header: renderHeader,
  tasks: renderTasks,
  summary: renderSummary,
  footer: renderFooter,
};

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const stats = calculateStats(input.tasks);

  const ctx: Ctx = {
    input,
    separator: opts.separator,
    bullet: opts.bullet,
    messages: MESSAGES.en,
    stats,
  };

  const lines: string[] = [];
  for (const section of opts.sections) {
    const renderer = RENDERERS[section];
    if (!renderer) {
      throw new Error(`no renderer for section: ${section}`);
    }
    lines.push(...renderer(ctx));
  }

  return lines.join("\n");
}
