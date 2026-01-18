"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // ../packages/core/src/parser/ast.ts
  function createSpan(startLine, startColumn, startOffset, endLine, endColumn, endOffset) {
    return {
      start: { line: startLine, column: startColumn, offset: startOffset },
      end: { line: endLine, column: endColumn, offset: endOffset }
    };
  }
  function mergeSpans(a, b) {
    return {
      start: a.start.offset < b.start.offset ? a.start : b.start,
      end: a.end.offset > b.end.offset ? a.end : b.end
    };
  }
  function isLink(node) {
    return node.kind === "Link";
  }
  function isAnchor(node) {
    return node.kind === "Anchor";
  }
  function getLinkKind(link) {
    const folder = link.path[0];
    if (folder === "agent" || folder === "agents") return "agent";
    if (folder === "skill" || folder === "skills") return "skill";
    if (folder === "tool" || folder === "tools") return "tool";
    return "unknown";
  }

  // ../packages/core/src/parser/lexer.ts
  var Lexer = class {
    constructor(source) {
      __publicField(this, "source");
      __publicField(this, "pos", 0);
      __publicField(this, "line", 1);
      __publicField(this, "column", 0);
      __publicField(this, "tokens", []);
      this.source = source;
    }
    tokenize() {
      while (!this.isAtEnd()) {
        this.scanToken();
      }
      this.addToken("EOF", "");
      return this.tokens;
    }
    scanToken() {
      if (this.column === 0) {
        if (this.line === 1 && this.lookAhead("---\n")) {
          this.consumeChars(3);
          this.addToken("FRONTMATTER_START", "---");
          this.consumeNewline();
          this.scanFrontmatter();
          return;
        }
        if (this.lookAhead("---\n") || this.lookAhead("---") && this.pos + 3 >= this.source.length) {
          this.consumeChars(3);
          this.addToken("HORIZONTAL_RULE", "---");
          if (!this.isAtEnd()) this.consumeNewline();
          return;
        }
      }
      const char = this.peek();
      if (char === " " || char === "	") {
        this.advance();
        return;
      }
      if (char === "\n") {
        this.consumeNewline();
        return;
      }
      if (char === "\r") {
        this.advance();
        return;
      }
      if (this.column === 0 && char === "#") {
        let offset = 0;
        while (this.peekAt(offset) === "#") {
          offset += 1;
        }
        if (this.peekAt(offset) === " ") {
          this.scanHeading();
          return;
        }
      }
      if (char === "-" && this.peekAt(1) === " ") {
        this.advance();
        this.advance();
        this.addToken("LIST_MARKER", "- ");
        return;
      }
      if (this.isDigit(char) && this.peekAt(1) === "." && this.peekAt(2) === " ") {
        const num = this.advance();
        this.advance();
        this.advance();
        this.addToken("LIST_MARKER", num + ". ");
        return;
      }
      if (this.column === 0 && this.lookAhead("```")) {
        this.scanCodeBlock();
        return;
      }
      if (this.column === 0 && char === ">") {
        this.scanBlockquote();
        return;
      }
      if (char === "~" && this.peekAt(1) === "/") {
        const result = this.tryScanLink();
        if (result) return;
      }
      if (char === "#") {
        const result = this.tryScanAnchor();
        if (result) return;
      }
      if (this.lookAhead("=>")) {
        this.consumeChars(2);
        this.addToken("ARROW", "=>");
        return;
      }
      if (this.lookAhead("!=")) {
        this.consumeChars(2);
        this.addToken("NEQ", "!=");
        return;
      }
      if (this.lookAhead("<=")) {
        this.consumeChars(2);
        this.addToken("LTE", "<=");
        return;
      }
      if (this.lookAhead(">=")) {
        this.consumeChars(2);
        this.addToken("GTE", ">=");
        return;
      }
      if (this.lookAhead("<<")) {
        this.consumeChars(2);
        this.addToken("PUSH", "<<");
        return;
      }
      const singleOps = {
        "=": "ASSIGN",
        ":": "COLON",
        "|": "PIPE",
        ".": "DOT",
        ",": "COMMA",
        ";": "SEMICOLON",
        "<": "LT",
        ">": "GT",
        "(": "LPAREN",
        ")": "RPAREN",
        "[": "LBRACKET",
        "]": "RBRACKET",
        "{": "LBRACE",
        "}": "RBRACE"
      };
      if (singleOps[char]) {
        this.advance();
        this.addToken(singleOps[char], char);
        return;
      }
      if (char === "$") {
        this.scanDollarIdent();
        return;
      }
      if (char === '"') {
        this.scanString();
        return;
      }
      if (char === "`") {
        this.scanTemplate();
        return;
      }
      if (this.isDigit(char) || char === "-" && this.isDigit(this.peekAt(1))) {
        this.scanNumber();
        return;
      }
      if (this.isAlpha(char)) {
        this.scanIdentOrKeyword();
        return;
      }
      this.advance();
      this.addToken("TEXT", char);
    }
    // Indentation is cosmetic in v0.10; no INDENT/DEDENT tokens.
    scanFrontmatter() {
      while (!this.isAtEnd()) {
        if (this.column === 0 && this.lookAhead("---")) {
          this.consumeChars(3);
          this.addToken("FRONTMATTER_END", "---");
          if (!this.isAtEnd() && this.peek() === "\n") {
            this.consumeNewline();
          }
          return;
        }
        let text = "";
        while (!this.isAtEnd() && this.peek() !== "\n") {
          text += this.advance();
        }
        if (text) {
          this.addToken("TEXT", text);
        }
        if (!this.isAtEnd()) {
          this.consumeNewline();
        }
      }
    }
    scanHeading() {
      let level = 0;
      while (this.peek() === "#") {
        level++;
        this.advance();
      }
      if (this.peek() === " ") this.advance();
      let title = "";
      while (!this.isAtEnd() && this.peek() !== "\n") {
        title += this.advance();
      }
      this.addToken("HEADING", "#".repeat(level) + " " + title);
      if (!this.isAtEnd()) this.consumeNewline();
    }
    scanCodeBlock() {
      this.consumeChars(3);
      let lang = "";
      while (!this.isAtEnd() && this.peek() !== "\n") {
        lang += this.advance();
      }
      this.addToken("CODE_BLOCK_START", "```" + lang);
      if (!this.isAtEnd()) this.consumeNewlineRaw();
      let content = "";
      while (!this.isAtEnd()) {
        if (this.column === 0 && this.lookAhead("```")) {
          if (content) this.addToken("CODE_BLOCK_CONTENT", content);
          this.consumeChars(3);
          this.addToken("CODE_BLOCK_END", "```");
          if (!this.isAtEnd() && this.peek() === "\n") this.consumeNewlineRaw();
          return;
        }
        if (this.peek() === "\n") {
          content += "\n";
          this.consumeNewlineRaw();
        } else {
          content += this.advance();
        }
      }
      if (content) this.addToken("CODE_BLOCK_CONTENT", content);
    }
    scanBlockquote() {
      this.advance();
      let content = "";
      while (!this.isAtEnd() && this.peek() !== "\n") {
        content += this.advance();
      }
      this.addToken("BLOCKQUOTE", ">" + content);
      if (!this.isAtEnd()) this.consumeNewline();
    }
    /**
     * v0.8: Tries to scan a link reference: ~/path/to/file or ~/path/to/file#anchor
     * Assumes current position is at '~' and next char is '/'.
     * Returns true if a link was found and tokenized.
     * 
     * Token value is a JSON object: { path: string[], anchor: string | null }
     */
    tryScanLink() {
      const startPos = this.pos;
      const startLine = this.line;
      const startColumn = this.column;
      this.advance();
      this.advance();
      const path = [];
      let segment = this.scanLinkSegment();
      if (!segment) {
        this.pos = startPos;
        this.column = startColumn;
        this.line = startLine;
        return false;
      }
      path.push(segment);
      while (this.peek() === "/" && this.peekAt(1) !== "\0") {
        const nextChar = this.peekAt(1);
        if (!this.isAlpha(nextChar) && nextChar !== "_") {
          break;
        }
        this.advance();
        segment = this.scanLinkSegment();
        if (!segment) break;
        path.push(segment);
      }
      let anchor = null;
      if (this.peek() === "#") {
        this.advance();
        anchor = this.scanLinkSegment();
        if (!anchor) {
          this.pos = startPos;
          this.column = startColumn;
          this.line = startLine;
          return false;
        }
      }
      const value = JSON.stringify({ path, anchor });
      const rawLength = this.pos - startPos;
      this.addToken("LINK", value, rawLength);
      return true;
    }
    /**
     * Scans a link segment (kebab-case identifier).
     * Returns the segment or empty string if not valid.
     */
    scanLinkSegment() {
      let segment = "";
      if (!this.isAlpha(this.peek()) && this.peek() !== "_") {
        return "";
      }
      while (this.isAlphaNumeric(this.peek()) || this.peek() === "-" || this.peek() === "_") {
        segment += this.advance();
      }
      return segment;
    }
    /**
     * v0.8: Tries to scan an anchor reference: #section
     * Assumes current position is at '#' and we're NOT at column 0 (not a heading).
     * Returns true if an anchor was found and tokenized.
     * 
     * Token value is the anchor name string.
     */
    tryScanAnchor() {
      const startPos = this.pos;
      const startLine = this.line;
      const startColumn = this.column;
      if (this.peek() !== "#") {
        return false;
      }
      const nextChar = this.peekAt(1);
      if (!this.isAlpha(nextChar) && nextChar !== "_") {
        return false;
      }
      this.advance();
      let name = "";
      while (this.isAlphaNumeric(this.peek()) || this.peek() === "-" || this.peek() === "_") {
        name += this.advance();
      }
      if (!name) {
        this.pos = startPos;
        this.column = startColumn;
        this.line = startLine;
        return false;
      }
      const rawLength = this.pos - startPos;
      this.addToken("ANCHOR", name, rawLength);
      return true;
    }
    scanDollarIdent() {
      this.advance();
      if (this.peek() === "/") {
        this.advance();
        let content = "";
        while (!this.isAtEnd() && this.peek() !== "/" && this.peek() !== "\n") {
          content += this.advance();
        }
        if (this.peek() === "/") {
          this.advance();
          this.addToken("INFERRED_VAR", "$/" + content + "/");
          return;
        }
        this.addToken("ERROR", "$/" + content);
        return;
      }
      let ident = "";
      while (this.isAlphaNumeric(this.peek()) || this.peek() === "-") {
        ident += this.advance();
      }
      if (!ident) {
        this.addToken("ERROR", "$");
        return;
      }
      const type = ident[0] >= "A" && ident[0] <= "Z" ? "TYPE_IDENT" : "DOLLAR_IDENT";
      this.addToken(type, "$" + ident);
    }
    scanString() {
      this.advance();
      let value = "";
      while (!this.isAtEnd() && this.peek() !== '"' && this.peek() !== "\n") {
        if (this.peek() === "\\") {
          this.advance();
          const c = this.advance();
          switch (c) {
            case "n":
              value += "\n";
              break;
            case "t":
              value += "	";
              break;
            case '"':
              value += '"';
              break;
            case "\\":
              value += "\\";
              break;
            default:
              value += c;
          }
        } else {
          value += this.advance();
        }
      }
      if (this.peek() === '"') {
        this.advance();
        this.addToken("STRING", value);
      } else {
        this.addToken("ERROR", '"' + value);
      }
    }
    scanTemplate() {
      this.advance();
      this.addToken("TEMPLATE_START", "`");
      let part = "";
      while (!this.isAtEnd() && this.peek() !== "`") {
        if (this.lookAhead("${")) {
          if (part) {
            this.addToken("TEMPLATE_PART", part);
            part = "";
          }
          this.consumeChars(2);
          let expr = "";
          let depth = 1;
          while (!this.isAtEnd() && depth > 0) {
            if (this.peek() === "{") depth++;
            if (this.peek() === "}") depth--;
            if (depth > 0) expr += this.advance();
          }
          if (this.peek() === "}") this.advance();
          this.addToken("DOLLAR_IDENT", expr);
        } else if (this.lookAhead("$/")) {
          if (part) {
            this.addToken("TEMPLATE_PART", part);
            part = "";
          }
          this.advance();
          this.advance();
          let content = "";
          while (!this.isAtEnd() && this.peek() !== "/" && this.peek() !== "\n" && this.peek() !== "`") {
            content += this.advance();
          }
          if (this.peek() === "/") {
            this.advance();
            this.addToken("INFERRED_VAR", "$/" + content + "/");
          } else {
            this.addToken("ERROR", "$/" + content);
          }
        } else {
          part += this.advance();
        }
      }
      if (part) this.addToken("TEMPLATE_PART", part);
      if (this.peek() === "`") {
        this.advance();
        this.addToken("TEMPLATE_END", "`");
      }
    }
    scanNumber() {
      let num = "";
      if (this.peek() === "-") num += this.advance();
      while (this.isDigit(this.peek())) num += this.advance();
      if (this.peek() === "." && this.isDigit(this.peekAt(1))) {
        num += this.advance();
        while (this.isDigit(this.peek())) num += this.advance();
      }
      this.addToken("NUMBER", num);
    }
    scanIdentOrKeyword() {
      let ident = "";
      while (this.isAlphaNumeric(this.peek()) || this.peek() === "-") {
        ident += this.advance();
      }
      const keywords = {
        "FOR": "FOR",
        "IN": "IN",
        "WHILE": "WHILE",
        "DO": "DO",
        "IF": "IF",
        "THEN": "THEN",
        "ELSE": "ELSE",
        "END": "END",
        "AND": "AND",
        "OR": "OR",
        "NOT": "NOT",
        "WITH": "WITH",
        "BREAK": "BREAK",
        "CONTINUE": "CONTINUE",
        "DELEGATE": "DELEGATE",
        "TO": "TO",
        "RETURN": "RETURN",
        "ASYNC": "ASYNC",
        "AWAIT": "AWAIT",
        "true": "TRUE",
        "false": "FALSE"
      };
      const type = keywords[ident] || (ident[0] >= "A" && ident[0] <= "Z" ? "UPPER_IDENT" : "LOWER_IDENT");
      this.addToken(type, ident);
    }
    // Helpers
    isAtEnd() {
      return this.pos >= this.source.length;
    }
    peek() {
      return this.isAtEnd() ? "\0" : this.source[this.pos];
    }
    peekAt(offset) {
      return this.pos + offset >= this.source.length ? "\0" : this.source[this.pos + offset];
    }
    advance() {
      const char = this.source[this.pos++];
      this.column++;
      return char;
    }
    lookAhead(s) {
      return this.source.slice(this.pos, this.pos + s.length) === s;
    }
    consumeChars(n) {
      for (let i = 0; i < n; i++) this.advance();
    }
    consumeNewline() {
      if (this.peek() === "\n") {
        this.pos++;
        this.line++;
        this.column = 0;
        this.addToken("NEWLINE", "\n");
      }
    }
    consumeNewlineRaw() {
      if (this.peek() === "\n") {
        this.pos++;
        this.line++;
        this.column = 0;
      }
    }
    isDigit(c) {
      return c >= "0" && c <= "9";
    }
    isAlpha(c) {
      return c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c === "_";
    }
    isAlphaNumeric(c) {
      return this.isAlpha(c) || this.isDigit(c);
    }
    addToken(type, value, length = value.length) {
      const len = length;
      this.tokens.push({
        type,
        value,
        span: createSpan(this.line, this.column - len, this.pos - len, this.line, this.column, this.pos)
      });
    }
  };
  function tokenize(source) {
    return new Lexer(source).tokenize();
  }

  // ../packages/core/src/parser/parser.ts
  var Parser = class {
    // v0.10: Track control-flow nesting
    constructor(source) {
      this.source = source;
      __publicField(this, "tokens", []);
      __publicField(this, "pos", 0);
      __publicField(this, "errors", []);
      __publicField(this, "frontmatterContent", "");
      __publicField(this, "loopDepth", 0);
      // v0.2: Track if we're inside a loop
      __publicField(this, "blockDepth", 0);
    }
    parse() {
      this.tokens = tokenize(this.source);
      this.pos = 0;
      this.errors = [];
      this.loopDepth = 0;
      this.blockDepth = 0;
      const frontmatter = this.parseFrontmatter();
      const sections = this.parseSections();
      const span = this.tokens.length > 0 ? mergeSpans(
        this.tokens[0].span,
        this.tokens[this.tokens.length - 1].span
      ) : createSpan(1, 0, 0, 1, 0, 0);
      return {
        kind: "Document",
        frontmatter,
        sections,
        errors: this.errors,
        span
      };
    }
    // ==========================================================================
    // Frontmatter
    // ==========================================================================
    parseFrontmatter() {
      if (!this.check("FRONTMATTER_START")) {
        return null;
      }
      const start = this.advance();
      let content = "";
      while (!this.check("FRONTMATTER_END") && !this.isAtEnd()) {
        const token = this.advance();
        if (token.type === "TEXT") {
          content += token.value + "\n";
        }
      }
      if (!this.check("FRONTMATTER_END")) {
        this.error("E013", "Unclosed frontmatter");
        return null;
      }
      const end = this.advance();
      this.frontmatterContent = content;
      const parsed = this.parseYaml(content);
      const { skills, agents, tools, uses } = this.parseUsesField(parsed);
      return {
        kind: "Frontmatter",
        name: parsed.name || "",
        description: parsed.description || "",
        types: this.parseFrontmatterTypes(parsed.types),
        // v0.9
        input: this.parseFrontmatterInput(parsed.input),
        // v0.9
        context: this.parseFrontmatterContext(parsed.context),
        // v0.9
        skills,
        agents,
        tools,
        uses,
        imports: this.parseImports(parsed.imports),
        raw: parsed,
        span: mergeSpans(start.span, end.span)
      };
    }
    // v0.7: Parse unified uses: field with sigil-based entries
    parseUsesField(parsed) {
      const skills = [];
      const agents = [];
      const tools = [];
      const uses = [];
      const hasExplicitSkills = Array.isArray(parsed.skills) && parsed.skills.length > 0;
      const hasExplicitAgents = Array.isArray(parsed.agents) && parsed.agents.length > 0;
      const hasExplicitTools = Array.isArray(parsed.tools) && parsed.tools.length > 0;
      if (hasExplicitSkills) {
        for (const skill of parsed.skills) {
          skills.push(skill);
          uses.push(`~${skill}`);
        }
      }
      if (hasExplicitAgents) {
        for (const agent of parsed.agents) {
          agents.push(agent);
          uses.push(`@${agent}`);
        }
      }
      if (hasExplicitTools) {
        for (const tool of parsed.tools) {
          tools.push(tool);
          uses.push(`!${tool}`);
        }
      }
      if (Array.isArray(parsed.uses)) {
        for (const entry of parsed.uses) {
          if (typeof entry !== "string") continue;
          if (entry.startsWith("~/")) {
            const parts = entry.slice(2).split("/");
            const kind = parts[0];
            const name = parts.slice(1).join("/");
            if (kind === "agent") {
              if (!agents.includes(name)) {
                agents.push(name);
                uses.push(entry);
              }
            } else if (kind === "skill") {
              if (!skills.includes(name)) {
                skills.push(name);
                uses.push(entry);
              }
            } else if (kind === "tool") {
              if (!tools.includes(name)) {
                tools.push(name);
                uses.push(entry);
              }
            }
          } else if (entry.startsWith("~")) {
            const skill = entry.slice(1);
            if (!skills.includes(skill)) {
              skills.push(skill);
              uses.push(entry);
            }
          } else if (entry.startsWith("@")) {
            const agent = entry.slice(1);
            if (!agents.includes(agent)) {
              agents.push(agent);
              uses.push(entry);
            }
          } else if (entry.startsWith("!")) {
            const tool = entry.slice(1);
            if (!tools.includes(tool)) {
              tools.push(tool);
              uses.push(entry);
            }
          } else {
            if (!hasExplicitSkills && !skills.includes(entry)) {
              skills.push(entry);
              uses.push(entry);
            }
          }
        }
      }
      return { skills, agents, tools, uses };
    }
    parseYaml(content) {
      const result = {};
      const lines = content.split("\n");
      let currentKey = "";
      let inArray = false;
      let inImports = false;
      let inNestedObject = false;
      let currentImport = null;
      for (const line of lines) {
        const kvMatch = line.match(/^(\w+):\s*(.*)$/);
        if (kvMatch) {
          currentKey = kvMatch[1];
          const value = kvMatch[2].trim();
          if (value) {
            result[currentKey] = value;
            inArray = false;
            inImports = false;
            inNestedObject = false;
          } else {
            if (currentKey === "types" || currentKey === "input" || currentKey === "context") {
              result[currentKey] = {};
              inNestedObject = true;
              inArray = false;
            } else {
              result[currentKey] = [];
              inArray = true;
            }
            inImports = currentKey === "imports";
          }
          continue;
        }
        if (inNestedObject && currentKey) {
          const nestedMatch = line.match(/^\s+(\$?\w+):\s*(.*)$/);
          if (nestedMatch) {
            result[currentKey][nestedMatch[1]] = nestedMatch[2].trim();
            continue;
          }
        }
        if (inImports) {
          const pathMatch = line.match(/^\s+-\s+path:\s*(.+)$/);
          if (pathMatch) {
            if (currentImport) {
              result[currentKey].push(currentImport);
            }
            currentImport = { path: pathMatch[1].trim().replace(/^["']|["']$/g, "") };
            continue;
          }
          const skillsMatch = line.match(/^\s+skills:\s*\[([^\]]*)\]$/);
          if (skillsMatch && currentImport) {
            currentImport.skills = skillsMatch[1] ? skillsMatch[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter((s) => s) : [];
            continue;
          }
          const aliasKeyMatch = line.match(/^\s+alias:\s*$/);
          if (aliasKeyMatch && currentImport) {
            currentImport.alias = {};
            continue;
          }
          const aliasEntryMatch = line.match(/^\s+([a-z-]+):\s*(.+)$/);
          if (aliasEntryMatch && currentImport && currentImport.alias !== void 0) {
            currentImport.alias[aliasEntryMatch[1]] = aliasEntryMatch[2].trim();
            continue;
          }
        }
        const arrayMatch = line.match(/^\s+-\s+(.+)$/);
        if (arrayMatch && inArray && Array.isArray(result[currentKey]) && !inImports) {
          result[currentKey].push(arrayMatch[1]);
        }
      }
      if (inImports && currentImport) {
        result[currentKey].push(currentImport);
      }
      return result;
    }
    // v0.2: Parse import declarations from frontmatter
    parseImports(importsData) {
      if (!importsData || !Array.isArray(importsData)) {
        return [];
      }
      return importsData.map((imp) => ({
        kind: "ImportDeclaration",
        path: imp.path || "",
        skills: imp.skills || [],
        aliases: new Map(Object.entries(imp.alias || {})),
        span: createSpan(1, 0, 0, 1, 0, 0)
      }));
    }
    // v0.9: Parse types from frontmatter
    parseFrontmatterTypes(typesYaml) {
      if (!typesYaml || typeof typesYaml !== "object") return [];
      return Object.entries(typesYaml).map(([name, def]) => ({
        kind: "FrontmatterTypeDecl",
        name: name.replace(/^\$/, ""),
        typeExpr: this.parseTypeExprFromString(String(def)),
        span: createSpan(1, 0, 0, 1, 0, 0)
      }));
    }
    // v0.9: Parse input params from frontmatter
    parseFrontmatterInput(inputYaml) {
      if (!inputYaml || typeof inputYaml !== "object") return [];
      return Object.entries(inputYaml).map(([name, def]) => {
        const defStr = String(def);
        const hasDefault = defStr.includes("=");
        const [typeStr, defaultStr] = hasDefault ? defStr.split("=").map((s) => s.trim()) : [defStr.trim(), void 0];
        return {
          kind: "FrontmatterInputDecl",
          name: name.replace(/^\$/, ""),
          type: typeStr ? this.parseTypeExprFromString(typeStr) : void 0,
          defaultValue: defaultStr ? this.parseValueFromString(defaultStr) : void 0,
          required: !hasDefault,
          span: createSpan(1, 0, 0, 1, 0, 0)
        };
      });
    }
    // v0.9: Parse context vars from frontmatter
    parseFrontmatterContext(contextYaml) {
      if (!contextYaml || typeof contextYaml !== "object") return [];
      return Object.entries(contextYaml).map(([name, def]) => {
        const defStr = String(def);
        const hasInit = defStr.includes("=");
        const [typeStr, initStr] = hasInit ? defStr.split("=").map((s) => s.trim()) : [defStr.trim(), void 0];
        return {
          kind: "FrontmatterContextDecl",
          name: name.replace(/^\$/, ""),
          type: typeStr ? this.parseTypeExprFromString(typeStr) : void 0,
          initialValue: initStr ? this.parseValueFromString(initStr) : void 0,
          span: createSpan(1, 0, 0, 1, 0, 0)
        };
      });
    }
    parseTypeExprFromString(str) {
      const name = str.replace(/^\$/, "").replace(/\[\]$/, "");
      const isArray = str.endsWith("[]");
      const typeRef = {
        kind: "TypeReference",
        name,
        span: createSpan(1, 0, 0, 1, 0, 0)
      };
      if (isArray) {
        return { kind: "ArrayType", elementType: typeRef, span: typeRef.span };
      }
      return typeRef;
    }
    parseValueFromString(str) {
      if (str.startsWith('"') && str.endsWith('"')) {
        return { kind: "StringLiteral", value: str.slice(1, -1), span: createSpan(1, 0, 0, 1, 0, 0) };
      }
      if (!isNaN(Number(str))) {
        return { kind: "NumberLiteral", value: Number(str), span: createSpan(1, 0, 0, 1, 0, 0) };
      }
      if (str === "true" || str === "false") {
        return { kind: "BooleanLiteral", value: str === "true", span: createSpan(1, 0, 0, 1, 0, 0) };
      }
      if (str === "[]") {
        return { kind: "ArrayLiteral", elements: [], span: createSpan(1, 0, 0, 1, 0, 0) };
      }
      return { kind: "InlineText", text: str, span: createSpan(1, 0, 0, 1, 0, 0) };
    }
    // ==========================================================================
    // Sections
    // ==========================================================================
    parseSections() {
      const sections = [];
      while (!this.isAtEnd()) {
        this.skipNewlines();
        if (this.check("HEADING")) {
          sections.push(this.parseSection());
        } else if (!this.isAtEnd()) {
          const content = this.parseBlocks();
          if (content.length > 0) {
            const span = content[0].span;
            sections.push({
              kind: "Section",
              level: 0,
              title: "",
              anchor: "",
              content,
              span
            });
          }
        }
      }
      return sections;
    }
    parseSection() {
      const headingToken = this.advance();
      const headingMatch = headingToken.value.match(/^(#+)\s+(.+)$/);
      if (!headingMatch) {
        this.error("E015", "Invalid heading format");
        return this.createErrorSection(headingToken);
      }
      const level = headingMatch[1].length;
      const title = headingMatch[2];
      const anchor = title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
      this.skipNewlines();
      const content = this.parseBlocks();
      const span = content.length > 0 ? mergeSpans(headingToken.span, content[content.length - 1].span) : headingToken.span;
      return {
        kind: "Section",
        level,
        title,
        anchor,
        content,
        span
      };
    }
    createErrorSection(token) {
      return {
        kind: "Section",
        level: 1,
        title: "Error",
        anchor: "error",
        content: [],
        span: token.span
      };
    }
    // ==========================================================================
    // Blocks
    // ==========================================================================
    parseBlocks() {
      const blocks = [];
      while (!this.isAtEnd() && !this.check("HEADING")) {
        this.skipNewlines();
        if (this.isAtEnd() || this.check("HEADING")) break;
        const block = this.parseBlock();
        if (block) {
          blocks.push(block);
        }
      }
      return blocks;
    }
    parseBlock() {
      if (this.check("END")) {
        this.error("E001", "Unexpected END");
        this.advance();
        return null;
      }
      if (this.check("ELSE")) {
        this.error("E001", "Unexpected ELSE");
        this.advance();
        return null;
      }
      if (this.check("TYPE_IDENT")) {
        const lookahead = this.peek(1);
        if (lookahead?.type === "COLON") {
          const afterColon = this.peek(2);
          if (afterColon?.type !== "TYPE_IDENT") {
            return this.parseTypeDefinition();
          }
        }
      }
      if (this.check("DOLLAR_IDENT") || this.check("TYPE_IDENT")) {
        const lookahead = this.peek(1);
        if (lookahead?.type === "PUSH") {
          return this.parsePushStatement();
        }
        return this.parseVariableOrType();
      }
      if (this.check("FOR")) {
        return this.parseFor();
      }
      if (this.check("WHILE")) {
        return this.parseWhile();
      }
      if (this.check("IF")) {
        return this.parseIf();
      }
      if (this.check("BREAK")) {
        return this.parseBreak();
      }
      if (this.check("CONTINUE")) {
        return this.parseContinue();
      }
      if (this.check("RETURN")) {
        return this.parseReturnStatement();
      }
      if (this.check("ASYNC") || this.check("AWAIT")) {
        return this.parseDelegateStatement();
      }
      if (this.check("DO")) {
        return this.parseDoStatement();
      }
      if (this.check("DELEGATE")) {
        return this.parseDelegateStatement();
      }
      if (this.check("CODE_BLOCK_START")) {
        return this.parseCodeBlock();
      }
      if (this.check("HORIZONTAL_RULE")) {
        return this.parseHorizontalRule();
      }
      if (this.check("BLOCKQUOTE")) {
        return this.parseBlockquote();
      }
      if (this.check("UPPER_IDENT") && this.current().value === "USE") {
        return this.parseUseStatement();
      }
      if (this.check("UPPER_IDENT") && this.current().value === "EXECUTE") {
        return this.parseExecuteStatement();
      }
      if (this.check("UPPER_IDENT") && this.current().value === "GOTO") {
        return this.parseGotoStatement();
      }
      if (this.check("LOWER_IDENT") || this.check("UPPER_IDENT")) {
        const verb = this.current().value.toLowerCase();
        if (verb === "execute" || verb === "call" || verb === "run" || verb === "invoke" || verb === "delegate" || verb === "use") {
          const lookahead1 = this.peek(1);
          const lookahead2 = this.peek(2);
          const isRefToken = (t) => t?.type === "LINK" || t?.type === "ANCHOR";
          if (isRefToken(lookahead1) || lookahead1?.type === "LOWER_IDENT" && lookahead1.value === "to" && isRefToken(lookahead2)) {
            return this.parseDelegation();
          }
        }
      }
      if (!this.isAtEnd() && !this.check("HEADING") && !this.check("NEWLINE")) {
        return this.parseParagraph();
      }
      if (!this.isAtEnd()) {
        this.advance();
      }
      return null;
    }
    // ==========================================================================
    // Type Definitions
    // ==========================================================================
    parseTypeDefinition() {
      const nameToken = this.advance();
      const name = nameToken.value.slice(1);
      this.expect("COLON");
      const typeExpr = this.parseTypeExpr();
      return {
        kind: "TypeDefinition",
        name,
        typeExpr,
        span: mergeSpans(nameToken.span, typeExpr.span)
      };
    }
    parseTypeExpr() {
      const start = this.current();
      if (this.check("STRING")) {
        return this.parseEnumType();
      }
      if (this.check("LPAREN")) {
        return this.parseCompoundType();
      }
      if (this.check("TYPE_IDENT")) {
        const token = this.advance();
        const typeRef = {
          kind: "TypeReference",
          name: token.value.slice(1),
          span: token.span
        };
        if (this.check("LBRACKET")) {
          this.advance();
          this.expect("RBRACKET");
          return {
            kind: "ArrayType",
            elementType: typeRef,
            span: mergeSpans(token.span, this.previous().span)
          };
        }
        return typeRef;
      }
      return this.parseSemanticTypeDefinition();
    }
    parseEnumType() {
      const values = [];
      const start = this.current();
      while (this.check("STRING")) {
        const token = this.advance();
        values.push(token.value);
        if (this.check("PIPE")) {
          this.advance();
        } else {
          break;
        }
      }
      return {
        kind: "EnumType",
        values,
        span: mergeSpans(start.span, this.previous().span)
      };
    }
    parseCompoundType() {
      const start = this.advance();
      const elements = [];
      while (!this.check("RPAREN") && !this.isAtEnd()) {
        elements.push(this.parseTypeExpr());
        if (this.check("COMMA")) {
          this.advance();
        }
      }
      const end = this.expect("RPAREN");
      let result = {
        kind: "CompoundType",
        elements,
        span: mergeSpans(start.span, end?.span || this.previous().span)
      };
      if (this.check("LBRACKET")) {
        this.advance();
        this.expect("RBRACKET");
        return {
          kind: "ArrayType",
          elementType: result,
          span: mergeSpans(start.span, this.previous().span)
        };
      }
      return result;
    }
    parseSemanticTypeDefinition() {
      let description = "";
      const start = this.current();
      while (!this.check("NEWLINE") && !this.isAtEnd()) {
        const token = this.advance();
        if (description) description += " ";
        description += token.value;
      }
      return {
        kind: "SemanticType",
        description: description.trim(),
        span: mergeSpans(start.span, this.previous().span)
      };
    }
    parseSemanticText(stopTypes) {
      const start = this.current();
      const interpolations = [];
      let end = null;
      while (!this.isAtEnd() && !stopTypes.includes(this.current().type)) {
        const token = this.advance();
        end = token;
        if (token.type === "DOLLAR_IDENT") {
          interpolations.push({
            kind: "VariableReference",
            name: token.value.slice(1),
            span: token.span
          });
        }
      }
      if (!end) {
        return { content: "", span: start.span, interpolations: [] };
      }
      const content = this.source.slice(start.span.start.offset, end.span.end.offset).trim();
      return {
        content,
        span: mergeSpans(start.span, end.span),
        interpolations
      };
    }
    parseSemanticSpan(stopTypes) {
      const { content, span, interpolations } = this.parseSemanticText(stopTypes);
      return {
        kind: "SemanticMarker",
        content,
        interpolations,
        span
      };
    }
    parseSemanticTypeAnnotation(stopTypes) {
      const { content, span } = this.parseSemanticText(stopTypes);
      return {
        kind: "SemanticType",
        description: content,
        span
      };
    }
    // ==========================================================================
    // Variables
    // ==========================================================================
    parseVariableOrType() {
      if (this.check("TYPE_IDENT")) {
        const lookahead = this.peek(1);
        if (lookahead?.type === "COLON") {
          const afterColon = this.peek(2);
          if (afterColon?.type !== "TYPE_IDENT") {
            return this.parseTypeDefinition();
          }
        }
      }
      return this.parseVariableDeclaration();
    }
    parseVariableDeclaration(inWithClause = false) {
      const nameToken = this.advance();
      const name = nameToken.value.slice(1);
      let typeAnnotation = null;
      let isRequired = false;
      if (this.check("COLON")) {
        this.advance();
        if (this.check("TYPE_IDENT")) {
          const typeToken = this.advance();
          typeAnnotation = {
            kind: "TypeReference",
            name: typeToken.value.slice(1),
            span: typeToken.span
          };
        } else {
          typeAnnotation = this.parseSemanticTypeAnnotation(["ASSIGN", "NEWLINE", "END", "ELSE"]);
        }
      }
      let value = null;
      let isLambda = false;
      if (this.check("ASSIGN")) {
        this.advance();
        if (this.check("DOLLAR_IDENT") || this.check("LPAREN")) {
          const afterParams = this.findArrow();
          if (afterParams) {
            isLambda = true;
            value = this.parseLambdaExpression();
          } else {
            value = this.parseExpression();
          }
        } else {
          value = this.parseExpression();
        }
      } else if (inWithClause && typeAnnotation) {
        isRequired = true;
      }
      return {
        kind: "VariableDeclaration",
        name,
        typeAnnotation,
        value,
        isLambda,
        isRequired,
        span: mergeSpans(nameToken.span, value?.span || typeAnnotation?.span || nameToken.span)
      };
    }
    findArrow() {
      let i = 0;
      let depth = 0;
      while (i < 10) {
        const token = this.peek(i);
        if (!token) return false;
        if (token.type === "LPAREN") depth++;
        if (token.type === "RPAREN") depth--;
        if (token.type === "ARROW" && depth === 0) return true;
        if (token.type === "NEWLINE") return false;
        i++;
      }
      return false;
    }
    // ==========================================================================
    // Expressions
    // ==========================================================================
    parseExpression() {
      return this.parseOr();
    }
    parseOr() {
      let left = this.parseAnd();
      while (this.check("OR")) {
        this.advance();
        const right = this.parseAnd();
        left = {
          kind: "BinaryExpression",
          operator: "OR",
          left,
          right,
          span: mergeSpans(left.span, right.span)
        };
      }
      return left;
    }
    parseAnd() {
      let left = this.parseComparison();
      while (this.check("AND")) {
        this.advance();
        const right = this.parseComparison();
        left = {
          kind: "BinaryExpression",
          operator: "AND",
          left,
          right,
          span: mergeSpans(left.span, right.span)
        };
      }
      return left;
    }
    parseComparison() {
      let left = this.parsePrimary();
      const compOps = ["ASSIGN", "NEQ", "LT", "GT", "LTE", "GTE"];
      while (compOps.some((op) => this.check(op))) {
        const opToken = this.advance();
        const op = this.tokenToOperator(opToken.type);
        const right = this.parsePrimary();
        left = {
          kind: "BinaryExpression",
          operator: op,
          left,
          right,
          span: mergeSpans(left.span, right.span)
        };
      }
      return left;
    }
    tokenToOperator(type) {
      switch (type) {
        case "ASSIGN":
          return "=";
        case "NEQ":
          return "!=";
        case "LT":
          return "<";
        case "GT":
          return ">";
        case "LTE":
          return "<=";
        case "GTE":
          return ">=";
        default:
          return "=";
      }
    }
    parsePrimary() {
      const token = this.current();
      if ((this.check("DOLLAR_IDENT") || this.check("LPAREN")) && this.findArrow()) {
        return this.parseLambdaExpression();
      }
      if (this.check("NOT")) {
        const notToken = this.advance();
        const operand = this.parsePrimary();
        return {
          kind: "UnaryExpression",
          operator: "NOT",
          operand,
          span: mergeSpans(notToken.span, operand.span)
        };
      }
      if (this.check("LPAREN")) {
        this.advance();
        const expr = this.parseExpression();
        this.expect("RPAREN");
        return expr;
      }
      if (this.check("STRING")) {
        const stringToken = this.advance();
        return { kind: "StringLiteral", value: stringToken.value, span: stringToken.span };
      }
      if (this.check("NUMBER")) {
        const numToken = this.advance();
        return { kind: "NumberLiteral", value: parseFloat(numToken.value), span: numToken.span };
      }
      if (this.check("TRUE")) {
        const boolToken = this.advance();
        return { kind: "BooleanLiteral", value: true, span: boolToken.span };
      }
      if (this.check("FALSE")) {
        const boolToken = this.advance();
        return { kind: "BooleanLiteral", value: false, span: boolToken.span };
      }
      if (this.check("LBRACKET")) {
        return this.parseArrayLiteral();
      }
      if (this.check("TEMPLATE_START")) {
        return this.parseTemplateLiteral();
      }
      if (this.check("LINK")) {
        return this.parseLink();
      }
      if (this.check("ANCHOR")) {
        return this.parseAnchor();
      }
      if (this.check("INFERRED_VAR")) {
        return this.parseInferredVariable();
      }
      if (this.check("DOLLAR_IDENT") || this.check("TYPE_IDENT")) {
        return this.parseVariableReference();
      }
      if (this.check("LOWER_IDENT") || this.check("UPPER_IDENT") || this.check("TEXT")) {
        return this.parseInlineText();
      }
      if (!this.isAtEnd()) {
        const errorToken = this.advance();
        this.error("E001", `Unexpected token: ${errorToken.type}`);
        return { kind: "InlineText", text: errorToken.value, span: errorToken.span };
      }
      return { kind: "InlineText", text: "", span: token?.span || createSpan(1, 0, 0, 1, 0, 0) };
    }
    parseLambdaExpression() {
      const start = this.current();
      const params = [];
      if (this.check("LPAREN")) {
        this.advance();
        while (!this.check("RPAREN") && !this.isAtEnd()) {
          if (this.check("DOLLAR_IDENT")) {
            params.push(this.advance().value.slice(1));
          }
          if (this.check("COMMA")) {
            this.advance();
          }
        }
        this.expect("RPAREN");
      } else if (this.check("DOLLAR_IDENT")) {
        params.push(this.advance().value.slice(1));
      }
      this.expect("ARROW");
      const body = this.parseExpression();
      return {
        kind: "LambdaExpression",
        params,
        body,
        span: mergeSpans(start.span, body.span)
      };
    }
    parseArrayLiteral() {
      const start = this.advance();
      const elements = [];
      while (!this.check("RBRACKET") && !this.isAtEnd()) {
        elements.push(this.parseExpression());
        if (this.check("COMMA")) {
          this.advance();
        }
      }
      const end = this.expect("RBRACKET");
      return {
        kind: "ArrayLiteral",
        elements,
        span: mergeSpans(start.span, end?.span || this.previous().span)
      };
    }
    parseTemplateLiteral() {
      const start = this.advance();
      const parts = [];
      while (!this.check("TEMPLATE_END") && !this.isAtEnd()) {
        if (this.check("TEMPLATE_PART")) {
          parts.push(this.advance().value);
        } else if (this.check("DOLLAR_IDENT")) {
          const varToken = this.advance();
          parts.push({
            kind: "VariableReference",
            name: varToken.value.slice(1),
            span: varToken.span
          });
        } else if (this.check("INFERRED_VAR")) {
          parts.push(this.parseInferredVariable());
        } else {
          this.advance();
        }
      }
      const end = this.expect("TEMPLATE_END");
      return {
        kind: "TemplateLiteral",
        parts,
        span: mergeSpans(start.span, end?.span || this.previous().span)
      };
    }
    // v0.8: Parse ~/path/to/file or ~/path/to/file#anchor link reference
    parseLink() {
      const token = this.expect("LINK");
      if (!token) {
        return {
          kind: "Link",
          path: [],
          anchor: null,
          raw: "",
          span: this.current().span
        };
      }
      const parsed = JSON.parse(token.value);
      const raw = "~/" + parsed.path.join("/") + (parsed.anchor ? "#" + parsed.anchor : "");
      return {
        kind: "Link",
        path: parsed.path,
        anchor: parsed.anchor,
        raw,
        span: token.span
      };
    }
    // v0.8: Parse #section anchor reference
    parseAnchor() {
      const token = this.expect("ANCHOR");
      if (!token) {
        return {
          kind: "Anchor",
          name: "",
          span: this.current().span
        };
      }
      return {
        kind: "Anchor",
        name: token.value,
        span: token.span
      };
    }
    parseInferredVariable() {
      const token = this.advance();
      const name = token.value.slice(2, -1);
      return {
        kind: "InferredVariable",
        name,
        span: token.span
      };
    }
    parseVariableReference() {
      const varToken = this.advance();
      const name = varToken.value.slice(1);
      let expr = {
        kind: "VariableReference",
        name,
        span: varToken.span
      };
      while (this.check("DOT")) {
        this.advance();
        if (this.check("LOWER_IDENT") || this.check("UPPER_IDENT")) {
          const propToken = this.advance();
          expr = {
            kind: "MemberAccess",
            object: expr,
            property: propToken.value,
            span: mergeSpans(varToken.span, propToken.span)
          };
        }
      }
      if (this.check("LPAREN")) {
        this.advance();
        const args = [];
        while (!this.check("RPAREN") && !this.isAtEnd()) {
          args.push(this.parseExpression());
          if (this.check("COMMA")) {
            this.advance();
          }
        }
        const end = this.expect("RPAREN");
        expr = {
          kind: "FunctionCall",
          callee: expr,
          args,
          span: mergeSpans(varToken.span, end?.span || this.previous().span)
        };
      }
      return expr;
    }
    parseInlineText() {
      let text = "";
      const start = this.current();
      while (!this.isAtEnd() && !this.check("NEWLINE") && // v0.8: link-based references
      !this.check("LINK") && !this.check("ANCHOR") && !this.check("INFERRED_VAR") && !this.check("DOLLAR_IDENT") && !this.check("TYPE_IDENT")) {
        if (text) text += " ";
        text += this.advance().value;
      }
      return {
        kind: "InlineText",
        text: text.trim(),
        span: mergeSpans(start.span, this.previous().span)
      };
    }
    // ==========================================================================
    // Control Flow
    // ==========================================================================
    parseFor() {
      const start = this.advance();
      const pattern = this.parsePattern();
      this.expect("IN");
      const collection = this.parseExpression();
      if (this.check("DO")) {
        this.advance();
      }
      this.expect("NEWLINE");
      this.skipNewlines();
      this.loopDepth++;
      this.blockDepth++;
      const body = this.parseBlockBody(["END"]);
      this.blockDepth--;
      this.loopDepth--;
      const end = this.expect("END");
      this.skipNewlines();
      return {
        kind: "ForEachStatement",
        pattern,
        collection,
        body,
        span: mergeSpans(start.span, end?.span || (body.length > 0 ? body[body.length - 1].span : collection.span))
      };
    }
    parseWhile() {
      const start = this.advance();
      const condition = this.parseCondition();
      if (this.check("DO")) {
        this.advance();
      }
      this.expect("NEWLINE");
      this.skipNewlines();
      this.loopDepth++;
      this.blockDepth++;
      const body = this.parseBlockBody(["END"]);
      this.blockDepth--;
      this.loopDepth--;
      const end = this.expect("END");
      this.skipNewlines();
      return {
        kind: "WhileStatement",
        condition,
        body,
        span: mergeSpans(start.span, end?.span || (body.length > 0 ? body[body.length - 1].span : condition.span))
      };
    }
    parseIf() {
      const start = this.advance();
      const condition = this.parseCondition();
      if (this.check("THEN")) {
        this.advance();
      }
      this.expect("NEWLINE");
      this.skipNewlines();
      this.blockDepth++;
      const thenBody = this.parseBlockBody(["ELSE", "END"]);
      const elseIf = [];
      let elseBody = null;
      while (this.check("ELSE")) {
        const elseStart = this.current();
        this.advance();
        if (this.check("IF")) {
          this.advance();
          const elseIfCondition = this.parseCondition();
          if (this.check("THEN")) {
            this.advance();
          }
          this.expect("NEWLINE");
          this.skipNewlines();
          const elseIfBody = this.parseBlockBody(["ELSE", "END"]);
          elseIf.push({
            condition: elseIfCondition,
            body: elseIfBody,
            span: mergeSpans(
              elseStart.span,
              elseIfBody.length > 0 ? elseIfBody[elseIfBody.length - 1].span : elseIfCondition.span
            )
          });
        } else {
          this.expect("NEWLINE");
          this.skipNewlines();
          elseBody = this.parseBlockBody(["END"]);
          break;
        }
      }
      this.blockDepth--;
      const end = this.expect("END");
      this.skipNewlines();
      let endSpan = end?.span || condition.span;
      if (elseBody?.length) {
        endSpan = elseBody[elseBody.length - 1].span;
      } else if (elseIf.length > 0) {
        endSpan = elseIf[elseIf.length - 1].span;
      } else if (thenBody.length) {
        endSpan = thenBody[thenBody.length - 1].span;
      }
      return {
        kind: "IfStatement",
        condition,
        thenBody,
        elseIf,
        elseBody,
        span: mergeSpans(start.span, endSpan)
      };
    }
    // v0.2: BREAK statement
    parseBreak() {
      const token = this.advance();
      if (this.loopDepth === 0) {
        this.error("E016", "BREAK can only be used inside a loop");
      }
      return {
        kind: "BreakStatement",
        span: token.span
      };
    }
    // v0.2: CONTINUE statement
    parseContinue() {
      const token = this.advance();
      if (this.loopDepth === 0) {
        this.error("E017", "CONTINUE can only be used inside a loop");
      }
      return {
        kind: "ContinueStatement",
        span: token.span
      };
    }
    // v0.9: RETURN statement
    parseReturnStatement() {
      const token = this.advance();
      let value;
      if (!this.check("NEWLINE") && !this.isAtEnd() && !this.check("END") && !this.check("ELSE")) {
        value = this.parseExpression();
      }
      return {
        kind: "ReturnStatement",
        value,
        span: value ? mergeSpans(token.span, value.span) : token.span
      };
    }
    // v0.9: Push statement ($array << value)
    parsePushStatement() {
      const target = this.parseVariableReference();
      this.expect("PUSH");
      const value = this.parseExpression();
      return {
        kind: "PushStatement",
        target,
        value,
        span: mergeSpans(target.span, value.span)
      };
    }
    // v0.9/v0.10: DO instruction (standalone or block)
    parseDoStatement() {
      const token = this.advance();
      if (!this.check("NEWLINE")) {
        if (this.blockDepth > 0) {
          this.error("E005", "Single-line DO is only valid at top level");
        }
        const instruction = this.parseSemanticSpan(["NEWLINE", "EOF"]);
        return {
          kind: "DoStatement",
          instruction,
          span: mergeSpans(token.span, instruction.span)
        };
      }
      this.expect("NEWLINE");
      this.skipNewlines();
      this.blockDepth++;
      const body = this.parseBlockBody(["END"]);
      this.blockDepth--;
      const end = this.expect("END");
      this.skipNewlines();
      return {
        kind: "DoStatement",
        body,
        span: mergeSpans(token.span, end?.span || (body.length > 0 ? body[body.length - 1].span : token.span))
      };
    }
    // v0.9: DELEGATE statement for agent delegation
    // Syntax: [ASYNC|AWAIT] DELEGATE [/task/] [TO ~/agent/x] [WITH #template | WITH: params]
    parseDelegateStatement() {
      const start = this.current();
      let async = false;
      let awaited = false;
      if (this.check("ASYNC")) {
        async = true;
        this.advance();
      } else if (this.check("AWAIT")) {
        awaited = true;
        this.advance();
      }
      this.expect("DELEGATE");
      let task;
      const taskStopTokens = ["TO", "WITH", "COLON", "NEWLINE", "END", "EOF"];
      if (!taskStopTokens.includes(this.current().type)) {
        task = this.parseSemanticSpan(taskStopTokens);
      }
      let target;
      if (this.check("TO")) {
        this.advance();
        target = this.parseLink();
      }
      let withAnchor;
      let parameters;
      if (this.check("WITH")) {
        this.advance();
        if (this.check("COLON")) {
          parameters = this.parseParameterBlock();
        } else if (this.check("ANCHOR")) {
          withAnchor = this.parseAnchor();
        }
      } else if (this.check("COLON")) {
        parameters = this.parseParameterBlock();
      }
      return {
        kind: "DelegateStatement",
        task,
        target,
        withAnchor,
        parameters,
        async,
        awaited,
        span: mergeSpans(start.span, this.previous().span)
      };
    }
    // v0.8: USE statement for skill activation
    // Syntax: USE ~/skill/x TO task
    parseUseStatement() {
      const start = this.advance();
      const link = this.parseLink();
      this.expect("TO");
      const task = this.parseSemanticSpan(["COLON", "NEWLINE", "EOF"]);
      let parameters;
      if (this.check("COLON")) {
        parameters = this.parseParameterBlock();
      }
      return {
        kind: "UseStatement",
        link,
        task,
        parameters,
        span: mergeSpans(start.span, this.previous().span)
      };
    }
    // v0.8: EXECUTE statement for tool invocation
    // Syntax: EXECUTE ~/tool/x TO action
    parseExecuteStatement() {
      const start = this.advance();
      const link = this.parseLink();
      this.expect("TO");
      const task = this.parseSemanticSpan(["NEWLINE", "EOF"]);
      return {
        kind: "ExecuteStatement",
        link,
        task,
        span: mergeSpans(start.span, this.previous().span)
      };
    }
    // v0.8: GOTO statement for same-file navigation
    // Syntax: GOTO #section
    parseGotoStatement() {
      const start = this.advance();
      const anchor = this.parseAnchor();
      return {
        kind: "GotoStatement",
        anchor,
        span: mergeSpans(start.span, anchor.span)
      };
    }
    // v0.8: Parse parameter block
    parseParameterBlock() {
      const start = this.advance();
      this.skipNewlines();
      const parameters = [];
      while ((this.check("LOWER_IDENT") || this.check("UPPER_IDENT") || this.check("DOLLAR_IDENT")) && !this.isAtEnd()) {
        const nameToken = this.advance();
        const name = nameToken.type === "DOLLAR_IDENT" ? nameToken.value.slice(1) : nameToken.value;
        this.expect("COLON");
        let value = null;
        let isRequired = false;
        if (!this.check("NEWLINE") && !this.check("END") && !this.check("ELSE") && !this.isAtEnd()) {
          value = this.parseExpression();
        } else {
          isRequired = true;
        }
        parameters.push({
          kind: "VariableDeclaration",
          name,
          typeAnnotation: null,
          value,
          isLambda: false,
          isRequired,
          span: mergeSpans(nameToken.span, value?.span || nameToken.span)
        });
        this.skipNewlines();
      }
      return {
        kind: "ParameterBlock",
        parameters,
        span: mergeSpans(start.span, this.previous().span)
      };
    }
    parsePattern() {
      if (this.check("LPAREN")) {
        const start = this.advance();
        const names = [];
        while (!this.check("RPAREN") && !this.isAtEnd()) {
          if (this.check("DOLLAR_IDENT")) {
            names.push(this.advance().value.slice(1));
          }
          if (this.check("COMMA")) {
            this.advance();
          }
        }
        const end = this.expect("RPAREN");
        return {
          kind: "DestructuringPattern",
          names,
          span: mergeSpans(start.span, end?.span || this.previous().span)
        };
      }
      if (this.check("DOLLAR_IDENT")) {
        const token = this.advance();
        return {
          kind: "SimplePattern",
          name: token.value.slice(1),
          span: token.span
        };
      }
      this.error("E005", "Expected pattern");
      return {
        kind: "SimplePattern",
        name: "",
        span: this.current().span
      };
    }
    parseCondition() {
      return this.parseOrCondition();
    }
    isConditionStop(type) {
      return ["AND", "OR", "THEN", "DO", "NEWLINE", "END", "ELSE", "EOF"].includes(type);
    }
    hasComparisonOperatorAhead() {
      let sawVariable = false;
      let i = 0;
      while (true) {
        const token = this.peek(i);
        if (!token) return false;
        if (this.isConditionStop(token.type)) {
          return false;
        }
        if (token.type === "DOLLAR_IDENT" || token.type === "TYPE_IDENT") {
          sawVariable = true;
        }
        if (sawVariable && ["ASSIGN", "NEQ", "LT", "GT", "LTE", "GTE"].includes(token.type)) {
          return true;
        }
        i += 1;
      }
    }
    parseSemanticConditionSpan(negated) {
      const { content, span } = this.parseSemanticText(["AND", "OR", "THEN", "DO", "NEWLINE", "END", "ELSE", "EOF"]);
      return {
        kind: "SemanticCondition",
        text: content,
        negated,
        span
      };
    }
    parseOrCondition() {
      let left = this.parseAndCondition();
      while (this.check("OR")) {
        this.advance();
        const right = this.parseAndCondition();
        left = {
          kind: "CompoundCondition",
          operator: "OR",
          left,
          right,
          span: mergeSpans(left.span, right.span)
        };
      }
      return left;
    }
    parseAndCondition() {
      let left = this.parsePrimaryCondition();
      while (this.check("AND")) {
        this.advance();
        const right = this.parsePrimaryCondition();
        left = {
          kind: "CompoundCondition",
          operator: "AND",
          left,
          right,
          span: mergeSpans(left.span, right.span)
        };
      }
      return left;
    }
    parsePrimaryCondition() {
      const negated = this.check("NOT");
      if (negated) {
        this.advance();
      }
      if (this.check("LPAREN")) {
        this.advance();
        const cond = this.parseCondition();
        this.expect("RPAREN");
        return cond;
      }
      if ((this.check("DOLLAR_IDENT") || this.check("TYPE_IDENT")) && this.hasComparisonOperatorAhead()) {
        const left = this.parseVariableReference();
        if (this.check("ASSIGN") || this.check("NEQ") || this.check("LT") || this.check("GT") || this.check("LTE") || this.check("GTE")) {
          const opToken = this.advance();
          const op = this.tokenToOperator(opToken.type);
          const right = this.parsePrimary();
          return {
            kind: "DeterministicCondition",
            left,
            operator: op,
            right,
            span: mergeSpans(left.span, right.span)
          };
        }
      }
      return this.parseSemanticConditionSpan(negated);
    }
    parseBlockBody(stopTypes) {
      const blocks = [];
      while (!this.isAtEnd() && !this.check("HEADING")) {
        if (stopTypes.includes(this.current().type)) {
          break;
        }
        this.skipNewlines();
        if (this.isAtEnd() || this.check("HEADING") || stopTypes.includes(this.current().type)) break;
        const block = this.parseBlock();
        if (block) {
          blocks.push(block);
        }
      }
      return blocks;
    }
    // ==========================================================================
    // Prose Content
    // ==========================================================================
    parseParagraph() {
      const content = [];
      const start = this.current();
      while (!this.isAtEnd() && !this.check("NEWLINE") && !this.check("HEADING")) {
        if (this.check("LINK")) {
          content.push(this.parseLink());
        } else if (this.check("ANCHOR")) {
          content.push(this.parseAnchor());
        } else if (this.check("INFERRED_VAR")) {
          content.push(this.parseInferredVariable());
        } else if (this.check("DOLLAR_IDENT") || this.check("TYPE_IDENT")) {
          const varToken = this.advance();
          content.push({
            kind: "VariableReference",
            name: varToken.value.slice(1),
            span: varToken.span
          });
        } else {
          const textContent = this.parseInlineText();
          if (textContent.text) {
            content.push(textContent);
          }
        }
      }
      if (this.check("NEWLINE")) {
        this.advance();
      }
      return {
        kind: "Paragraph",
        content,
        span: mergeSpans(start.span, this.previous().span)
      };
    }
    parseCodeBlock() {
      const start = this.advance();
      const langMatch = start.value.match(/^```(\w*)$/);
      const language = langMatch?.[1] || null;
      let content = "";
      if (this.check("CODE_BLOCK_CONTENT")) {
        content = this.advance().value;
      }
      const end = this.expect("CODE_BLOCK_END");
      return {
        kind: "CodeBlock",
        language,
        content,
        span: mergeSpans(start.span, end?.span || this.previous().span)
      };
    }
    parseHorizontalRule() {
      const token = this.advance();
      return { kind: "HorizontalRule", span: token.span };
    }
    parseDelegation() {
      const verbToken = this.advance();
      const verb = verbToken.value;
      if (this.check("LOWER_IDENT") && this.current().value === "to") {
        this.advance();
      }
      let target;
      if (this.check("LINK")) {
        target = this.parseLink();
      } else if (this.check("ANCHOR")) {
        target = this.parseAnchor();
      } else {
        this.error("E001", "Expected link reference (~/path) or anchor reference (#name)");
        target = {
          kind: "Anchor",
          name: "",
          span: this.current().span
        };
      }
      const parameters = [];
      if (this.check("WITH")) {
        this.advance();
        if (this.check("COLON")) {
          const paramBlock = this.parseParameterBlock();
          parameters.push(...paramBlock.parameters);
        }
      }
      const span = mergeSpans(verbToken.span, this.previous().span);
      return {
        kind: "Delegation",
        verb,
        target,
        parameters,
        span
      };
    }
    parseBlockquote() {
      const token = this.advance();
      const content = token.value.slice(1).trim();
      return {
        kind: "Paragraph",
        content: [{ kind: "InlineText", text: content, span: token.span }],
        span: token.span
      };
    }
    // ==========================================================================
    // Helpers
    // ==========================================================================
    isAtEnd() {
      return this.pos >= this.tokens.length || this.current().type === "EOF";
    }
    current() {
      return this.tokens[this.pos] || {
        type: "EOF",
        value: "",
        span: createSpan(1, 0, 0, 1, 0, 0)
      };
    }
    previous() {
      return this.tokens[this.pos - 1] || this.current();
    }
    peek(offset = 0) {
      const idx = this.pos + offset;
      return idx < this.tokens.length ? this.tokens[idx] : null;
    }
    advance() {
      if (!this.isAtEnd()) {
        this.pos++;
      }
      return this.previous();
    }
    check(type) {
      return this.current().type === type;
    }
    expect(type) {
      if (this.check(type)) {
        return this.advance();
      }
      this.error("E001", `Expected ${type}, got ${this.current().type}`);
      return null;
    }
    skipNewlines() {
      while (this.check("NEWLINE")) {
        this.advance();
      }
    }
    error(code, message) {
      this.errors.push({
        kind: "ParseError",
        code,
        message,
        recoverable: true,
        span: this.current().span
      });
    }
  };
  function parse(source) {
    return new Parser(source).parse();
  }

  // ../packages/core/src/typecheck/typecheck.ts
  var DEFAULT_MAX_DEPTH = 12;
  var BUILTIN_TYPES = /* @__PURE__ */ new Set(["String", "Number", "Boolean", "FilePath", "Any"]);
  function isBuiltinTypeName(name) {
    return BUILTIN_TYPES.has(name);
  }
  var ANY_TYPE = {
    kind: "SemanticType",
    description: "any",
    span: createSpan(0, 0, 0, 0, 0, 0)
  };
  function makeAnyType() {
    return {
      kind: "SemanticType",
      description: "any",
      span: createSpan(0, 0, 0, 0, 0, 0)
    };
  }
  function normalizeEnumValues(values) {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }
  function isAnyType(expr) {
    if (expr.kind === "SemanticType") {
      return true;
    }
    return expr.kind === "TypeReference" && expr.name === "Any";
  }
  function buildTypeEnv(types, extra = /* @__PURE__ */ new Map()) {
    const env = new Map(extra);
    for (const typeDef of types) {
      env.set(typeDef.name, typeDef.typeExpr);
    }
    return env;
  }
  function resolveType(expr, env, options = {}) {
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    const visited = /* @__PURE__ */ new Set();
    const resolve = (current, depth) => {
      if (depth > maxDepth) {
        return current;
      }
      if (current.kind === "TypeReference") {
        if (BUILTIN_TYPES.has(current.name)) {
          return current;
        }
        const next = env.get(current.name);
        if (!next) {
          return current;
        }
        if (visited.has(current.name)) {
          return current;
        }
        visited.add(current.name);
        return resolve(next, depth + 1);
      }
      if (current.kind === "ArrayType") {
        return {
          ...current,
          elementType: resolve(current.elementType, depth + 1)
        };
      }
      if (current.kind === "CompoundType") {
        return {
          ...current,
          elements: current.elements.map((element) => resolve(element, depth + 1))
        };
      }
      if (current.kind === "FunctionType") {
        return {
          ...current,
          returnType: resolve(current.returnType, depth + 1)
        };
      }
      return current;
    };
    return resolve(expr, 0);
  }
  function normalizeType(expr) {
    if (expr.kind === "EnumType") {
      return {
        ...expr,
        values: normalizeEnumValues(expr.values)
      };
    }
    if (expr.kind === "ArrayType") {
      return {
        ...expr,
        elementType: normalizeType(expr.elementType)
      };
    }
    if (expr.kind === "CompoundType") {
      return {
        ...expr,
        elements: expr.elements.map((element) => normalizeType(element))
      };
    }
    if (expr.kind === "FunctionType") {
      return {
        ...expr,
        returnType: normalizeType(expr.returnType)
      };
    }
    return expr;
  }
  function isCompatible(candidate, expected, env, options = {}) {
    const resolvedCandidate = normalizeType(resolveType(candidate, env, options));
    const resolvedExpected = normalizeType(resolveType(expected, env, options));
    if (isAnyType(resolvedExpected) || isAnyType(resolvedCandidate)) {
      return { compatible: true };
    }
    if (resolvedExpected.kind === "TypeReference" && resolvedCandidate.kind === "TypeReference") {
      if (resolvedExpected.name === resolvedCandidate.name) {
        return { compatible: true };
      }
    }
    if (resolvedExpected.kind !== resolvedCandidate.kind) {
      return { compatible: false, reason: "kind-mismatch" };
    }
    switch (resolvedExpected.kind) {
      case "SemanticType":
        return {
          compatible: resolvedExpected.description === resolvedCandidate.description,
          reason: "semantic-mismatch"
        };
      case "EnumType": {
        const expectedValues = new Set(resolvedExpected.values);
        const candidateValues = resolvedCandidate.values;
        const missing = candidateValues.filter((value) => !expectedValues.has(value));
        if (missing.length > 0) {
          return { compatible: false, reason: "enum-subset" };
        }
        return { compatible: true };
      }
      case "ArrayType":
        return isCompatible(
          resolvedCandidate.elementType,
          resolvedExpected.elementType,
          env,
          options
        );
      case "CompoundType": {
        const expectedElements = resolvedExpected.elements;
        const candidateElements = resolvedCandidate.elements;
        if (expectedElements.length !== candidateElements.length) {
          return { compatible: false, reason: "tuple-length" };
        }
        for (let i = 0; i < expectedElements.length; i += 1) {
          const result = isCompatible(candidateElements[i], expectedElements[i], env, options);
          if (!result.compatible) {
            return result;
          }
        }
        return { compatible: true };
      }
      case "FunctionType": {
        const expectedFn = resolvedExpected;
        const candidateFn = resolvedCandidate;
        if (expectedFn.params.length !== candidateFn.params.length) {
          return { compatible: false, reason: "function-arity" };
        }
        for (let i = 0; i < expectedFn.params.length; i += 1) {
          if (expectedFn.params[i] !== candidateFn.params[i]) {
            return { compatible: false, reason: "function-params" };
          }
        }
        const returnCompat = isCompatible(candidateFn.returnType, expectedFn.returnType, env, options);
        if (!returnCompat.compatible) {
          return { compatible: false, reason: "function-return" };
        }
        return { compatible: true };
      }
      case "TypeReference":
        return {
          compatible: resolvedExpected.name === resolvedCandidate.name,
          reason: "reference-mismatch"
        };
      default:
        return { compatible: false, reason: "unknown" };
    }
  }
  function inferType(expr, env, options = {}) {
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    const resolveOptions = { maxDepth };
    const infer = (node, depth) => {
      if (depth > maxDepth) {
        return ANY_TYPE;
      }
      switch (node.kind) {
        case "StringLiteral":
          return { kind: "TypeReference", name: "String", span: node.span };
        case "NumberLiteral":
          return { kind: "TypeReference", name: "Number", span: node.span };
        case "BooleanLiteral":
          return { kind: "TypeReference", name: "Boolean", span: node.span };
        case "ArrayLiteral": {
          if (node.elements.length === 0) {
            return { kind: "ArrayType", elementType: ANY_TYPE, span: node.span };
          }
          const elementTypes = node.elements.map((element) => infer(element, depth + 1));
          let current = elementTypes[0];
          for (let i = 1; i < elementTypes.length; i += 1) {
            if (!isCompatible(elementTypes[i], current, env, resolveOptions).compatible) {
              current = ANY_TYPE;
              break;
            }
          }
          return { kind: "ArrayType", elementType: current, span: node.span };
        }
        case "LambdaExpression": {
          const returnType = infer(node.body, depth + 1);
          return {
            kind: "FunctionType",
            params: node.params,
            returnType,
            span: node.span
          };
        }
        case "VariableReference": {
          const type = env.get(node.name);
          if (type) {
            return resolveType(type, env, resolveOptions);
          }
          return ANY_TYPE;
        }
        case "MemberAccess":
          return ANY_TYPE;
        case "FunctionCall":
          return ANY_TYPE;
        case "TemplateLiteral":
          return { kind: "TypeReference", name: "String", span: node.span };
        case "InlineText":
          return ANY_TYPE;
        case "Link":
        case "Anchor":
        case "InferredVariable":
        case "BinaryExpression":
        case "UnaryExpression":
          return ANY_TYPE;
        default:
          return ANY_TYPE;
      }
    };
    return normalizeType(resolveType(infer(expr, 0), env, resolveOptions));
  }
  function makeTypeReference(name) {
    return {
      kind: "TypeReference",
      name,
      span: createSpan(0, 0, 0, 0, 0, 0)
    };
  }
  function makeAnyTypeReference() {
    return makeTypeReference("Any");
  }

  // ../packages/core/src/compiler/compiler.ts
  var Compiler = class {
    constructor(options = {}, registry) {
      __publicField(this, "options");
      __publicField(this, "registry");
      __publicField(this, "diagnostics", []);
      __publicField(this, "sourceMap", []);
      __publicField(this, "metadata");
      __publicField(this, "dependencies");
      __publicField(this, "definedTypes", /* @__PURE__ */ new Set());
      __publicField(this, "definedVariables", /* @__PURE__ */ new Set());
      __publicField(this, "declaredDeps", /* @__PURE__ */ new Set());
      __publicField(this, "declaredAgents", /* @__PURE__ */ new Set());
      // v0.7: Track declared agents from uses:
      __publicField(this, "declaredTools", /* @__PURE__ */ new Set());
      // v0.7: Track declared tools from uses:
      __publicField(this, "typeEnv", /* @__PURE__ */ new Map());
      __publicField(this, "variableTypeEnv", /* @__PURE__ */ new Map());
      __publicField(this, "registryTypeEnvs", /* @__PURE__ */ new Map());
      this.options = {
        includeHeader: false,
        // Changed default: no header
        generateSourceMap: true,
        validateReferences: true,
        validateTypes: true,
        validateScope: true,
        validateContracts: true,
        ...options
      };
      this.registry = registry || null;
      this.metadata = this.createEmptyMetadata();
      this.dependencies = { nodes: [], edges: [], cycles: [] };
    }
    createEmptyMetadata() {
      return {
        name: "",
        description: "",
        skills: [],
        agents: [],
        tools: [],
        uses: [],
        // v0.7: raw uses array for reference
        imports: [],
        types: [],
        variables: [],
        references: [],
        sections: [],
        parameters: []
      };
    }
    compile(source) {
      this.diagnostics = [];
      this.sourceMap = [];
      this.metadata = this.createEmptyMetadata();
      this.dependencies = { nodes: [], edges: [], cycles: [] };
      this.definedTypes.clear();
      this.definedVariables.clear();
      this.declaredDeps.clear();
      this.declaredAgents.clear();
      this.declaredTools.clear();
      this.typeEnv.clear();
      this.variableTypeEnv.clear();
      this.registryTypeEnvs.clear();
      const ast = parse(source);
      for (const error of ast.errors) {
        this.diagnostics.push({
          severity: "error",
          code: error.code,
          message: error.message,
          span: error.span
        });
      }
      this.extractMetadata(ast);
      this.buildDependencyGraph(ast);
      if (this.options.validateTypes) {
        this.validateTypes(ast);
      }
      if (this.options.validateScope) {
        this.validateScope(ast);
      }
      if (this.options.validateReferences) {
        this.validateReferences();
      }
      if (this.options.validateContracts) {
        this.validateContracts(ast);
      }
      this.validateDelegateStatements(ast);
      this.validateReturnStatements(ast);
      let output = source;
      if (this.options.includeHeader) {
        const header = `<!-- MDZ Validated: ${this.metadata.name || "unnamed"} -->
<!-- Errors: ${this.diagnostics.filter((d) => d.severity === "error").length}, Warnings: ${this.diagnostics.filter((d) => d.severity === "warning").length} -->

`;
        output = header + source;
      }
      return {
        output,
        diagnostics: this.diagnostics,
        metadata: this.metadata,
        sourceMap: this.sourceMap,
        dependencies: this.dependencies
      };
    }
    // ==========================================================================
    // Metadata Extraction
    // ==========================================================================
    extractMetadata(ast) {
      if (ast.frontmatter) {
        this.metadata.name = ast.frontmatter.name;
        this.metadata.description = ast.frontmatter.description;
        this.metadata.skills = [...ast.frontmatter.skills];
        this.metadata.agents = [...ast.frontmatter.agents];
        this.metadata.tools = [...ast.frontmatter.tools];
        this.metadata.uses = [...ast.frontmatter.uses];
        for (const skill of ast.frontmatter.skills) {
          this.declaredDeps.add(skill);
        }
        for (const agent of ast.frontmatter.agents) {
          this.declaredAgents.add(agent);
        }
        for (const tool of ast.frontmatter.tools) {
          this.declaredTools.add(tool);
        }
        for (const imp of ast.frontmatter.imports) {
          this.metadata.imports.push({
            path: imp.path,
            skills: [...imp.skills],
            aliases: new Map(imp.aliases)
          });
          for (const skill of imp.skills) {
            this.declaredDeps.add(skill);
          }
        }
        for (const typeDecl of ast.frontmatter.types) {
          this.definedTypes.add(typeDecl.name);
          this.typeEnv.set(typeDecl.name, typeDecl.typeExpr);
          this.metadata.types.push({
            name: typeDecl.name,
            definition: this.typeExprToString(typeDecl.typeExpr),
            span: typeDecl.span
          });
        }
        for (const inputDecl of ast.frontmatter.input) {
          this.definedVariables.add(inputDecl.name);
          this.metadata.parameters.push({
            name: inputDecl.name,
            type: inputDecl.type ? this.typeExprToString(inputDecl.type) : null,
            hasDefault: inputDecl.defaultValue !== void 0,
            isRequired: inputDecl.required,
            span: inputDecl.span
          });
          if (inputDecl.type) {
            this.variableTypeEnv.set(inputDecl.name, inputDecl.type);
          }
        }
        for (const contextDecl of ast.frontmatter.context) {
          this.definedVariables.add(contextDecl.name);
          this.metadata.variables.push({
            name: contextDecl.name,
            type: contextDecl.type ? this.typeExprToString(contextDecl.type) : null,
            hasDefault: contextDecl.initialValue !== void 0,
            isRequired: false,
            span: contextDecl.span
          });
          if (contextDecl.type) {
            this.variableTypeEnv.set(contextDecl.name, contextDecl.type);
          }
        }
      }
      for (const section of ast.sections) {
        if (section.title) {
          this.metadata.sections.push({
            title: section.title,
            anchor: section.anchor,
            level: section.level,
            span: section.span
          });
        }
        if (section.title === "Input") {
          this.extractParameters(section.content);
        }
        this.extractFromBlocks(section.content);
      }
    }
    extractFromBlocks(blocks) {
      for (const block of blocks) {
        this.extractFromBlock(block);
      }
    }
    extractFromBlock(block) {
      switch (block.kind) {
        case "TypeDefinition":
          this.extractTypeDefinition(block);
          break;
        case "VariableDeclaration":
          this.extractVariableDeclaration(block);
          break;
        case "ForEachStatement":
          this.extractFromControlFlow(block);
          break;
        case "ReturnStatement":
          if (block.value) {
            this.extractFromExpression(block.value);
          }
          break;
        case "PushStatement":
          this.extractFromExpression(block.target);
          this.extractFromExpression(block.value);
          break;
        case "DoStatement":
          if (block.instruction) {
            this.sourceMap.push({
              source: block.instruction.span,
              type: "semantic",
              name: block.instruction.content
            });
          }
          if (block.body) {
            this.extractFromBlocks(block.body);
          }
          break;
        case "WhileStatement":
          this.extractFromBlocks(block.body);
          break;
        case "IfStatement":
          this.extractFromBlocks(block.thenBody);
          if (block.elseBody) {
            this.extractFromBlocks(block.elseBody);
          }
          break;
        case "Paragraph":
          this.extractFromParagraph(block);
          break;
        case "Delegation":
          this.extractFromDelegation(block);
          break;
        case "DelegateStatement":
          this.extractFromDelegateStatement(block);
          break;
        case "UseStatement":
          this.extractFromUseStatement(block);
          break;
        case "ExecuteStatement":
          this.extractFromExecuteStatement(block);
          break;
        case "GotoStatement":
          this.extractFromGotoStatement(block);
          break;
      }
    }
    extractTypeDefinition(def) {
      const typeInfo = {
        name: def.name,
        definition: this.typeExprToString(def.typeExpr),
        span: def.span
      };
      this.metadata.types.push(typeInfo);
      this.definedTypes.add(def.name);
      this.typeEnv.set(def.name, def.typeExpr);
      this.sourceMap.push({
        source: def.span,
        type: "type-def",
        name: def.name
      });
    }
    typeExprToString(expr) {
      switch (expr.kind) {
        case "SemanticType":
          return expr.description;
        case "EnumType":
          return expr.values.map((v) => `"${v}"`).join(" | ");
        case "TypeReference":
          return `$${expr.name}`;
        case "CompoundType":
          return "(" + expr.elements.map((e) => this.typeExprToString(e)).join(", ") + ")";
        case "ArrayType":
          return this.typeExprToString(expr.elementType) + "[]";
        case "FunctionType":
          return `(${expr.params.join(", ")}) => ${this.typeExprToString(expr.returnType)}`;
        default:
          return "";
      }
    }
    extractVariableDeclaration(decl) {
      const varInfo = {
        name: decl.name,
        type: this.getTypeAnnotationName(decl.typeAnnotation),
        hasDefault: decl.value !== null,
        isRequired: decl.isRequired || false,
        span: decl.span
      };
      this.metadata.variables.push(varInfo);
      this.definedVariables.add(decl.name);
      if (decl.typeAnnotation) {
        this.variableTypeEnv.set(decl.name, this.typeAnnotationToTypeExpr(decl.typeAnnotation));
      }
      this.sourceMap.push({
        source: decl.span,
        type: "variable",
        name: decl.name
      });
      if (decl.value) {
        this.extractFromExpression(decl.value);
      }
    }
    extractFromControlFlow(stmt) {
      if (stmt.pattern.kind === "SimplePattern") {
        this.definedVariables.add(stmt.pattern.name);
      } else {
        for (const name of stmt.pattern.names) {
          this.definedVariables.add(name);
        }
      }
      this.sourceMap.push({
        source: stmt.span,
        type: "control-flow",
        name: stmt.kind
      });
      this.extractFromExpression(stmt.collection);
      this.extractFromBlocks(stmt.body);
    }
    extractFromParagraph(para) {
      for (const content of para.content) {
        if (content.kind === "Link") {
          this.extractLinkReference(content);
        } else if (content.kind === "Anchor") {
          this.extractAnchorReference(content);
        } else if (content.kind === "InferredVariable") {
          this.sourceMap.push({
            source: content.span,
            type: "semantic",
            name: `$/` + content.name + `/`
          });
        }
      }
    }
    extractFromDelegation(deleg) {
      if (deleg.target.kind === "Link") {
        this.extractLinkReference(deleg.target);
      } else {
        this.extractAnchorReference(deleg.target);
      }
      for (const param of deleg.parameters) {
        this.extractVariableDeclaration(param);
      }
    }
    // v0.8: Extract metadata from DELEGATE statement
    // v0.9: target is now optional (for AWAIT statements)
    extractFromDelegateStatement(deleg) {
      if (deleg.target) {
        this.extractLinkReference(deleg.target);
      }
      if (deleg.task) {
        this.sourceMap.push({
          source: deleg.task.span,
          type: "semantic",
          name: deleg.task.content
        });
      }
      if (deleg.withAnchor) {
        this.extractAnchorReference(deleg.withAnchor);
      }
      if (deleg.parameters) {
        for (const param of deleg.parameters.parameters) {
          this.extractVariableDeclaration(param);
          this.recordParameterType(param);
        }
      }
      this.sourceMap.push({
        source: deleg.span,
        type: "control-flow",
        name: "DelegateStatement"
      });
    }
    // v0.8: Extract metadata from USE statement
    extractFromUseStatement(stmt) {
      this.extractLinkReference(stmt.link);
      this.sourceMap.push({
        source: stmt.task.span,
        type: "semantic",
        name: stmt.task.content
      });
      if (stmt.parameters) {
        for (const param of stmt.parameters.parameters) {
          this.extractVariableDeclaration(param);
          this.recordParameterType(param);
        }
      }
      this.sourceMap.push({
        source: stmt.span,
        type: "control-flow",
        name: "UseStatement"
      });
    }
    // v0.8: Extract metadata from EXECUTE statement
    extractFromExecuteStatement(stmt) {
      this.extractLinkReference(stmt.link);
      this.sourceMap.push({
        source: stmt.task.span,
        type: "semantic",
        name: stmt.task.content
      });
      this.sourceMap.push({
        source: stmt.span,
        type: "control-flow",
        name: "ExecuteStatement"
      });
    }
    // v0.8: Extract metadata from GOTO statement
    extractFromGotoStatement(stmt) {
      this.extractAnchorReference(stmt.anchor);
      this.sourceMap.push({
        source: stmt.span,
        type: "control-flow",
        name: "GotoStatement"
      });
    }
    extractParameters(blocks) {
      for (const block of blocks) {
        if (block.kind === "VariableDeclaration") {
          this.metadata.parameters.push({
            name: block.name,
            type: this.getTypeAnnotationName(block.typeAnnotation),
            hasDefault: block.value !== null,
            isRequired: !block.value,
            span: block.span
          });
          if (block.typeAnnotation) {
            this.variableTypeEnv.set(block.name, this.typeAnnotationToTypeExpr(block.typeAnnotation));
          }
        }
      }
    }
    getTypeAnnotationName(typeAnnotation) {
      if (!typeAnnotation) return null;
      if (typeAnnotation.kind === "TypeReference") {
        return typeAnnotation.name;
      }
      return typeAnnotation.description;
    }
    typeAnnotationToTypeExpr(typeAnnotation) {
      return typeAnnotation;
    }
    extractFromExpression(expr) {
      switch (expr.kind) {
        // v0.8: Link and Anchor references replace old sigil-based syntax
        case "Link":
          this.extractLinkReference(expr);
          break;
        case "Anchor":
          this.extractAnchorReference(expr);
          break;
        case "InferredVariable":
          this.sourceMap.push({
            source: expr.span,
            type: "semantic",
            name: `$/` + expr.name + `/`
          });
          break;
        case "BinaryExpression":
          this.extractFromExpression(expr.left);
          this.extractFromExpression(expr.right);
          break;
        case "UnaryExpression":
          this.extractFromExpression(expr.operand);
          break;
        case "ArrayLiteral":
          for (const el of expr.elements) {
            this.extractFromExpression(el);
          }
          break;
        case "FunctionCall":
          this.extractFromExpression(expr.callee);
          for (const arg of expr.args) {
            this.extractFromExpression(arg);
          }
          break;
        case "MemberAccess":
          this.extractFromExpression(expr.object);
          break;
        case "LambdaExpression":
          this.extractFromExpression(expr.body);
          break;
      }
    }
    // v0.8: Extract link reference (~/path/to/file or ~/path/to/file#anchor)
    extractLinkReference(link) {
      const kind = getLinkKind(link);
      const target = link.raw;
      this.metadata.references.push({
        kind: kind === "unknown" ? "skill" : kind,
        // Default to skill for unknown
        target,
        path: link.path,
        anchor: link.anchor || void 0,
        span: link.span
      });
      this.sourceMap.push({
        source: link.span,
        type: "reference",
        name: target
      });
    }
    // v0.8: Extract anchor reference (#section)
    extractAnchorReference(anchor) {
      this.metadata.references.push({
        kind: "anchor",
        target: `#${anchor.name}`,
        anchor: anchor.name,
        span: anchor.span
      });
      this.sourceMap.push({
        source: anchor.span,
        type: "reference",
        name: `#${anchor.name}`
      });
    }
    // ==========================================================================
    // Dependency Graph
    // ==========================================================================
    buildDependencyGraph(ast) {
      const nodes = /* @__PURE__ */ new Set();
      const edges = [];
      for (const ref of this.metadata.references) {
        if (ref.path && ref.path.length > 0) {
          const depPath = ref.path.join("/");
          nodes.add(depPath);
          edges.push({ target: depPath, type: "reference", span: ref.span });
        }
      }
      this.dependencies.nodes = Array.from(nodes);
      this.dependencies.edges = edges;
    }
    // ==========================================================================
    // Validation
    // ==========================================================================
    buildDocumentTypeEnv() {
      return buildTypeEnv(this.metadata.types.map((type) => ({
        kind: "TypeDefinition",
        name: type.name,
        typeExpr: this.typeEnv.get(type.name) ?? makeAnyType(),
        span: type.span
      })));
    }
    buildVariableTypeEnv() {
      return new Map(this.variableTypeEnv);
    }
    buildTypeEnvFromAst(ast) {
      const types = /* @__PURE__ */ new Map();
      if (ast.frontmatter) {
        for (const typeDecl of ast.frontmatter.types) {
          types.set(typeDecl.name, typeDecl.typeExpr);
        }
      }
      for (const section of ast.sections) {
        for (const block of section.content) {
          if (block.kind === "TypeDefinition") {
            types.set(block.name, block.typeExpr);
          }
        }
      }
      return types;
    }
    typeExprToStringResolved(expr, env) {
      return this.typeExprToString(resolveType(expr, env));
    }
    parameterTypeExprFor(param) {
      if (param.typeAnnotation) {
        return this.typeAnnotationToTypeExpr(param.typeAnnotation);
      }
      if (param.value) {
        return inferType(param.value, this.variableTypeEnv);
      }
      return null;
    }
    recordParameterType(param) {
      const typeExpr = this.parameterTypeExprFor(param);
      if (typeExpr) {
        this.variableTypeEnv.set(param.name, typeExpr);
      }
    }
    getRegistryTypeEnv(targetPath, skill) {
      if (this.registryTypeEnvs.has(targetPath)) {
        return this.registryTypeEnvs.get(targetPath) ?? /* @__PURE__ */ new Map();
      }
      const env = this.buildTypeEnvFromAst(skill.ast);
      this.registryTypeEnvs.set(targetPath, env);
      return env;
    }
    validateTypes(_ast) {
      const typeEnv = this.buildDocumentTypeEnv();
      this.variableTypeEnv = this.buildVariableTypeEnv();
      this.typeEnv = typeEnv;
      for (const varInfo of this.metadata.variables) {
        if (varInfo.type && !this.definedTypes.has(varInfo.type)) {
          if (isBuiltinTypeName(varInfo.type)) {
            continue;
          }
          this.diagnostics.push({
            severity: "warning",
            code: "E008",
            message: `Type '$${varInfo.type}' is not defined in this document`,
            span: varInfo.span
          });
        }
      }
    }
    validateScope(ast) {
      const usedBeforeDefined = /* @__PURE__ */ new Set();
      for (const section of ast.sections) {
        this.checkScopeInBlocks(section.content, usedBeforeDefined);
      }
    }
    checkScopeInBlocks(blocks, usedBeforeDefined) {
      for (const block of blocks) {
        if (block.kind === "VariableDeclaration") {
          this.definedVariables.add(block.name);
          if (block.value) {
            this.checkExpressionScope(block.value, usedBeforeDefined);
          }
        } else if (block.kind === "ForEachStatement") {
          this.checkExpressionScope(block.collection, usedBeforeDefined);
          if (block.pattern.kind === "SimplePattern") {
            this.definedVariables.add(block.pattern.name);
          } else {
            for (const name of block.pattern.names) {
              this.definedVariables.add(name);
            }
          }
          this.checkScopeInBlocks(block.body, usedBeforeDefined);
        } else if (block.kind === "WhileStatement") {
          this.checkScopeInBlocks(block.body, usedBeforeDefined);
        } else if (block.kind === "IfStatement") {
          this.checkScopeInBlocks(block.thenBody, usedBeforeDefined);
          if (block.elseBody) {
            this.checkScopeInBlocks(block.elseBody, usedBeforeDefined);
          }
        } else if (block.kind === "Paragraph") {
          for (const content of block.content) {
            if (content.kind === "VariableReference") {
              if (!this.definedVariables.has(content.name)) {
                usedBeforeDefined.add(content.name);
              }
            }
          }
        } else if (block.kind === "DelegateStatement") {
          if (block.task) {
            for (const interpolation of block.task.interpolations) {
              if (!this.definedVariables.has(interpolation.name)) {
                usedBeforeDefined.add(interpolation.name);
              }
            }
          }
          if (block.parameters) {
            for (const param of block.parameters.parameters) {
              if (param.value) {
                this.checkExpressionScope(param.value, usedBeforeDefined);
              }
            }
          }
        } else if (block.kind === "ReturnStatement") {
          if (block.value) {
            this.checkExpressionScope(block.value, usedBeforeDefined);
          }
        } else if (block.kind === "PushStatement") {
          if (!this.definedVariables.has(block.target.name)) {
            usedBeforeDefined.add(block.target.name);
          }
          this.checkExpressionScope(block.value, usedBeforeDefined);
        } else if (block.kind === "DoStatement") {
          if (block.instruction) {
            for (const interpolation of block.instruction.interpolations) {
              if (!this.definedVariables.has(interpolation.name)) {
                usedBeforeDefined.add(interpolation.name);
              }
            }
          }
          if (block.body) {
            this.checkScopeInBlocks(block.body, usedBeforeDefined);
          }
        }
      }
    }
    checkExpressionScope(expr, usedBeforeDefined) {
      if (expr.kind === "VariableReference") {
        if (!this.definedVariables.has(expr.name)) {
          usedBeforeDefined.add(expr.name);
        }
      } else if (expr.kind === "InferredVariable") {
      } else if (expr.kind === "BinaryExpression") {
        this.checkExpressionScope(expr.left, usedBeforeDefined);
        this.checkExpressionScope(expr.right, usedBeforeDefined);
      } else if (expr.kind === "UnaryExpression") {
        this.checkExpressionScope(expr.operand, usedBeforeDefined);
      } else if (expr.kind === "ArrayLiteral") {
        for (const el of expr.elements) {
          this.checkExpressionScope(el, usedBeforeDefined);
        }
      }
    }
    validateReferences() {
      for (const ref of this.metadata.references) {
        if (ref.kind === "anchor" && ref.anchor) {
          const sectionExists = this.metadata.sections.some((s) => s.anchor === ref.anchor);
          if (!sectionExists) {
            this.diagnostics.push({
              severity: "error",
              code: "E010",
              message: `Section '#${ref.anchor}' does not exist in this document`,
              span: ref.span
            });
          }
        }
      }
      if (this.registry) {
        for (const ref of this.metadata.references) {
          if (ref.path && ref.path.length > 0) {
            const depPath = ref.path.join("/");
            const skill = this.registry.get(depPath);
            if (!skill) {
              this.diagnostics.push({
                severity: "error",
                code: "E009",
                message: `File '${ref.target}' is not found in registry`,
                span: ref.span
              });
            } else if (ref.anchor) {
              const targetSection = skill.ast.sections.find((s) => s.anchor === ref.anchor);
              if (!targetSection) {
                this.diagnostics.push({
                  severity: "error",
                  code: "E010",
                  message: `Section '#${ref.anchor}' does not exist in '${ref.target}'`,
                  span: ref.span
                });
              }
            }
          }
        }
      }
    }
    // v0.3: Validate DELEGATE statements
    validateDelegateStatements(ast) {
      const delegateStatements = [];
      this.findDelegateStatements(ast.sections, delegateStatements);
      for (const deleg of delegateStatements) {
        this.validateDelegateAgent(deleg);
      }
    }
    findDelegateStatements(sections, statements) {
      for (const section of sections) {
        this.findDelegateStatementsInBlocks(section.content, statements);
      }
    }
    findDelegateStatementsInBlocks(blocks, statements) {
      for (const block of blocks) {
        if (block.kind === "DelegateStatement") {
          statements.push(block);
        } else if (block.kind === "ForEachStatement") {
          this.findDelegateStatementsInBlocks(block.body, statements);
        } else if (block.kind === "WhileStatement") {
          this.findDelegateStatementsInBlocks(block.body, statements);
        } else if (block.kind === "IfStatement") {
          this.findDelegateStatementsInBlocks(block.thenBody, statements);
          for (const elseIf of block.elseIf) {
            this.findDelegateStatementsInBlocks(elseIf.body, statements);
          }
          if (block.elseBody) {
            this.findDelegateStatementsInBlocks(block.elseBody, statements);
          }
        }
      }
    }
    validateDelegateAgent(deleg) {
      if (!deleg.target) {
        return;
      }
      const linkKind = getLinkKind(deleg.target);
      if (linkKind !== "agent") {
        this.diagnostics.push({
          severity: "warning",
          code: "W003",
          message: `DELEGATE target '${deleg.target.raw}' should be an agent (~/agent/...)`,
          span: deleg.target.span
        });
      }
    }
    // v0.9: Validate RETURN statement placement
    validateReturnStatements(ast) {
      for (const section of ast.sections) {
        this.validateReturnInBlocks(section.content, section.content.length);
      }
    }
    validateReturnInBlocks(blocks, parentLength) {
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.kind === "ReturnStatement") {
          const isLast = i === parentLength - 1;
          if (!isLast) {
            this.addDiagnostic({
              severity: "error",
              code: "E018",
              message: "RETURN must be at end of section or loop iteration",
              span: block.span
            });
          }
        } else if (block.kind === "ForEachStatement" || block.kind === "WhileStatement") {
          this.validateReturnInBlocks(block.body, block.body.length);
        } else if (block.kind === "IfStatement") {
          this.validateReturnInBlocks(block.thenBody, block.thenBody.length);
          for (const elseIf of block.elseIf) {
            this.validateReturnInBlocks(elseIf.body, elseIf.body.length);
          }
          if (block.elseBody) {
            this.validateReturnInBlocks(block.elseBody, block.elseBody.length);
          }
        }
      }
    }
    addDiagnostic(diagnostic) {
      this.diagnostics.push(diagnostic);
    }
    validateContracts(ast) {
      const delegations = [];
      this.findDelegations(ast.sections, delegations);
      for (const deleg of delegations) {
        if (deleg.target.kind === "Link") {
          this.validateDelegationParameters(deleg);
        }
      }
    }
    findDelegations(sections, delegations) {
      for (const section of sections) {
        this.findDelegationsInBlocks(section.content, delegations);
      }
    }
    findDelegationsInBlocks(blocks, delegations) {
      for (const block of blocks) {
        if (block.kind === "Delegation") {
          delegations.push(block);
        } else if (block.kind === "ForEachStatement") {
          this.findDelegationsInBlocks(block.body, delegations);
        } else if (block.kind === "WhileStatement") {
          this.findDelegationsInBlocks(block.body, delegations);
        } else if (block.kind === "IfStatement") {
          this.findDelegationsInBlocks(block.thenBody, delegations);
          if (block.elseBody) {
            this.findDelegationsInBlocks(block.elseBody, delegations);
          }
        }
      }
    }
    validateDelegationParameters(deleg) {
      if (deleg.target.kind !== "Link") {
        return;
      }
      const targetPath = deleg.target.path.join("/");
      let skillParams = [];
      let skillTypeEnv = this.buildDocumentTypeEnv();
      if (targetPath === this.metadata.name) {
        skillParams = this.metadata.parameters;
      } else if (this.registry) {
        const skill = this.registry.get(targetPath);
        if (skill) {
          const registryTypeEnv = this.getRegistryTypeEnv(targetPath, skill);
          const skillCompileResult = compile(skill.source, { validateReferences: false, validateContracts: false });
          skillParams = skillCompileResult.metadata.parameters;
          skillTypeEnv = buildTypeEnv(
            skillCompileResult.metadata.types.map((type) => ({
              kind: "TypeDefinition",
              name: type.name,
              typeExpr: registryTypeEnv.get(type.name) ?? makeAnyType(),
              span: type.span
            }))
          );
        }
      }
      const providedParams = new Set(deleg.parameters.map((p) => p.name));
      const requiredParams = skillParams.filter((p) => p.isRequired);
      for (const req of requiredParams) {
        if (!providedParams.has(req.name)) {
          this.diagnostics.push({
            severity: "error",
            code: "E011",
            message: `Required parameter '${req.name}' is missing for '${targetPath}'`,
            span: deleg.span
          });
        }
      }
      if (deleg.parameters.length > 0) {
        for (const param of deleg.parameters) {
          const expected = skillParams.find((p) => p.name === param.name);
          if (!expected) {
            this.diagnostics.push({
              severity: "warning",
              code: "W002",
              message: `Parameter '${param.name}' is not defined for '${targetPath}'`,
              span: param.span
            });
            continue;
          }
          if (!expected.type) {
            continue;
          }
          const candidateType = this.parameterTypeExprFor(param);
          if (!candidateType) {
            continue;
          }
          const expectedExpr = skillTypeEnv.has(expected.type) || isBuiltinTypeName(expected.type) ? makeTypeReference(expected.type) : makeAnyType();
          const resolvedExpected = resolveType(expectedExpr, skillTypeEnv);
          const resolvedCandidate = resolveType(candidateType, this.buildDocumentTypeEnv());
          const compatibility = isCompatible(resolvedCandidate, resolvedExpected, /* @__PURE__ */ new Map());
          if (!compatibility.compatible) {
            const expectedLabel = this.typeExprToStringResolved(resolvedExpected, skillTypeEnv);
            const candidateLabel = this.typeExprToStringResolved(resolvedCandidate, skillTypeEnv);
            this.diagnostics.push({
              severity: "error",
              code: "E020",
              message: `Parameter '${param.name}' expects ${expectedLabel} but received ${candidateLabel}`,
              span: param.span
            });
          }
        }
      }
    }
  };
  function compile(source, options, registry) {
    return new Compiler(options, registry).compile(source);
  }

  // ../packages/lsp/src/server.ts
  var ZenLanguageServer = class {
    constructor() {
      __publicField(this, "documents", /* @__PURE__ */ new Map());
      __publicField(this, "skillRegistry", /* @__PURE__ */ new Map());
      __publicField(this, "semanticTokenTypes", [
        "keyword",
        "variable",
        "type",
        "string",
        "number",
        "operator",
        "function",
        "parameter",
        "namespace",
        "semanticSpan",
        "link",
        "anchor",
        "frontmatter",
        "heading"
      ]);
      __publicField(this, "semanticTokenTypeIndex", new Map(
        this.semanticTokenTypes.map((type, index) => [type, index])
      ));
    }
    // ==========================================================================
    // Document Management
    // ==========================================================================
    openDocument(uri, content) {
      const state = this.analyzeDocument(uri, content);
      this.documents.set(uri, state);
      return this.getDiagnostics(state);
    }
    updateDocument(uri, content) {
      const state = this.analyzeDocument(uri, content);
      this.documents.set(uri, state);
      return this.getDiagnostics(state);
    }
    closeDocument(uri) {
      this.documents.delete(uri);
    }
    // ==========================================================================
    // Analysis
    // ==========================================================================
    analyzeDocument(uri, content) {
      const ast = parse(content);
      const types = /* @__PURE__ */ new Map();
      const variables = /* @__PURE__ */ new Map();
      const references = [];
      const semanticSpans = [];
      const frontmatterSpans = this.collectFrontmatterDeclarationSpans(content);
      if (ast.frontmatter) {
        for (const typeDecl of ast.frontmatter.types) {
          types.set(typeDecl.name, {
            name: typeDecl.name,
            definition: this.typeExprToString(typeDecl.typeExpr),
            span: frontmatterSpans.types.get(typeDecl.name) ?? typeDecl.span,
            typeExpr: typeDecl.typeExpr
          });
        }
        for (const inputDecl of ast.frontmatter.input) {
          variables.set(inputDecl.name, {
            name: inputDecl.name,
            typeExpr: inputDecl.type,
            span: frontmatterSpans.input.get(inputDecl.name) ?? inputDecl.span,
            isLambda: false,
            source: "input"
          });
        }
        for (const contextDecl of ast.frontmatter.context) {
          variables.set(contextDecl.name, {
            name: contextDecl.name,
            typeExpr: contextDecl.type,
            span: frontmatterSpans.context.get(contextDecl.name) ?? contextDecl.span,
            isLambda: false,
            source: "context"
          });
        }
      }
      for (const section of ast.sections) {
        this.analyzeBlocks(section.title, section.content, types, variables, references, semanticSpans);
      }
      const parameters = this.collectParameters(ast);
      const typeEnv = this.buildTypeEnv(types, ast);
      const variableTypes = this.buildVariableTypes(variables);
      const relativePath = uri.replace(/\.mdz$/, "");
      const state = {
        uri,
        content,
        ast,
        types,
        variables,
        references,
        semanticSpans,
        parameters,
        typeEnv,
        variableTypes
      };
      this.skillRegistry.set(relativePath, state);
      return {
        uri,
        content,
        ast,
        types,
        variables,
        references,
        semanticSpans,
        parameters,
        typeEnv,
        variableTypes
      };
    }
    analyzeBlocks(sectionTitle, blocks, types, variables, references, semanticSpans) {
      const isLegacySection = sectionTitle === "Types" || sectionTitle === "Input" || sectionTitle === "Context";
      for (const block of blocks) {
        switch (block.kind) {
          case "TypeDefinition":
            if (!isLegacySection) {
              types.set(block.name, {
                name: block.name,
                definition: this.typeExprToString(block.typeExpr),
                span: block.span,
                typeExpr: block.typeExpr
              });
            }
            break;
          case "VariableDeclaration":
            if (!isLegacySection) {
              variables.set(block.name, {
                name: block.name,
                typeExpr: block.typeAnnotation ?? void 0,
                span: block.span,
                isLambda: block.isLambda,
                source: "local"
              });
            }
            if (block.value) {
              this.analyzeExpression(block.value, references, semanticSpans);
            }
            break;
          case "ForEachStatement":
            if (block.pattern.kind === "SimplePattern") {
              variables.set(block.pattern.name, {
                name: block.pattern.name,
                span: block.pattern.span,
                isLambda: false,
                source: "local"
              });
            } else {
              for (const name of block.pattern.names) {
                variables.set(name, {
                  name,
                  span: block.pattern.span,
                  isLambda: false,
                  source: "local"
                });
              }
            }
            this.analyzeExpression(block.collection, references, semanticSpans);
            this.analyzeBlocks(sectionTitle, block.body, types, variables, references, semanticSpans);
            break;
          case "WhileStatement":
            this.analyzeCondition(block.condition, references, semanticSpans);
            this.analyzeBlocks(sectionTitle, block.body, types, variables, references, semanticSpans);
            break;
          case "IfStatement":
            this.analyzeCondition(block.condition, references, semanticSpans);
            this.analyzeBlocks(sectionTitle, block.thenBody, types, variables, references, semanticSpans);
            if (block.elseBody) {
              this.analyzeBlocks(sectionTitle, block.elseBody, types, variables, references, semanticSpans);
            }
            break;
          case "Paragraph":
            for (const item of block.content) {
              if (isLink(item)) {
                references.push({
                  kind: "link",
                  path: item.path,
                  anchor: item.anchor ?? void 0,
                  target: item.raw,
                  span: item.span
                });
              } else if (isAnchor(item)) {
                references.push({
                  kind: "anchor",
                  anchor: item.name,
                  target: `#${item.name}`,
                  span: item.span
                });
              }
            }
            break;
        }
      }
    }
    analyzeExpression(expr, references, semanticSpans) {
      if (isLink(expr)) {
        references.push({
          kind: "link",
          path: expr.path,
          anchor: expr.anchor ?? void 0,
          target: expr.raw,
          span: expr.span
        });
        return;
      }
      if (isAnchor(expr)) {
        references.push({
          kind: "anchor",
          anchor: expr.name,
          target: `#${expr.name}`,
          span: expr.span
        });
        return;
      }
      switch (expr.kind) {
        case "ArrayLiteral":
          for (const el of expr.elements) {
            this.analyzeExpression(el, references, semanticSpans);
          }
          break;
        case "TemplateLiteral":
          for (const part of expr.parts) {
            if (typeof part !== "string") {
              this.analyzeExpression(part, references, semanticSpans);
            }
          }
          break;
        case "BinaryExpression":
          this.analyzeExpression(expr.left, references, semanticSpans);
          this.analyzeExpression(expr.right, references, semanticSpans);
          break;
        case "LambdaExpression":
          this.analyzeExpression(expr.body, references, semanticSpans);
          break;
        case "FunctionCall":
          this.analyzeExpression(expr.callee, references, semanticSpans);
          for (const arg of expr.args) {
            this.analyzeExpression(arg, references, semanticSpans);
          }
          break;
      }
    }
    analyzeCondition(cond, references, semanticSpans) {
      switch (cond.kind) {
        case "SemanticCondition":
          semanticSpans.push({ content: cond.text, span: cond.span });
          break;
        case "DeterministicCondition":
          this.analyzeExpression(cond.left, references, semanticSpans);
          this.analyzeExpression(cond.right, references, semanticSpans);
          break;
        case "CompoundCondition":
          this.analyzeCondition(cond.left, references, semanticSpans);
          this.analyzeCondition(cond.right, references, semanticSpans);
          break;
      }
    }
    typeExprToString(expr) {
      switch (expr.kind) {
        case "SemanticType":
          return expr.description;
        case "EnumType":
          return expr.values.map((v) => `"${v}"`).join(" | ");
        case "TypeReference":
          return `$${expr.name}`;
        case "CompoundType":
          return `(${expr.elements.map((e) => this.typeExprToString(e)).join(", ")})`;
        case "ArrayType":
          return `${this.typeExprToString(expr.elementType)}[]`;
        case "FunctionType":
          return `(${expr.params.join(", ")}) => ${this.typeExprToString(expr.returnType)}`;
        default:
          return "";
      }
    }
    // ==========================================================================
    // Semantic Tokens
    // ==========================================================================
    // -- MDZ_SEMANTIC_TOKENS_START
    getSemanticTokensLegend() {
      return {
        tokenTypes: [...this.semanticTokenTypes],
        tokenModifiers: []
      };
    }
    getSemanticTokens(uri) {
      const state = this.documents.get(uri);
      if (!state) return { data: [] };
      const tokens = [];
      const lineOffsets = this.buildLineOffsets(state.content);
      const codeLines = this.collectCodeBlockLines(state.ast);
      const lines = state.content.split("\n");
      const frontmatterLines = /* @__PURE__ */ new Set();
      if (state.ast.frontmatter) {
        const start = state.ast.frontmatter.span.start.line;
        const end = state.ast.frontmatter.span.end.line;
        for (let line = start; line <= end; line += 1) {
          frontmatterLines.add(line);
        }
      }
      const addToken = (line, char, length, type) => {
        if (length <= 0) return;
        const typeIndex = this.semanticTokenTypeIndex.get(type);
        if (typeIndex === void 0) return;
        tokens.push({ line, char, length, type: typeIndex, modifiers: 0 });
      };
      const addSpanToken = (span, type) => {
        if (span.start.line !== span.end.line) return;
        addToken(span.start.line - 1, span.start.column, span.end.column - span.start.column, type);
      };
      const addLineToken = (lineIndex, length, type) => {
        if (length <= 0) return;
        addToken(lineIndex, 0, length, type);
      };
      const addFrontmatterTokens = () => {
        if (!state.ast.frontmatter) return;
        const start = state.ast.frontmatter.span.start.line - 1;
        const end = state.ast.frontmatter.span.end.line - 1;
        for (let lineIndex = start; lineIndex <= end; lineIndex += 1) {
          const line = lines[lineIndex] ?? "";
          const trimmed = line.trim();
          if (trimmed === "---") {
            addLineToken(lineIndex, line.length, "frontmatter");
            continue;
          }
          const match = line.match(/^\s*[A-Za-z0-9_-]+:/);
          if (match) {
            addToken(lineIndex, match.index ?? 0, match[0].length, "frontmatter");
          }
        }
      };
      const headingPattern = /^#+\s+/;
      const inlineKeywordPattern = /\b(THEN|IN|WITH|TO)\b/g;
      const addHeadingFromLine = (lineIndex, line) => {
        if (codeLines.has(lineIndex + 1) || frontmatterLines.has(lineIndex + 1)) return;
        if (!headingPattern.test(line)) return;
        addLineToken(lineIndex, line.length, "heading");
      };
      const addInlineKeywordFromLine = (lineIndex, line) => {
        if (codeLines.has(lineIndex + 1) || frontmatterLines.has(lineIndex + 1)) return;
        inlineKeywordPattern.lastIndex = 0;
        let match;
        while (match = inlineKeywordPattern.exec(line)) {
          addToken(lineIndex, match.index, match[0].length, "keyword");
        }
      };
      const addSemanticMarkerFromLine = (lineIndex, line) => {
        if (codeLines.has(lineIndex + 1) || frontmatterLines.has(lineIndex + 1)) return;
        const markerPattern = /\/[^\/\n]+\//g;
        let match;
        markerPattern.lastIndex = 0;
        while (match = markerPattern.exec(line)) {
          addToken(lineIndex, match.index, match[0].length, "semanticSpan");
        }
      };
      const addTemplateTokensFromLine = (lineIndex, line) => {
        if (codeLines.has(lineIndex + 1)) return;
        const templatePattern = /`[^`]*`/g;
        const variablePattern = /\$\/[^\/\n]+\/|\$[A-Za-z][A-Za-z0-9-]*/g;
        let templateMatch;
        templatePattern.lastIndex = 0;
        while (templateMatch = templatePattern.exec(line)) {
          const fullStart = templateMatch.index;
          const fullEnd = templateMatch.index + templateMatch[0].length;
          const content = templateMatch[0].slice(1, -1);
          let cursor = fullStart;
          variablePattern.lastIndex = 0;
          let varMatch;
          while (varMatch = variablePattern.exec(content)) {
            const varStart = fullStart + 1 + varMatch.index;
            if (cursor < varStart) {
              addToken(lineIndex, cursor, varStart - cursor, "string");
            }
            addToken(lineIndex, varStart, varMatch[0].length, "variable");
            cursor = varStart + varMatch[0].length;
          }
          if (cursor < fullEnd) {
            addToken(lineIndex, cursor, fullEnd - cursor, "string");
          }
        }
      };
      const addFrontmatterInlineTokens = (lineIndex, line) => {
        if (!frontmatterLines.has(lineIndex + 1)) return;
        if (line.trim() === "---") return;
        const patterns = [
          { regex: /\$\/[^\/\n]+\//g, type: "variable" },
          { regex: /\$[A-Z][A-Za-z0-9]*/g, type: "type" },
          { regex: /\$[a-z][A-Za-z0-9-]*/g, type: "variable" },
          { regex: /"[^"]*"/g, type: "string" },
          { regex: /\b-?\d+(?:\.\d+)?\b/g, type: "number" }
        ];
        for (const { regex, type } of patterns) {
          let match;
          regex.lastIndex = 0;
          while (match = regex.exec(line)) {
            addToken(lineIndex, match.index, match[0].length, type);
          }
        }
        const semanticTypeMatch = line.match(
          /(\$[A-Za-z][A-Za-z0-9-]*\s*:\s+)(?!\$|"|\()([^\n=]+)/
        );
        if (semanticTypeMatch && semanticTypeMatch.index !== void 0) {
          const matchStart = semanticTypeMatch.index + semanticTypeMatch[1].length;
          let matchEnd = semanticTypeMatch.index + semanticTypeMatch[0].length;
          while (matchEnd > matchStart && /\s/.test(line[matchEnd - 1])) {
            matchEnd -= 1;
          }
          addToken(lineIndex, matchStart, matchEnd - matchStart, "semanticSpan");
        }
      };
      const addStringToken = (span) => {
        if (span.start.line !== span.end.line) return;
        const lineIndex = span.start.line - 1;
        const line = lines[lineIndex] ?? "";
        let start = span.start.column;
        let length = span.end.column - span.start.column;
        if (start >= 1 && line[start - 1] === '"') {
          start -= 1;
          length += 1;
        } else if (start >= 2 && line[start - 2] === '"') {
          start -= 2;
          length += 2;
        }
        if (start + length < line.length && line[start + length] === '"') {
          length += 1;
        }
        addToken(lineIndex, start, length, "string");
      };
      const addKeywordFromLine = (lineIndex, line) => {
        if (codeLines.has(lineIndex + 1)) return;
        const match = line.match(/^\s*(ELSE IF|ELSE|IF|FOR|WHILE|DO|END|RETURN|BREAK|CONTINUE|ASYNC|AWAIT|DELEGATE|USE|EXECUTE|GOTO)\b/);
        if (!match) return;
        const keyword = match[1];
        const start = line.indexOf(keyword);
        if (start >= 0) {
          addToken(lineIndex, start, keyword.length, "keyword");
        }
      };
      const addOperatorToken = (span, operator) => {
        const startOffset = span.start.offset;
        const endOffset = span.end.offset;
        const slice = state.content.slice(startOffset, endOffset);
        let index = -1;
        if (operator === "AND" || operator === "OR" || operator === "NOT") {
          const regex = new RegExp(`\\b${operator}\\b`);
          const match = slice.match(regex);
          if (match && match.index !== void 0) {
            index = match.index;
          }
        } else {
          index = slice.indexOf(operator);
        }
        if (index < 0) return;
        const pos = this.offsetToPosition(startOffset + index, lineOffsets);
        const tokenType = operator === "AND" || operator === "OR" || operator === "NOT" ? "keyword" : "operator";
        addToken(pos.line, pos.character, operator.length, tokenType);
      };
      const addNameToken = (lineIndex, startColumn, endColumn, name, type, allowBare) => {
        if (codeLines.has(lineIndex + 1)) return;
        const line = lines[lineIndex] || "";
        const searchStart = Math.max(0, startColumn);
        const searchEnd = endColumn > 0 ? Math.min(line.length, endColumn) : line.length;
        const slice = line.slice(searchStart, searchEnd);
        let matchIndex = slice.indexOf(name);
        if (matchIndex === -1 && allowBare) {
          const bare = name.replace(/^\$/, "");
          const regex = new RegExp(`\\b${bare}\\b`);
          const match = slice.match(regex);
          if (match && match.index !== void 0) {
            matchIndex = match.index;
            addToken(lineIndex, searchStart + matchIndex, bare.length, type);
            return;
          }
          return;
        }
        if (matchIndex === -1) return;
        addToken(lineIndex, searchStart + matchIndex, name.length, type);
      };
      const addVariableNameToken = (span, name) => {
        const lineIndex = span.start.line - 1;
        addNameToken(lineIndex, span.start.column, span.end.column, `$${name}`, "variable", true);
      };
      const addTypeNameToken = (span, name) => {
        const lineIndex = span.start.line - 1;
        addNameToken(lineIndex, span.start.column, span.end.column, `$${name}`, "type", false);
      };
      const addSemanticSpanTokens = (span) => {
        if (span.span.start.line !== span.span.end.line) {
          addSpanToken(span.span, "semanticSpan");
          return;
        }
        const lineIndex = span.span.start.line - 1;
        const spanStart = span.span.start.column;
        const spanEnd = span.span.end.column;
        const interpolations = span.interpolations.filter((interp) => interp.span.start.line === span.span.start.line).sort((a, b) => a.span.start.column - b.span.start.column);
        let cursor = spanStart;
        for (const interpolation of interpolations) {
          const varStart = interpolation.span.start.column;
          const varEnd = interpolation.span.end.column;
          if (varStart > cursor) {
            addToken(lineIndex, cursor, varStart - cursor, "semanticSpan");
          }
          if (varEnd > varStart) {
            addToken(lineIndex, varStart, varEnd - varStart, "variable");
          }
          cursor = Math.max(cursor, varEnd);
        }
        if (cursor < spanEnd) {
          addToken(lineIndex, cursor, spanEnd - cursor, "semanticSpan");
        }
      };
      const addEnumTokens = (expr) => {
        if (expr.span.start.line !== expr.span.end.line) return;
        const lineIndex = expr.span.start.line - 1;
        const line = lines[lineIndex] ?? "";
        const start = Math.max(0, expr.span.start.column - 2);
        const end = Math.min(line.length, expr.span.end.column + 2);
        if (end <= start) return;
        const stringPattern = /"[^"]*"/g;
        let match;
        while (match = stringPattern.exec(line)) {
          const tokenStart = match.index;
          const tokenEnd = match.index + match[0].length;
          if (tokenStart >= start && tokenEnd <= end) {
            addToken(lineIndex, tokenStart, match[0].length, "string");
          }
        }
      };
      const collectTypeExprTokens = (expr) => {
        switch (expr.kind) {
          case "SemanticType":
            addSpanToken(expr.span, "semanticSpan");
            break;
          case "EnumType":
            addEnumTokens(expr);
            break;
          case "CompoundType":
            expr.elements.forEach(collectTypeExprTokens);
            break;
          case "ArrayType":
            collectTypeExprTokens(expr.elementType);
            break;
          case "FunctionType":
            collectTypeExprTokens(expr.returnType);
            break;
          case "TypeReference":
            addSpanToken(expr.span, "type");
            break;
        }
      };
      const collectExpressionTokens = (expr) => {
        switch (expr.kind) {
          case "VariableReference":
            addSpanToken(expr.span, "variable");
            break;
          case "InferredVariable":
            addSpanToken(expr.span, "variable");
            break;
          case "StringLiteral":
            addStringToken(expr.span);
            break;
          case "NumberLiteral":
            addSpanToken(expr.span, "number");
            break;
          case "BooleanLiteral":
            addSpanToken(expr.span, "keyword");
            break;
          case "Link":
            addSpanToken(expr.span, "link");
            break;
          case "Anchor":
            addSpanToken(expr.span, "anchor");
            break;
          case "TemplateLiteral":
            for (const part of expr.parts) {
              if (typeof part !== "string") {
                collectExpressionTokens(part);
              }
            }
            break;
          case "ArrayLiteral":
            for (const el of expr.elements) {
              collectExpressionTokens(el);
            }
            break;
          case "BinaryExpression":
            collectExpressionTokens(expr.left);
            collectExpressionTokens(expr.right);
            addOperatorToken(expr.span, expr.operator);
            break;
          case "UnaryExpression":
            collectExpressionTokens(expr.operand);
            addOperatorToken(expr.span, expr.operator);
            break;
          case "LambdaExpression":
            collectExpressionTokens(expr.body);
            break;
          case "FunctionCall":
            collectExpressionTokens(expr.callee);
            for (const arg of expr.args) {
              collectExpressionTokens(arg);
            }
            break;
          case "MemberAccess":
            collectExpressionTokens(expr.object);
            break;
          case "InlineText":
            break;
        }
      };
      const collectConditionTokens = (cond) => {
        switch (cond.kind) {
          case "SemanticCondition":
            addSpanToken(cond.span, "semanticSpan");
            break;
          case "DeterministicCondition":
            collectExpressionTokens(cond.left);
            collectExpressionTokens(cond.right);
            addOperatorToken(cond.span, cond.operator);
            break;
          case "CompoundCondition":
            collectConditionTokens(cond.left);
            collectConditionTokens(cond.right);
            addOperatorToken(cond.span, cond.operator);
            break;
        }
      };
      const collectBlockTokens = (sectionTitle, blocks) => {
        const isLegacySection = sectionTitle === "Types" || sectionTitle === "Input" || sectionTitle === "Context";
        for (const block of blocks) {
          switch (block.kind) {
            case "TypeDefinition":
              if (!isLegacySection) {
                addTypeNameToken(block.span, block.name);
                collectTypeExprTokens(block.typeExpr);
              }
              break;
            case "VariableDeclaration":
              if (!isLegacySection) {
                addVariableNameToken(block.span, block.name);
                if (block.typeAnnotation) {
                  if (block.typeAnnotation.kind === "TypeReference") {
                    addTypeNameToken(block.typeAnnotation.span, block.typeAnnotation.name);
                  } else if (block.typeAnnotation.kind === "SemanticType") {
                    addSpanToken(block.typeAnnotation.span, "semanticSpan");
                  }
                }
              }
              if (block.value) {
                collectExpressionTokens(block.value);
              }
              break;
            case "ForEachStatement":
              if (block.pattern.kind === "SimplePattern") {
                addVariableNameToken(block.pattern.span, block.pattern.name);
              } else {
                for (const name of block.pattern.names) {
                  addVariableNameToken(block.pattern.span, name);
                }
              }
              collectExpressionTokens(block.collection);
              collectBlockTokens(sectionTitle, block.body);
              break;
            case "WhileStatement":
              collectConditionTokens(block.condition);
              collectBlockTokens(sectionTitle, block.body);
              break;
            case "IfStatement":
              collectConditionTokens(block.condition);
              collectBlockTokens(sectionTitle, block.thenBody);
              for (const clause of block.elseIf) {
                collectConditionTokens(clause.condition);
                collectBlockTokens(sectionTitle, clause.body);
              }
              if (block.elseBody) {
                collectBlockTokens(sectionTitle, block.elseBody);
              }
              break;
            case "DoStatement": {
              const doBlock = block;
              if (doBlock.instruction) {
                addSemanticSpanTokens(doBlock.instruction);
              }
              if (doBlock.body) {
                collectBlockTokens(sectionTitle, doBlock.body);
              }
              break;
            }
            case "ReturnStatement":
              if (block.value) {
                collectExpressionTokens(block.value);
              }
              break;
            case "PushStatement":
              collectExpressionTokens(block.target);
              collectExpressionTokens(block.value);
              break;
            case "DelegateStatement":
              if (block.task) addSemanticSpanTokens(block.task);
              if (block.target) addSpanToken(block.target.span, "link");
              if (block.withAnchor) addSpanToken(block.withAnchor.span, "anchor");
              if (block.parameters) {
                for (const param of block.parameters.parameters) {
                  addVariableNameToken(param.span, param.name);
                  if (param.value) collectExpressionTokens(param.value);
                }
              }
              break;
            case "UseStatement":
              addSpanToken(block.link.span, "link");
              addSemanticSpanTokens(block.task);
              if (block.parameters) {
                for (const param of block.parameters.parameters) {
                  addVariableNameToken(param.span, param.name);
                  if (param.value) collectExpressionTokens(param.value);
                }
              }
              break;
            case "ExecuteStatement":
              addSpanToken(block.link.span, "link");
              addSemanticSpanTokens(block.task);
              break;
            case "GotoStatement":
              addSpanToken(block.anchor.span, "anchor");
              break;
            case "Delegation":
              addSpanToken(block.target.span, block.target.kind === "Link" ? "link" : "anchor");
              for (const param of block.parameters) {
                addVariableNameToken(param.span, param.name);
                if (param.value) collectExpressionTokens(param.value);
              }
              break;
            case "Paragraph":
              for (const item of block.content) {
                switch (item.kind) {
                  case "VariableReference":
                  case "InferredVariable":
                    addSpanToken(item.span, "variable");
                    break;
                  case "Link":
                    addSpanToken(item.span, "link");
                    break;
                  case "Anchor":
                    addSpanToken(item.span, "anchor");
                    break;
                  case "CodeSpan":
                    break;
                }
              }
              break;
            case "CodeBlock":
            case "List":
            case "HorizontalRule":
              break;
          }
        }
      };
      for (const section of state.ast.sections) {
        collectBlockTokens(section.title, section.content);
      }
      addFrontmatterTokens();
      for (let i = 0; i < lines.length; i += 1) {
        addHeadingFromLine(i, lines[i]);
        addKeywordFromLine(i, lines[i]);
        addInlineKeywordFromLine(i, lines[i]);
        addSemanticMarkerFromLine(i, lines[i]);
        addTemplateTokensFromLine(i, lines[i]);
        addFrontmatterInlineTokens(i, lines[i]);
      }
      tokens.sort((a, b) => a.line - b.line || a.char - b.char);
      const data = [];
      let prevLine = 0;
      let prevChar = 0;
      for (const token of tokens) {
        const deltaLine = token.line - prevLine;
        const deltaChar = deltaLine === 0 ? token.char - prevChar : token.char;
        data.push(deltaLine, deltaChar, token.length, token.type, token.modifiers);
        prevLine = token.line;
        prevChar = token.char;
      }
      return { data };
    }
    // -- MDZ_SEMANTIC_TOKENS_END
    // ==========================================================================
    // Diagnostics
    // ==========================================================================
    getDiagnostics(state) {
      const diagnostics = [];
      for (const error of state.ast.errors) {
        diagnostics.push({
          range: this.spanToRange(error.span),
          severity: 1 /* Error */,
          message: error.message,
          source: "zen"
        });
      }
      for (const ref of state.references) {
        if (ref.kind === "link" && ref.path) {
          const linkPath = ref.path.join("/");
          const targetState = this.skillRegistry.get(linkPath);
          if (!targetState) {
            diagnostics.push({
              range: this.spanToRange(ref.span),
              severity: 3 /* Information */,
              message: `File not found in workspace: ~/${linkPath}`,
              source: "zen"
            });
          } else if (ref.anchor) {
            const section = targetState.ast.sections.find((s) => s.anchor === ref.anchor);
            if (!section) {
              diagnostics.push({
                range: this.spanToRange(ref.span),
                severity: 2 /* Warning */,
                message: `Section "${ref.anchor}" not found in ~/${linkPath}`,
                source: "zen"
              });
            }
          }
        } else if (ref.kind === "anchor" && ref.anchor) {
          const section = state.ast.sections.find((s) => s.anchor === ref.anchor);
          if (!section) {
            diagnostics.push({
              range: this.spanToRange(ref.span),
              severity: 2 /* Warning */,
              message: `Section "${ref.anchor}" not found in current file`,
              source: "zen"
            });
          }
        }
      }
      this.validateDelegationContracts(state, diagnostics);
      return diagnostics;
    }
    // ==========================================================================
    // Go-to-Definition
    // ==========================================================================
    getDefinition(uri, position) {
      const state = this.documents.get(uri);
      if (!state) return null;
      for (const [name, info] of state.variables) {
        if (this.positionInSpan(position, info.span)) {
          return {
            uri,
            range: this.spanToRange(info.span)
          };
        }
      }
      for (const [name, info] of state.types) {
        if (this.positionInSpan(position, info.span)) {
          return {
            uri,
            range: this.spanToRange(info.span)
          };
        }
      }
      for (const ref of state.references) {
        if (!this.positionInSpan(position, ref.span)) continue;
        if (ref.kind === "link" && ref.path) {
          const linkPath = ref.path.join("/");
          const targetState = this.skillRegistry.get(linkPath);
          if (targetState) {
            if (ref.anchor) {
              const section = targetState.ast.sections.find((s) => s.anchor === ref.anchor);
              if (section) {
                return {
                  uri: targetState.uri,
                  range: this.spanToRange(section.span)
                };
              }
            }
            return {
              uri: targetState.uri,
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
            };
          }
        } else if (ref.kind === "anchor" && ref.anchor) {
          const section = state.ast.sections.find((s) => s.anchor === ref.anchor);
          if (section) {
            return {
              uri,
              range: this.spanToRange(section.span)
            };
          }
        }
      }
      return null;
    }
    // ==========================================================================
    // Hover
    // ==========================================================================
    getHover(uri, position) {
      const state = this.documents.get(uri);
      if (!state) return null;
      for (const [name, info] of state.types) {
        if (this.positionInSpan(position, info.span)) {
          return {
            contents: `**Type** $${name}

${info.definition}`,
            range: this.spanToRange(info.span)
          };
        }
      }
      for (const [name, info] of state.variables) {
        if (this.positionInSpan(position, info.span)) {
          let contents = `**Variable** $${name}`;
          const typeExpr = info.typeExpr || this.inferVariableType(state, name);
          if (typeExpr) {
            const typeLabel = this.typeExprToString(typeExpr);
            contents += `: ${typeLabel}`;
            if (typeExpr.kind === "TypeReference") {
              const type = state.types.get(typeExpr.name);
              if (type) {
                contents += `

${type.definition}`;
              }
            }
          }
          if (info.source !== "local") {
            contents += `

*${info.source}*`;
          }
          if (info.isLambda) {
            contents += "\n\n*Lambda function*";
          }
          return {
            contents,
            range: this.spanToRange(info.span)
          };
        }
      }
      for (const ref of state.references) {
        if (this.positionInSpan(position, ref.span)) {
          let contents;
          if (ref.kind === "link" && ref.path) {
            const linkPath = ref.path.join("/");
            const linkKind = this.inferLinkKind(ref.path);
            const targetState = this.skillRegistry.get(linkPath);
            if (!targetState) {
              contents = `**${linkKind}:** ${ref.target}

*Not found in workspace*`;
            } else {
              contents = `**${linkKind}:** ${ref.target}`;
              if (targetState.ast.frontmatter?.description) {
                contents += `

${targetState.ast.frontmatter.description}`;
              }
              const sections = targetState.ast.sections.filter((s) => s.anchor).map((s) => s.anchor);
              if (sections.length > 0) {
                contents += `

Sections: ${sections.join(", ")}`;
              }
              if (targetState.parameters.length > 0) {
                contents += `

**Input Contract:**
` + targetState.parameters.map(
                  (p) => `- $${p.name}: ${this.typeExprToString(p.typeExpr)}${p.isRequired ? "" : " (optional)"}`
                ).join("\n");
              }
            }
          } else if (ref.kind === "anchor") {
            const section = state.ast.sections.find((s) => s.anchor === ref.anchor);
            contents = `**Anchor** ${ref.target}`;
            if (section?.title) {
              contents += `

Section: ${section.title}`;
            }
          } else {
            continue;
          }
          return {
            contents,
            range: this.spanToRange(ref.span)
          };
        }
      }
      return null;
    }
    inferVariableType(state, name) {
      const existing = state.variableTypes.get(name);
      if (existing) return existing;
      for (const section of state.ast.sections) {
        for (const block of section.content) {
          if (block.kind === "VariableDeclaration" && block.name === name && block.value) {
            return inferType(block.value, state.typeEnv);
          }
        }
      }
      return void 0;
    }
    // ==========================================================================
    // Completion
    // ==========================================================================
    getCompletions(uri, position) {
      const state = this.documents.get(uri);
      if (!state) return [];
      const lineContent = state.content.split("\n")[position.line] || "";
      const beforeCursor = lineContent.substring(0, position.character);
      if (beforeCursor.endsWith("~/")) {
        return this.getPathCompletions("");
      }
      const linkMatch = beforeCursor.match(/~\/([a-z0-9\/-]*)$/);
      if (linkMatch) {
        const partial = linkMatch[1];
        const anchorInLink = partial.match(/^([^#]+)#([a-z0-9-]*)$/);
        if (anchorInLink) {
          const [, linkPath, anchorPrefix] = anchorInLink;
          return this.getCrossFileAnchorCompletions(linkPath, anchorPrefix);
        }
        return this.getPathCompletions(partial);
      }
      if (beforeCursor.endsWith("#") && !beforeCursor.match(/~\/[^#]*#$/)) {
        return this.getAnchorCompletions(state);
      }
      const anchorMatch = beforeCursor.match(/(?<!~\/[^#]*)#([a-z0-9-]+)$/);
      if (anchorMatch) {
        const prefix = anchorMatch[1];
        return this.getAnchorCompletions(state).filter(
          (c) => c.label.toLowerCase().startsWith(prefix.toLowerCase())
        );
      }
      if (beforeCursor.endsWith("$")) {
        return [
          ...this.getVariableCompletions(state),
          ...this.getTypeCompletions(state)
        ];
      }
      const varMatch = beforeCursor.match(/\$([a-zA-Z0-9-]*)$/);
      if (varMatch) {
        const prefix = varMatch[1];
        const all = [
          ...this.getVariableCompletions(state),
          ...this.getTypeCompletions(state)
        ];
        return all.filter(
          (c) => c.label.toLowerCase().startsWith(prefix.toLowerCase())
        );
      }
      if (beforeCursor.endsWith("/")) {
        return this.getSemanticCompletions();
      }
      if (/^\s*$/.test(beforeCursor)) {
        return this.getKeywordCompletions();
      }
      return [];
    }
    // v0.10: Path completion for ~/path/to/file
    getPathCompletions(partial) {
      const items = [];
      for (const [key, docState] of this.skillRegistry) {
        if (key.startsWith(partial)) {
          const kind = this.inferLinkKind(key.split("/"));
          items.push({
            label: "~/" + key,
            kind: 17 /* File */,
            detail: kind,
            // Use full key to avoid offset corruption
            insertText: key
          });
        }
      }
      return items;
    }
    // v0.8: Anchor completion for cross-file references (~/path#anchor)
    getCrossFileAnchorCompletions(linkPath, prefix) {
      const targetState = this.skillRegistry.get(linkPath);
      if (!targetState) return [];
      const items = [];
      for (const section of targetState.ast.sections) {
        if (section.anchor && section.anchor.startsWith(prefix)) {
          items.push({
            label: "#" + section.anchor,
            kind: 18 /* Reference */,
            detail: section.title || "Section",
            insertText: section.anchor.substring(prefix.length)
          });
        }
      }
      return items;
    }
    // v0.8: Anchor completion for same-file references (#anchor)
    getAnchorCompletions(state) {
      const items = [];
      for (const section of state.ast.sections) {
        if (section.anchor) {
          items.push({
            label: "#" + section.anchor,
            kind: 18 /* Reference */,
            detail: section.title || "Section",
            insertText: section.anchor
          });
        }
      }
      return items;
    }
    getVariableCompletions(state) {
      const items = [];
      for (const [name, info] of state.variables) {
        const typeExpr = info.typeExpr || this.inferVariableType(state, name);
        items.push({
          label: name,
          kind: info.isLambda ? 3 /* Function */ : 6 /* Variable */,
          detail: typeExpr ? this.typeExprToString(typeExpr) : void 0
        });
      }
      return items;
    }
    getTypeCompletions(state) {
      const items = [];
      for (const [name, info] of state.types) {
        items.push({
          label: name,
          kind: 7 /* Class */,
          detail: info.definition
        });
      }
      const builtins = ["FilePath", "String", "Number", "Boolean"];
      for (const name of builtins) {
        items.push({
          label: name,
          kind: 7 /* Class */,
          detail: `Built-in type`
        });
      }
      return items;
    }
    getSemanticCompletions() {
      return [
        { label: "appropriate location", kind: 15 /* Snippet */, insertText: "appropriate location/" },
        { label: "relevant context", kind: 15 /* Snippet */, insertText: "relevant context/" },
        { label: "best approach for", kind: 15 /* Snippet */, insertText: "best approach for /" },
        { label: "determine based on", kind: 15 /* Snippet */, insertText: "determine based on /" }
      ];
    }
    getKeywordCompletions() {
      return [
        { label: "FOR", kind: 14 /* Keyword */, insertText: "FOR $item IN $items\n  \nEND" },
        { label: "WHILE", kind: 14 /* Keyword */, insertText: "WHILE /condition/ DO\n  \nEND" },
        { label: "IF", kind: 14 /* Keyword */, insertText: "IF $condition THEN\n  \nEND" },
        { label: "ELSE", kind: 14 /* Keyword */, insertText: "ELSE\n  " },
        { label: "DO", kind: 14 /* Keyword */, insertText: "DO\n  \nEND" },
        { label: "END", kind: 14 /* Keyword */, insertText: "END" }
      ];
    }
    // ==========================================================================
    // Link Helpers
    // ==========================================================================
    inferLinkKind(path) {
      const folder = path[0];
      if (folder === "agent" || folder === "agents") return "agent";
      if (folder === "skill" || folder === "skills") return "skill";
      if (folder === "tool" || folder === "tools") return "tool";
      return "link";
    }
    // ==========================================================================
    // Document Symbols
    // ==========================================================================
    getDocumentSymbols(uri) {
      const state = this.documents.get(uri);
      if (!state) return [];
      const symbols = [];
      for (const section of state.ast.sections) {
        if (section.title === "Types" || section.title === "Input" || section.title === "Context") {
          continue;
        }
        const children = [];
        for (const block of section.content) {
          if (block.kind === "VariableDeclaration") {
            children.push({
              name: `$${block.name}`,
              kind: block.isLambda ? 12 /* Function */ : 13 /* Variable */,
              range: this.spanToRange(block.span),
              selectionRange: this.spanToRange(block.span)
            });
          }
        }
        symbols.push({
          name: section.title || "(untitled)",
          kind: 3 /* Namespace */,
          range: this.spanToRange(section.span),
          selectionRange: this.spanToRange(section.span),
          children: children.length > 0 ? children : void 0
        });
      }
      return symbols;
    }
    // ==========================================================================
    // Utilities
    // ==========================================================================
    spanToRange(span) {
      return {
        start: { line: span.start.line - 1, character: span.start.column },
        end: { line: span.end.line - 1, character: span.end.column }
      };
    }
    positionInSpan(pos, span) {
      const line = pos.line + 1;
      const char = pos.character;
      if (line < span.start.line || line > span.end.line) return false;
      if (line === span.start.line && char < span.start.column) return false;
      if (line === span.end.line && char > span.end.column) return false;
      return true;
    }
    buildLineOffsets(content) {
      const offsets = [];
      let current = 0;
      offsets.push(0);
      for (const char of content) {
        current += 1;
        if (char === "\n") {
          offsets.push(current);
        }
      }
      return offsets;
    }
    offsetToPosition(offset, lineOffsets) {
      let line = 0;
      while (line + 1 < lineOffsets.length && lineOffsets[line + 1] <= offset) {
        line += 1;
      }
      const lineOffset = lineOffsets[line] ?? 0;
      return { line, character: offset - lineOffset };
    }
    collectCodeBlockLines(ast) {
      const lines = /* @__PURE__ */ new Set();
      for (const section of ast.sections) {
        for (const block of section.content) {
          if (block.kind !== "CodeBlock") continue;
          const start = block.span.start.line;
          const end = block.span.end.line;
          for (let line = start; line <= end; line += 1) {
            lines.add(line);
          }
        }
      }
      return lines;
    }
    collectParameters(ast) {
      const params = [];
      if (ast.frontmatter) {
        for (const inputDecl of ast.frontmatter.input) {
          params.push({
            name: inputDecl.name,
            typeExpr: inputDecl.type ?? makeAnyTypeReference(),
            isRequired: inputDecl.required,
            span: inputDecl.span
          });
        }
      }
      for (const section of ast.sections) {
        if (section.title !== "Input") continue;
        for (const block of section.content) {
          if (block.kind !== "VariableDeclaration") continue;
          params.push({
            name: block.name,
            typeExpr: block.typeAnnotation ?? makeAnyTypeReference(),
            isRequired: block.isRequired ?? block.value === null,
            span: block.span
          });
        }
      }
      return params;
    }
    buildTypeEnv(types, ast) {
      const env = /* @__PURE__ */ new Map();
      for (const [name, info] of types) {
        env.set(name, info.typeExpr);
      }
      if (ast.frontmatter) {
        for (const typeDecl of ast.frontmatter.types) {
          env.set(typeDecl.name, typeDecl.typeExpr);
        }
      }
      return env;
    }
    buildVariableTypes(variables) {
      const map = /* @__PURE__ */ new Map();
      for (const [name, info] of variables) {
        if (info.typeExpr) {
          map.set(name, info.typeExpr);
          continue;
        }
        if (info.isLambda) {
          map.set(name, makeAnyTypeReference());
        }
      }
      return map;
    }
    validateDelegationContracts(state, diagnostics) {
      for (const section of state.ast.sections) {
        this.validateContractsInBlocks(section.title, section.content, state, diagnostics);
      }
    }
    validateContractsInBlocks(sectionTitle, blocks, state, diagnostics) {
      const isLegacySection = sectionTitle === "Types" || sectionTitle === "Input" || sectionTitle === "Context";
      for (const block of blocks) {
        switch (block.kind) {
          case "Delegation":
            this.validateDelegation(block, state, diagnostics);
            break;
          case "DelegateStatement":
            this.validateDelegateStatement(block, state, diagnostics);
            break;
          case "UseStatement":
            this.validateUseStatement(block, state, diagnostics);
            break;
          case "ForEachStatement":
          case "WhileStatement":
            this.validateContractsInBlocks(sectionTitle, block.body, state, diagnostics);
            break;
          case "IfStatement":
            this.validateContractsInBlocks(sectionTitle, block.thenBody, state, diagnostics);
            for (const clause of block.elseIf) {
              this.validateContractsInBlocks(sectionTitle, clause.body, state, diagnostics);
            }
            if (block.elseBody) {
              this.validateContractsInBlocks(sectionTitle, block.elseBody, state, diagnostics);
            }
            break;
          case "DoStatement":
            if (block.body) {
              this.validateContractsInBlocks(sectionTitle, block.body, state, diagnostics);
            }
            break;
        }
      }
    }
    validateDelegation(deleg, state, diagnostics) {
      if (deleg.target.kind !== "Link") return;
      this.validateParameterBlock(deleg.parameters, deleg.target, state, diagnostics);
    }
    validateDelegateStatement(deleg, state, diagnostics) {
      if (!deleg.target || !deleg.parameters) return;
      this.validateParameterBlock(deleg.parameters.parameters, deleg.target, state, diagnostics);
    }
    validateUseStatement(stmt, state, diagnostics) {
      if (!stmt.parameters) return;
      this.validateParameterBlock(stmt.parameters.parameters, stmt.link, state, diagnostics);
    }
    validateParameterBlock(parameters, target, state, diagnostics) {
      const targetPath = target.path.join("/");
      const targetState = this.skillRegistry.get(targetPath);
      if (!targetState) return;
      const requiredParams = targetState.parameters.filter((param) => param.isRequired);
      const provided = new Set(parameters.map((param) => param.name));
      for (const required of requiredParams) {
        if (!provided.has(required.name)) {
          diagnostics.push({
            range: this.spanToRange(target.span),
            severity: 1 /* Error */,
            message: `Required parameter "${required.name}" is missing for "${targetPath}"`,
            source: "zen"
          });
        }
      }
      for (const param of parameters) {
        const expected = targetState.parameters.find((item) => item.name === param.name);
        if (!expected) {
          diagnostics.push({
            range: this.spanToRange(param.span),
            severity: 2 /* Warning */,
            message: `Parameter "${param.name}" is not defined for "${targetPath}"`,
            source: "zen"
          });
          continue;
        }
        const actualType = this.inferParameterType(param, state);
        const compatibility = isCompatible(actualType, expected.typeExpr, targetState.typeEnv);
        if (!compatibility.compatible) {
          diagnostics.push({
            range: this.spanToRange(param.span),
            severity: 1 /* Error */,
            message: `Parameter "${param.name}" expects ${this.formatTypeExpr(expected.typeExpr)} but received ${this.formatTypeExpr(actualType)}`,
            source: "zen"
          });
        }
      }
    }
    inferParameterType(param, state) {
      if (param.typeAnnotation) {
        return param.typeAnnotation;
      }
      if (param.value) {
        return inferType(param.value, state.variableTypes);
      }
      return makeAnyTypeReference();
    }
    formatTypeExpr(expr) {
      return this.typeExprToString(expr);
    }
    inferExpressionType(expr, state) {
      return inferType(expr, state.variableTypes);
    }
    collectFrontmatterDeclarationSpans(content) {
      const maps = {
        types: /* @__PURE__ */ new Map(),
        input: /* @__PURE__ */ new Map(),
        context: /* @__PURE__ */ new Map()
      };
      const lines = content.split("\n");
      if (lines[0]?.trim() !== "---") return maps;
      let offset = lines[0].length + 1;
      let currentSection = null;
      let sectionIndent = null;
      for (let index = 1; index < lines.length; index += 1) {
        const line = lines[index] ?? "";
        const trimmed = line.trim();
        if (trimmed === "---") {
          break;
        }
        const indentMatch = line.match(/^\s*/);
        const indent = indentMatch ? indentMatch[0].length : 0;
        const sectionMatch = line.match(/^\s*(types|input|context):\s*$/);
        if (sectionMatch) {
          currentSection = sectionMatch[1];
          sectionIndent = indent;
          offset += line.length + 1;
          continue;
        }
        if (!currentSection) {
          offset += line.length + 1;
          continue;
        }
        if (sectionIndent !== null && indent <= sectionIndent) {
          currentSection = null;
          sectionIndent = null;
          offset += line.length + 1;
          continue;
        }
        const entryMatch = line.match(/^\s*(\$?[A-Za-z0-9_-]+)\s*:/);
        if (entryMatch) {
          const name = entryMatch[1].replace(/^\$/, "");
          const startColumn = entryMatch.index ?? 0;
          const endColumn = startColumn + entryMatch[0].length;
          maps[currentSection].set(name, createSpan(
            index + 1,
            startColumn,
            offset + startColumn,
            index + 1,
            endColumn,
            offset + endColumn
          ));
        }
        offset += line.length + 1;
      }
      return maps;
    }
  };

  // src/zen-worker-entry.ts
  var lspServer = new ZenLanguageServer();
  function handleParse(id, source) {
    try {
      const result = parse(source);
      postMessage({
        type: "parse",
        id,
        result
      });
    } catch (error) {
      postMessage({
        type: "error",
        id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  function handleValidate(id, source) {
    try {
      const compileResult = compile(source);
      const result = {
        diagnostics: compileResult.diagnostics.map((d) => ({
          severity: d.severity,
          code: d.code,
          message: d.message,
          line: d.span.start.line,
          column: d.span.start.column,
          endLine: d.span.end.line,
          endColumn: d.span.end.column
        })),
        metadata: {
          name: compileResult.metadata.name,
          description: compileResult.metadata.description,
          uses: compileResult.metadata.uses,
          types: compileResult.metadata.types.map((t) => ({
            name: t.name,
            definition: t.definition
          })),
          variables: compileResult.metadata.variables.map((v) => ({
            name: v.name,
            type: v.type
          })),
          references: compileResult.metadata.references.map((r) => ({
            kind: r.kind,
            target: r.target
          })),
          sections: compileResult.metadata.sections.map((s) => ({
            title: s.title,
            anchor: s.anchor,
            level: s.level
          }))
        },
        dependencies: {
          nodes: compileResult.dependencies.nodes,
          edges: compileResult.dependencies.edges.map((e) => ({
            target: e.target,
            type: e.type
          }))
        }
      };
      postMessage({
        type: "validate",
        id,
        result
      });
    } catch (error) {
      postMessage({
        type: "error",
        id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  function handleCompletions(id, uri, source, position) {
    try {
      lspServer.updateDocument(uri, source);
      const result = lspServer.getCompletions(uri, position);
      postMessage({
        type: "completions",
        id,
        result
      });
    } catch (error) {
      postMessage({
        type: "error",
        id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  function handleHover(id, uri, source, position) {
    try {
      lspServer.updateDocument(uri, source);
      const result = lspServer.getHover(uri, position);
      postMessage({
        type: "hover",
        id,
        result
      });
    } catch (error) {
      postMessage({
        type: "error",
        id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  function handleDiagnostics(id, uri, source) {
    try {
      const result = lspServer.updateDocument(uri, source);
      postMessage({
        type: "diagnostics",
        id,
        result
      });
    } catch (error) {
      postMessage({
        type: "error",
        id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  function handleSemanticTokens(id, uri, source) {
    try {
      lspServer.updateDocument(uri, source);
      const result = lspServer.getSemanticTokens(uri);
      postMessage({
        type: "semanticTokens",
        id,
        result
      });
    } catch (error) {
      postMessage({
        type: "error",
        id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  function handleValidateProject(id, files) {
    try {
      const fileResults = {};
      const allNodes = /* @__PURE__ */ new Map();
      const allEdges = [];
      for (const [fileName, source] of Object.entries(files)) {
        lspServer.updateDocument(fileName, source);
      }
      const skillToFile = /* @__PURE__ */ new Map();
      for (const [fileName, source] of Object.entries(files)) {
        const compileResult = compile(source);
        if (compileResult.metadata.name) {
          skillToFile.set(compileResult.metadata.name, fileName);
        }
      }
      for (const [fileName, source] of Object.entries(files)) {
        const compileResult = compile(source);
        const skillName = compileResult.metadata.name;
        fileResults[fileName] = {
          diagnostics: compileResult.diagnostics.map((d) => ({
            severity: d.severity,
            code: d.code,
            message: d.message,
            line: d.span.start.line,
            column: d.span.start.column,
            endLine: d.span.end.line,
            endColumn: d.span.end.column
          })),
          metadata: {
            name: compileResult.metadata.name,
            description: compileResult.metadata.description,
            uses: compileResult.metadata.uses,
            types: compileResult.metadata.types.map((t) => ({
              name: t.name,
              definition: t.definition
            })),
            variables: compileResult.metadata.variables.map((v) => ({
              name: v.name,
              type: v.type
            })),
            references: compileResult.metadata.references.map((r) => ({
              kind: r.kind,
              target: r.target
            })),
            sections: compileResult.metadata.sections.map((s) => ({
              title: s.title,
              anchor: s.anchor,
              level: s.level
            }))
          },
          dependencies: {
            nodes: compileResult.dependencies.nodes,
            edges: compileResult.dependencies.edges.map((e) => ({
              target: e.target,
              type: e.type
            }))
          }
        };
        if (skillName) {
          allNodes.set(skillName, fileName);
        }
        for (const dep of compileResult.dependencies.nodes) {
          if (!allNodes.has(dep)) {
            allNodes.set(dep, skillToFile.get(dep) || null);
          }
        }
        for (const edge of compileResult.dependencies.edges) {
          if (skillName) {
            allEdges.push({
              source: skillName,
              target: edge.target,
              type: edge.type
            });
          }
        }
      }
      const result = {
        fileResults,
        unifiedGraph: {
          nodes: Array.from(allNodes.entries()).map(([id2, file]) => ({ id: id2, file })),
          edges: allEdges
        }
      };
      postMessage({
        type: "validateProject",
        id,
        result
      });
    } catch (error) {
      postMessage({
        type: "error",
        id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  self.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "parse":
        handleParse(message.id, message.source);
        break;
      case "validate":
        handleValidate(message.id, message.source);
        break;
      case "validateProject":
        handleValidateProject(message.id, message.files);
        break;
      case "completions":
        handleCompletions(message.id, message.uri, message.source, message.position);
        break;
      case "hover":
        handleHover(message.id, message.uri, message.source, message.position);
        break;
      case "diagnostics":
        handleDiagnostics(message.id, message.uri, message.source);
        break;
      case "semanticTokens":
        handleSemanticTokens(message.id, message.uri, message.source);
        break;
      default:
        postMessage({
          type: "error",
          id: message.id || 0,
          error: `Unknown message type: ${message.type}`
        });
    }
  });
  postMessage({ type: "ready" });
})();
//# sourceMappingURL=zen-worker.js.map
