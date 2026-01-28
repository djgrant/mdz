export {
  parseDocument,
  parseTypeValue,
  type ParseResult,
  type TypeValueResult
} from "./parser.js";
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
export {
  parseFrontmatter,
  type FrontmatterResult,
  type FrontmatterBlock,
  type FrontmatterDiagnostic,
  type FrontmatterLocation
} from "./frontmatter.js";
export {
  analyzeFrontmatter,
  type FrontmatterAnalysis,
  type FrontmatterAnalysisResult,
  type FrontmatterParamEntry,
  type FrontmatterTypeEntry
} from "./frontmatter-analysis.js";
export {
  DocumentRegistry,
  type DocumentEntry,
  type RegistryLookup
} from "./registry.js";
export {
  TypeEnvironment,
  inferTypeFromValue,
  astValueToType,
  BUILTIN_TYPES,
  type MdzType,
  type VariableBinding,
  type TypeDeclaration
} from "./types.js";
export {
  extractBindingsFromAst,
  buildTypeEnvironment,
  type AstAnalysisResult,
  type ExtractedBinding,
  type ExtractedTypeDecl,
  type AstLocation
} from "./ast-analysis.js";
export {
  extractDocumentSymbols,
  type DocumentSymbol,
  type SymbolKind
} from "./symbols.js";
export {
  getCompletions,
  type CompletionItem,
  type CompletionItemKind,
  type CompletionContext
} from "./completion.js";
export {
  getHover,
  type HoverResult,
  type HoverContext
} from "./hover.js";
export {
  getDefinition,
  type DefinitionLocation,
  type DefinitionResult,
  type DefinitionContext
} from "./definition.js";
