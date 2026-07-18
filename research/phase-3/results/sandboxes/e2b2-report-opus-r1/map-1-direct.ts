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
  en: {
    done: "done",
    total: "total",
    doneLabel: "Done",
    openLabel: "Open",
    hoursLabel: "Hours",
  },
};

const DEFAULT_REPORT_OPTIONS: Required<ReportOptions> = {
  separator: "=",
  bullet: "-",
  sections: ["header", "tasks", "footer"],
  theme: "default",
  locale: "en",
  outputFormat: "text",
};

function formatHours(hours: number): string {
  return `${hours}h`;
}

function summarize(tasks: Task[]): { doneCount: number; openCount: number; totalHours: number } {
  let doneCount = 0;
  let openCount = 0;
  let totalHours = 0;
  for (const task of tasks) {
    if (task.done) {
      doneCount += 1;
    } else {
      openCount += 1;
    }
    totalHours += task.hours;
  }
  return { doneCount, openCount, totalHours };
}

function renderSection(
  section: string,
  input: ReportInput,
  separator: string,
  bullet: string,
  theme: { doneMarker: string; openMarker: string },
  message: (key: string) => string,
): string[] {
  switch (section) {
    case "header":
      return [input.title, separator.repeat(input.title.length)];

    case "tasks":
      return input.tasks.map((task) => {
        const marker = task.done ? theme.doneMarker : theme.openMarker;
        return `${bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
      });

    case "summary": {
      const { doneCount, openCount, totalHours } = summarize(input.tasks);
      return [
        `${message("doneLabel")}: ${doneCount}`,
        `${message("openLabel")}: ${openCount}`,
        `${message("hoursLabel")}: ${formatHours(totalHours)}`,
      ];
    }

    case "footer": {
      const { doneCount, totalHours } = summarize(input.tasks);
      return [
        `${doneCount}/${input.tasks.length} ${message("done")}, ${formatHours(totalHours)} ${message("total")}`,
      ];
    }

    default:
      throw new Error(`no renderer for section: ${section}`);
  }
}

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const { separator, bullet, sections, theme: themeName, locale } = {
    ...DEFAULT_REPORT_OPTIONS,
    ...(options ?? {}),
  };

  const theme = THEMES[themeName];
  if (!theme) {
    throw new Error(`no theme registered under: ${themeName}`);
  }

  const messages = MESSAGES[locale];
  if (!messages) {
    throw new Error(`no messages for locale: ${locale}`);
  }
  const message = (key: string): string => {
    const value = messages[key];
    if (value === undefined) {
      throw new Error(`no message for key: ${key}`);
    }
    return value;
  };

  const lines: string[] = [];
  for (const section of sections) {
    lines.push(...renderSection(section, input, separator, bullet, theme, message));
  }
  return lines.join("\n");
}
