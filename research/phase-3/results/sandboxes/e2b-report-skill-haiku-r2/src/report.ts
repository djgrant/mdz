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

const DEFAULT_SEPARATOR = "=";
const DEFAULT_BULLET = "-";
const DEFAULT_SECTIONS = ["header", "tasks", "footer"];

const DONE_MARKER = "[x]";
const OPEN_MARKER = "[ ]";

const LABELS = {
  done: "done",
  total: "total",
  doneLabel: "Done",
  openLabel: "Open",
  hoursLabel: "Hours",
};

interface TaskStats {
  doneCount: number;
  openCount: number;
  totalHours: number;
}

function calculateStats(tasks: Task[]): TaskStats {
  let doneCount = 0;
  let openCount = 0;
  let totalHours = 0;

  for (const task of tasks) {
    if (task.done) doneCount++;
    else openCount++;
    totalHours += task.hours;
  }

  return { doneCount, openCount, totalHours };
}

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const separator = options?.separator ?? DEFAULT_SEPARATOR;
  const bullet = options?.bullet ?? DEFAULT_BULLET;
  const sections = options?.sections ?? DEFAULT_SECTIONS;
  const theme = options?.theme ?? "default";
  const locale = options?.locale ?? "en";

  if (theme !== "default") throw new Error(`no theme registered under: ${theme}`);
  if (locale !== "en") throw new Error(`no messages for locale: ${locale}`);

  const stats = calculateStats(input.tasks);

  const renderers: Record<string, () => string[]> = {
    header: () => [input.title, separator.repeat(input.title.length)],

    tasks: () =>
      input.tasks.map(({ done, title, hours }) =>
        `${bullet} ${done ? DONE_MARKER : OPEN_MARKER} ${title} (${hours}h)`
      ),

    summary: () => [
      `${LABELS.doneLabel}: ${stats.doneCount}`,
      `${LABELS.openLabel}: ${stats.openCount}`,
      `${LABELS.hoursLabel}: ${stats.totalHours}h`,
    ],

    footer: () => [
      `${stats.doneCount}/${input.tasks.length} ${LABELS.done}, ${stats.totalHours}h ${LABELS.total}`,
    ],
  };

  return sections
    .flatMap(section => {
      const renderer = renderers[section];
      if (!renderer) throw new Error(`no renderer for section: ${section}`);
      return renderer();
    })
    .join("\n");
}
