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

const THEMES: Record<string, { doneMarker: string; openMarker: string }> = {
  default: { doneMarker: "[x]", openMarker: "[ ]" },
};

const MESSAGES: Record<string, Record<string, string>> = {
  en: { done: "done", total: "total", doneLabel: "Done", openLabel: "Open", hoursLabel: "Hours" },
};

const hoursText = (hours: number): string => `${hours}h`;

function counts(tasks: Task[]) {
  const done = tasks.filter((t) => t.done).length;
  const hours = tasks.reduce((sum, t) => sum + t.hours, 0);
  return { done, open: tasks.length - done, hours, total: tasks.length };
}

export function formatReport(input: ReportInput, options: ReportOptions = {}): string {
  const separator = options.separator ?? "=";
  const bullet = options.bullet ?? "-";
  const sections = options.sections ?? ["header", "tasks", "footer"];
  const locale = options.locale ?? "en";
  const themeName = options.theme ?? "default";

  const theme = THEMES[themeName];
  if (!theme) throw new Error(`no theme registered under: ${themeName}`);
  const msgs = MESSAGES[locale];
  if (!msgs) throw new Error(`no messages for locale: ${locale}`);
  const msg = (key: string) => {
    const value = msgs[key];
    if (value === undefined) throw new Error(`no message for key: ${key}`);
    return value;
  };

  const { done, open, hours, total } = counts(input.tasks);

  const renderers: Record<string, () => string[]> = {
    header: () => [input.title, separator.repeat(input.title.length)],
    tasks: () =>
      input.tasks.map(
        (t) =>
          `${bullet} ${t.done ? theme.doneMarker : theme.openMarker} ${t.title} (${hoursText(t.hours)})`,
      ),
    summary: () => [
      `${msg("doneLabel")}: ${done}`,
      `${msg("openLabel")}: ${open}`,
      `${msg("hoursLabel")}: ${hoursText(hours)}`,
    ],
    footer: () => [`${done}/${total} ${msg("done")}, ${hoursText(hours)} ${msg("total")}`],
  };

  return sections
    .flatMap((section) => {
      const renderer = renderers[section];
      if (!renderer) throw new Error(`no renderer for section: ${section}`);
      return renderer();
    })
    .join("\n");
}
