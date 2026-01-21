type PeggyError = {
  message?: string;
  found?: string | null;
  location?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
};

export type Diagnostic = {
  code: string;
  message: string;
  location?: PeggyError["location"];
};

const lookupCode = (error: PeggyError): string => {
  if (error.found == null) return "MDZ0001_UNEXPECTED_EOF";
  return "MDZ0002_UNEXPECTED_TOKEN";
};

export const normalizePeggyError = (error: unknown): Diagnostic => {
  const err = (error ?? {}) as PeggyError;
  return {
    code: lookupCode(err),
    message: err.message ?? String(error),
    ...(err.location ? { location: err.location } : {})
  };
};
