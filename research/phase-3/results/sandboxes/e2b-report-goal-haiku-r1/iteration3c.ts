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

const MESSAGES = { en: { done: "done", total: "total", doneLabel: "Done", openLabel: "Open", hoursLabel: "Hours" } };
const THEMES = { default: { separator: "=", bullet: "-", doneMarker: "[x]", openMarker: "[ ]" } };
const DEFAULT_OPTIONS: Required<ReportOptions> = {
  separator: "=", bullet: "-", sections: ["header", "tasks", "footer"], theme: "default", locale: "en", outputFormat: "text",
};

interface Ctx { input: ReportInput; separator: string; bullet: string; theme: typeof THEMES.default; messages: typeof MESSAGES.en; }

const renderers: Record<string, (c: Ctx) => string[]> = {
  header: (c) => [c.input.title, c.separator.repeat(c.input.title.length)],

  tasks: (c) => c.input.tasks.map((t) => {
    const m = t.done ? c.theme.doneMarker : c.theme.openMarker;
    return `${c.bullet} ${m} ${t.title} (${t.hours}h)`;
  }),

  summary: (c) => {
    let d = 0, o = 0, h = 0;
    for (const t of c.input.tasks) { if (t.done) d++; else o++; h += t.hours; }
    return [`${c.messages.doneLabel}: ${d}`, `${c.messages.openLabel}: ${o}`, `${c.messages.hoursLabel}: ${h}h`];
  },

  footer: (c) => {
    let d = 0, h = 0;
    for (const t of c.input.tasks) { if (t.done) d++; h += t.hours; }
    return [`${d}/${c.input.tasks.length} ${c.messages.done}, ${h}h ${c.messages.total}`];
  },
};

export function formatReport(input: ReportInput, options?: ReportOptions): string {
  const opts = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const theme = THEMES[opts.theme as keyof typeof THEMES];
  if (!theme) throw new Error(`no theme registered under: ${opts.theme}`);
  const messages = MESSAGES[opts.locale as keyof typeof MESSAGES];
  if (!messages) throw new Error(`no messages for locale: ${opts.locale}`);

  const lines: string[] = [];
  for (const section of opts.sections) {
    const r = renderers[section];
    if (!r) throw new Error(`no renderer for section: ${section}`);
    lines.push(...r({ input, separator: opts.separator, bullet: opts.bullet, theme, messages }));
  }
  return lines.join("\n");
}
