import { parseDocument, type ParseResult } from "./parser.js";
import { parseFrontmatter, type FrontmatterBlock } from "./frontmatter.js";
import {
  analyzeFrontmatter,
  type FrontmatterAnalysis
} from "./frontmatter-analysis.js";
import { extractLinksFromAst, type LinkRef } from "./links.js";

export type DocumentEntry = {
  uri: string;
  version: number;
  text: string;
  parseResult: ParseResult;
  frontmatter: FrontmatterBlock | null;
  frontmatterAnalysis: FrontmatterAnalysis | null;
  links: LinkRef[];
};

export type RegistryLookup = {
  getDocument: (uri: string) => DocumentEntry | undefined;
  getAllDocuments: () => DocumentEntry[];
  findTypeDeclaration: (typeName: string) => { uri: string; entry: DocumentEntry } | undefined;
  findPathLink: (pathValue: string) => { uri: string; entry: DocumentEntry } | undefined;
};

export class DocumentRegistry implements RegistryLookup {
  private documents = new Map<string, DocumentEntry>();

  async updateDocument(uri: string, text: string, version: number): Promise<DocumentEntry> {
    const frontmatterResult = parseFrontmatter(text);
    const frontmatter = frontmatterResult.ok ? frontmatterResult.frontmatter : null;

    let frontmatterAnalysis: FrontmatterAnalysis | null = null;
    if (frontmatter) {
      const analysisResult = await analyzeFrontmatter(frontmatter);
      frontmatterAnalysis = analysisResult.analysis;
    }

    const parseResult = await parseDocument(text);
    const links = parseResult.ok ? extractLinksFromAst(parseResult.ast) : [];

    const entry: DocumentEntry = {
      uri,
      version,
      text,
      parseResult,
      frontmatter,
      frontmatterAnalysis,
      links
    };

    this.documents.set(uri, entry);
    return entry;
  }

  removeDocument(uri: string): void {
    this.documents.delete(uri);
  }

  getDocument(uri: string): DocumentEntry | undefined {
    return this.documents.get(uri);
  }

  getAllDocuments(): DocumentEntry[] {
    return Array.from(this.documents.values());
  }

  findTypeDeclaration(typeName: string): { uri: string; entry: DocumentEntry } | undefined {
    for (const [uri, entry] of this.documents) {
      if (entry.frontmatterAnalysis?.types[typeName]) {
        return { uri, entry };
      }
    }
    return undefined;
  }

  findPathLink(pathValue: string): { uri: string; entry: DocumentEntry } | undefined {
    for (const [uri, entry] of this.documents) {
      const hasPath = entry.links.some(
        (link) => link.kind === "path" && link.value === pathValue
      );
      if (hasPath) {
        return { uri, entry };
      }
    }
    return undefined;
  }

  findDocumentsWithType(typeName: string): Array<{ uri: string; entry: DocumentEntry }> {
    const results: Array<{ uri: string; entry: DocumentEntry }> = [];
    for (const [uri, entry] of this.documents) {
      if (entry.frontmatterAnalysis?.types[typeName]) {
        results.push({ uri, entry });
      }
    }
    return results;
  }

  findDocumentsReferencingPath(pathValue: string): Array<{ uri: string; entry: DocumentEntry }> {
    const results: Array<{ uri: string; entry: DocumentEntry }> = [];
    for (const [uri, entry] of this.documents) {
      const hasPath = entry.links.some(
        (link) => link.kind === "path" && link.value === pathValue
      );
      if (hasPath) {
        results.push({ uri, entry });
      }
    }
    return results;
  }

  clear(): void {
    this.documents.clear();
  }
}
