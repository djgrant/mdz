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
  /** Only the "default" theme is registered. */
  theme?: string;
  /** Only "en" messages are provided. */
  locale?: string;
  /** Only plain text output is implemented; the enum anticipates markdown. */
  outputFormat?: "text";
}

const DEFAULT_SECTIONS = ["header", "tasks", "footer"];

const hours = (n: number): string => `${n}h`;

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const separator = options?.separator ?? "=";
  const bullet = options?.bullet ?? "-";
  const sections = options?.sections ?? DEFAULT_SECTIONS;
  const themeName = options?.theme ?? "default";
  const locale = options?.locale ?? "en";

  if (themeName !== "default") {
    throw new Error(`no theme registered under: ${themeName}`);
  }
  if (locale !== "en") {
    throw new Error(`no messages for locale: ${locale}`);
  }

  const doneCount = input.tasks.filter((task) => task.done).length;
  const openCount = input.tasks.length - doneCount;
  const totalHours = input.tasks.reduce((sum, task) => sum + task.hours, 0);

  const renderers: Record<string, () => string[]> = {
    header: () => [input.title, separator.repeat(input.title.length)],
    tasks: () =>
      input.tasks.map(
        (task) => `${bullet} ${task.done ? "[x]" : "[ ]"} ${task.title} (${hours(task.hours)})`,
      ),
    summary: () => [
      `Done: ${doneCount}`,
      `Open: ${openCount}`,
      `Hours: ${hours(totalHours)}`,
    ],
    footer: () => [`${doneCount}/${input.tasks.length} done, ${hours(totalHours)} total`],
  };

  const lines: string[] = [];
  for (const section of sections) {
    const render = renderers[section];
    if (!render) {
      throw new Error(`no renderer for section: ${section}`);
    }
    lines.push(...render());
  }
  return lines.join("\n");
}
