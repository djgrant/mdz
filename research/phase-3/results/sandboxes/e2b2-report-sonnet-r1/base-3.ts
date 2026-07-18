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

const DEFAULT_OPTIONS: Required<ReportOptions> = {
  separator: "=",
  bullet: "-",
  sections: ["header", "tasks", "footer"],
  theme: "default",
  locale: "en",
  outputFormat: "text",
};

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

function message(locale: string, key: string): string {
  const table = MESSAGES[locale];
  if (!table) throw new Error(`no messages for locale: ${locale}`);
  const value = table[key];
  if (value === undefined) throw new Error(`no message for key: ${key}`);
  return value;
}

const formatHours = (hours: number): string => `${hours}h`;

function summarise(tasks: Task[]) {
  const doneCount = tasks.filter((task) => task.done).length;
  const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);
  return { doneCount, openCount: tasks.length - doneCount, totalHours };
}

interface RenderContext {
  input: ReportInput;
  separator: string;
  bullet: string;
  theme: { doneMarker: string; openMarker: string };
  locale: string;
}

const RENDERERS: Record<string, (context: RenderContext) => string[]> = {
  header: ({ input, separator }) => [input.title, separator.repeat(input.title.length)],

  tasks: ({ input, bullet, theme }) =>
    input.tasks.map((task) => {
      const marker = task.done ? theme.doneMarker : theme.openMarker;
      return `${bullet} ${marker} ${task.title} (${formatHours(task.hours)})`;
    }),

  summary: ({ input, locale }) => {
    const { doneCount, openCount, totalHours } = summarise(input.tasks);
    return [
      `${message(locale, "doneLabel")}: ${doneCount}`,
      `${message(locale, "openLabel")}: ${openCount}`,
      `${message(locale, "hoursLabel")}: ${formatHours(totalHours)}`,
    ];
  },

  footer: ({ input, locale }) => {
    const { doneCount, totalHours } = summarise(input.tasks);
    return [
      `${doneCount}/${input.tasks.length} ${message(locale, "done")}, ${formatHours(totalHours)} ${message(locale, "total")}`,
    ];
  },
};

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const { separator, bullet, sections, theme, locale } = { ...DEFAULT_OPTIONS, ...options };

  const resolvedTheme = THEMES[theme];
  if (!resolvedTheme) throw new Error(`no theme registered under: ${theme}`);

  const context: RenderContext = { input, separator, bullet, theme: resolvedTheme, locale };

  return sections
    .flatMap((section) => {
      const render = RENDERERS[section];
      if (!render) throw new Error(`no renderer for section: ${section}`);
      return render(context);
    })
    .join("\n");
}
