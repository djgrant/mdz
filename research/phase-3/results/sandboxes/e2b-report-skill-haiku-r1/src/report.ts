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
  theme?: string;
  locale?: string;
  outputFormat?: "text";
}

const THEMES: Record<string, { separator: string; bullet: string; doneMarker: string; openMarker: string }> = {
  default: {
    separator: "=",
    bullet: "-",
    doneMarker: "[x]",
    openMarker: "[ ]",
  },
};

const MESSAGES: Record<string, Record<string, string>> = {
  en: {
    done: "done",
    total: "total",
    doneLabel: "Done",
    openLabel: "Open",
    hoursLabel: "Hours",
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

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...(options ?? {}) };

  const theme = THEMES[opts.theme];
  if (!theme) throw new Error(`no theme registered under: ${opts.theme}`);

  const messages = MESSAGES[opts.locale];
  if (!messages) throw new Error(`no messages for locale: ${opts.locale}`);

  const lines: string[] = [];

  for (const section of opts.sections) {
    if (section === "header") {
      const title = input.title;
      lines.push(title, opts.separator.repeat(title.length));
    } else if (section === "tasks") {
      for (const task of input.tasks) {
        const marker = task.done ? theme.doneMarker : theme.openMarker;
        lines.push(`${opts.bullet} ${marker} ${task.title} (${task.hours}h)`);
      }
    } else if (section === "summary") {
      let doneCount = 0;
      let openCount = 0;
      let totalHours = 0;
      for (const task of input.tasks) {
        if (task.done) doneCount++;
        else openCount++;
        totalHours += task.hours;
      }
      lines.push(
        `${messages.doneLabel}: ${doneCount}`,
        `${messages.openLabel}: ${openCount}`,
        `${messages.hoursLabel}: ${totalHours}h`,
      );
    } else if (section === "footer") {
      let doneCount = 0;
      let totalHours = 0;
      for (const task of input.tasks) {
        if (task.done) doneCount++;
        totalHours += task.hours;
      }
      lines.push(`${doneCount}/${input.tasks.length} ${messages.done}, ${totalHours}h ${messages.total}`);
    } else {
      throw new Error(`no renderer for section: ${section}`);
    }
  }

  return lines.join("\n");
}
