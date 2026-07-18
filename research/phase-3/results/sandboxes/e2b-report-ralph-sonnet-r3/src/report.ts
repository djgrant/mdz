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
}

interface RenderContext {
  input: ReportInput;
  separator: string;
  bullet: string;
}

const formatHours = (hours: number): string => `${hours}h`;

function taskStats(tasks: Task[]) {
  const done = tasks.filter((task) => task.done).length;
  const hours = tasks.reduce((sum, task) => sum + task.hours, 0);
  return { done, open: tasks.length - done, total: tasks.length, hours };
}

const SECTION_RENDERERS: Record<string, (ctx: RenderContext) => string[]> = {
  header: ({ input, separator }) => [input.title, separator.repeat(input.title.length)],

  tasks: ({ input, bullet }) =>
    input.tasks.map((task) => {
      const marker = task.done ? "[x]" : "[ ]";
      return `${bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
    }),

  summary: ({ input }) => {
    const stats = taskStats(input.tasks);
    return [`Done: ${stats.done}`, `Open: ${stats.open}`, `Hours: ${formatHours(stats.hours)}`];
  },

  footer: ({ input }) => {
    const stats = taskStats(input.tasks);
    return [`${stats.done}/${stats.total} done, ${formatHours(stats.hours)} total`];
  },
};

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const ctx: RenderContext = {
    input,
    separator: options?.separator ?? "=",
    bullet: options?.bullet ?? "-",
  };
  const sections = options?.sections ?? ["header", "tasks", "footer"];

  const lines: string[] = [];
  for (const section of sections) {
    const render = SECTION_RENDERERS[section];
    if (!render) {
      throw new Error(`no renderer for section: ${section}`);
    }
    lines.push(...render(ctx));
  }
  return lines.join("\n");
}
