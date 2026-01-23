export { parseDocument, type ParseResult } from "./parser.js";
export { normalizePeggyError, type ParserDiagnostic } from "./diagnostics.js";
export {
  loadConfig,
  findWorkspaceRoot,
  uriToPath,
  type MdzConfig,
  type ConfigError,
  type ConfigResult
} from "./config.js";
export {
  extractLinksFromAst,
  locateLinkOccurrences,
  resolvePathLink,
  pathLinkExists,
  collectAnchors,
  normalizeAnchorValue,
  slugifyHeading,
  type LinkRef,
  type LinkOccurrence,
  type LinkRange,
  type LinkKind
} from "./links.js";
