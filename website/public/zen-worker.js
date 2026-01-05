"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // ../packages/core/dist/parser/ast.js
  var require_ast = __commonJS({
    "../packages/core/dist/parser/ast.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.createSpan = createSpan2;
      exports.mergeSpans = mergeSpans2;
      exports.isTypeDefinition = isTypeDefinition;
      exports.isVariableDeclaration = isVariableDeclaration;
      exports.isControlFlow = isControlFlow;
      exports.isLoopStatement = isLoopStatement;
      exports.isReference = isReference;
      function createSpan2(startLine, startColumn, startOffset, endLine, endColumn, endOffset) {
        return {
          start: { line: startLine, column: startColumn, offset: startOffset },
          end: { line: endLine, column: endColumn, offset: endOffset }
        };
      }
      function mergeSpans2(a, b) {
        return {
          start: a.start.offset < b.start.offset ? a.start : b.start,
          end: a.end.offset > b.end.offset ? a.end : b.end
        };
      }
      function isTypeDefinition(node) {
        return node.kind === "TypeDefinition";
      }
      function isVariableDeclaration(node) {
        return node.kind === "VariableDeclaration";
      }
      function isControlFlow(node) {
        return node.kind === "ForEachStatement" || node.kind === "ParallelForEachStatement" || node.kind === "WhileStatement" || node.kind === "IfStatement";
      }
      function isLoopStatement(node) {
        return node.kind === "ForEachStatement" || node.kind === "ParallelForEachStatement" || node.kind === "WhileStatement";
      }
      function isReference(node) {
        return node.kind === "SkillReference" || node.kind === "SectionReference";
      }
    }
  });

  // ../packages/core/dist/parser/lexer.js
  var require_lexer = __commonJS({
    "../packages/core/dist/parser/lexer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Lexer = void 0;
      exports.tokenize = tokenize2;
      var ast_1 = require_ast();
      var Lexer2 = class {
        constructor(source) {
          __publicField(this, "source");
          __publicField(this, "pos", 0);
          __publicField(this, "line", 1);
          __publicField(this, "column", 0);
          __publicField(this, "tokens", []);
          __publicField(this, "indentStack", [0]);
          this.source = source;
        }
        tokenize() {
          while (!this.isAtEnd()) {
            this.scanToken();
          }
          while (this.indentStack.length > 1) {
            this.indentStack.pop();
            this.addToken("DEDENT", "");
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
              if (!this.isAtEnd())
                this.consumeNewline();
              return;
            }
            this.handleIndent();
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
            this.scanHeading();
            return;
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
          if (this.lookAhead("{~~")) {
            this.consumeChars(3);
            this.addToken("SEMANTIC_OPEN", "{~~");
            this.scanSemanticContent();
            return;
          }
          if (this.lookAhead("[[")) {
            this.consumeChars(2);
            this.addToken("DOUBLE_LBRACKET", "[[");
            return;
          }
          if (this.lookAhead("]]")) {
            this.consumeChars(2);
            this.addToken("DOUBLE_RBRACKET", "]]");
            return;
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
          if (char === "#") {
            this.scanHashIdent();
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
        handleIndent() {
          let indent = 0;
          while (this.peek() === " ") {
            indent++;
            this.advance();
          }
          while (this.peek() === "	") {
            indent += 2;
            this.advance();
          }
          if (this.peek() === "\n" || this.isAtEnd()) {
            return;
          }
          const current = this.indentStack[this.indentStack.length - 1];
          if (indent > current) {
            this.indentStack.push(indent);
            this.addToken("INDENT", " ".repeat(indent - current));
          } else if (indent < current) {
            while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent) {
              this.indentStack.pop();
              this.addToken("DEDENT", "");
            }
          }
        }
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
          if (this.peek() === " ")
            this.advance();
          let title = "";
          while (!this.isAtEnd() && this.peek() !== "\n") {
            title += this.advance();
          }
          this.addToken("HEADING", "#".repeat(level) + " " + title);
          if (!this.isAtEnd())
            this.consumeNewline();
        }
        scanCodeBlock() {
          this.consumeChars(3);
          let lang = "";
          while (!this.isAtEnd() && this.peek() !== "\n") {
            lang += this.advance();
          }
          this.addToken("CODE_BLOCK_START", "```" + lang);
          if (!this.isAtEnd())
            this.consumeNewline();
          let content = "";
          while (!this.isAtEnd()) {
            if (this.column === 0 && this.lookAhead("```")) {
              if (content)
                this.addToken("CODE_BLOCK_CONTENT", content);
              this.consumeChars(3);
              this.addToken("CODE_BLOCK_END", "```");
              if (!this.isAtEnd() && this.peek() === "\n")
                this.consumeNewline();
              return;
            }
            if (this.peek() === "\n") {
              content += "\n";
              this.consumeNewlineRaw();
            } else {
              content += this.advance();
            }
          }
          if (content)
            this.addToken("CODE_BLOCK_CONTENT", content);
        }
        scanBlockquote() {
          this.advance();
          let content = "";
          while (!this.isAtEnd() && this.peek() !== "\n") {
            content += this.advance();
          }
          this.addToken("BLOCKQUOTE", ">" + content);
          if (!this.isAtEnd())
            this.consumeNewline();
        }
        scanSemanticContent() {
          let content = "";
          while (!this.isAtEnd() && this.peek() !== "}" && this.peek() !== "\n") {
            content += this.advance();
          }
          if (content)
            this.addToken("SEMANTIC_CONTENT", content);
          if (this.peek() === "}") {
            this.advance();
            this.addToken("SEMANTIC_CLOSE", "}");
          }
        }
        scanDollarIdent() {
          this.advance();
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
        scanHashIdent() {
          this.advance();
          let ident = "";
          while (this.isAlphaNumeric(this.peek()) || this.peek() === "-") {
            ident += this.advance();
          }
          this.addToken("LOWER_IDENT", "#" + ident);
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
                if (this.peek() === "{")
                  depth++;
                if (this.peek() === "}")
                  depth--;
                if (depth > 0)
                  expr += this.advance();
              }
              if (this.peek() === "}")
                this.advance();
              this.addToken("DOLLAR_IDENT", expr);
            } else if (this.lookAhead("{~~")) {
              if (part) {
                this.addToken("TEMPLATE_PART", part);
                part = "";
              }
              this.consumeChars(3);
              this.addToken("SEMANTIC_OPEN", "{~~");
              this.scanSemanticContent();
            } else {
              part += this.advance();
            }
          }
          if (part)
            this.addToken("TEMPLATE_PART", part);
          if (this.peek() === "`") {
            this.advance();
            this.addToken("TEMPLATE_END", "`");
          }
        }
        scanNumber() {
          let num = "";
          if (this.peek() === "-")
            num += this.advance();
          while (this.isDigit(this.peek()))
            num += this.advance();
          if (this.peek() === "." && this.isDigit(this.peekAt(1))) {
            num += this.advance();
            while (this.isDigit(this.peek()))
              num += this.advance();
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
            "EACH": "EACH",
            "IN": "IN",
            "WHILE": "WHILE",
            "IF": "IF",
            "THEN": "THEN",
            "ELSE": "ELSE",
            "AND": "AND",
            "OR": "OR",
            "NOT": "NOT",
            "WITH": "WITH",
            "PARALLEL": "PARALLEL",
            "BREAK": "BREAK",
            "CONTINUE": "CONTINUE",
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
          for (let i = 0; i < n; i++)
            this.advance();
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
        addToken(type, value) {
          const len = value.length;
          this.tokens.push({
            type,
            value,
            span: (0, ast_1.createSpan)(this.line, this.column - len, this.pos - len, this.line, this.column, this.pos)
          });
        }
      };
      exports.Lexer = Lexer2;
      function tokenize2(source) {
        return new Lexer2(source).tokenize();
      }
    }
  });

  // ../packages/core/dist/parser/parser.js
  var require_parser = __commonJS({
    "../packages/core/dist/parser/parser.js"(exports) {
      "use strict";
      var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      } : function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      });
      var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      } : function(o, v) {
        o["default"] = v;
      });
      var __importStar = exports && exports.__importStar || /* @__PURE__ */ function() {
        var ownKeys = function(o) {
          ownKeys = Object.getOwnPropertyNames || function(o2) {
            var ar = [];
            for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
            return ar;
          };
          return ownKeys(o);
        };
        return function(mod) {
          if (mod && mod.__esModule) return mod;
          var result = {};
          if (mod != null) {
            for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
          }
          __setModuleDefault(result, mod);
          return result;
        };
      }();
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Parser = void 0;
      exports.parse = parse3;
      var lexer_1 = require_lexer();
      var AST2 = __importStar(require_ast());
      var Parser2 = class {
        // v0.2: Track if we're inside a loop
        constructor(source) {
          __publicField(this, "source");
          __publicField(this, "tokens", []);
          __publicField(this, "pos", 0);
          __publicField(this, "errors", []);
          __publicField(this, "frontmatterContent", "");
          __publicField(this, "loopDepth", 0);
          this.source = source;
        }
        parse() {
          this.tokens = (0, lexer_1.tokenize)(this.source);
          this.pos = 0;
          this.errors = [];
          this.loopDepth = 0;
          const frontmatter = this.parseFrontmatter();
          const sections = this.parseSections();
          const span = this.tokens.length > 0 ? AST2.mergeSpans(this.tokens[0].span, this.tokens[this.tokens.length - 1].span) : AST2.createSpan(1, 0, 0, 1, 0, 0);
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
          return {
            kind: "Frontmatter",
            name: parsed.name || "",
            description: parsed.description || "",
            uses: parsed.uses || [],
            imports: this.parseImports(parsed.imports),
            raw: parsed,
            span: AST2.mergeSpans(start.span, end.span)
          };
        }
        parseYaml(content) {
          const result = {};
          const lines = content.split("\n");
          let currentKey = "";
          let inArray = false;
          let inImports = false;
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
              } else {
                result[currentKey] = [];
                inArray = true;
                inImports = currentKey === "imports";
              }
              continue;
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
            span: AST2.createSpan(1, 0, 0, 1, 0, 0)
          }));
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
          const span = content.length > 0 ? AST2.mergeSpans(headingToken.span, content[content.length - 1].span) : headingToken.span;
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
            if (this.isAtEnd() || this.check("HEADING"))
              break;
            const block = this.parseBlock();
            if (block) {
              blocks.push(block);
            }
          }
          return blocks;
        }
        parseBlock() {
          if (this.check("TYPE_IDENT")) {
            const lookahead = this.peek(1);
            if (lookahead?.type === "COLON") {
              const afterColon = this.peek(2);
              if (afterColon?.type !== "TYPE_IDENT") {
                return this.parseTypeDefinition();
              }
            }
          }
          if (this.check("LIST_MARKER")) {
            return this.parseListItem();
          }
          if (this.check("DOLLAR_IDENT") || this.check("TYPE_IDENT")) {
            return this.parseVariableOrType();
          }
          if (this.check("PARALLEL")) {
            return this.parseParallelForEach();
          }
          if (this.check("FOR")) {
            return this.parseForEach();
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
          if (this.check("CODE_BLOCK_START")) {
            return this.parseCodeBlock();
          }
          if (this.check("HORIZONTAL_RULE")) {
            return this.parseHorizontalRule();
          }
          if (this.check("BLOCKQUOTE")) {
            return this.parseBlockquote();
          }
          if (this.check("LOWER_IDENT") || this.check("UPPER_IDENT")) {
            const verb = this.current().value.toLowerCase();
            if (verb === "execute" || verb === "call" || verb === "run" || verb === "invoke" || verb === "delegate" || verb === "use") {
              const lookahead = this.peek(1);
              if (lookahead?.type === "DOUBLE_LBRACKET") {
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
            span: AST2.mergeSpans(nameToken.span, typeExpr.span)
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
                span: AST2.mergeSpans(token.span, this.previous().span)
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
            span: AST2.mergeSpans(start.span, this.previous().span)
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
            span: AST2.mergeSpans(start.span, end?.span || this.previous().span)
          };
          if (this.check("LBRACKET")) {
            this.advance();
            this.expect("RBRACKET");
            return {
              kind: "ArrayType",
              elementType: result,
              span: AST2.mergeSpans(start.span, this.previous().span)
            };
          }
          return result;
        }
        parseSemanticTypeDefinition() {
          let description = "";
          const start = this.current();
          while (!this.check("NEWLINE") && !this.isAtEnd()) {
            const token = this.advance();
            if (description)
              description += " ";
            description += token.value;
          }
          return {
            kind: "SemanticType",
            description: description.trim(),
            span: AST2.mergeSpans(start.span, this.previous().span)
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
            span: AST2.mergeSpans(nameToken.span, value?.span || typeAnnotation?.span || nameToken.span)
          };
        }
        findArrow() {
          let i = 0;
          let depth = 0;
          while (i < 10) {
            const token = this.peek(i);
            if (!token)
              return false;
            if (token.type === "LPAREN")
              depth++;
            if (token.type === "RPAREN")
              depth--;
            if (token.type === "ARROW" && depth === 0)
              return true;
            if (token.type === "NEWLINE")
              return false;
            i++;
          }
          return false;
        }
        parseListItem() {
          this.advance();
          if (this.check("DOLLAR_IDENT") || this.check("TYPE_IDENT")) {
            return this.parseVariableDeclaration();
          }
          if (this.check("PARALLEL")) {
            return this.parseParallelForEach();
          }
          if (this.check("FOR")) {
            return this.parseForEach();
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
          return this.parseParagraph();
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
              span: AST2.mergeSpans(left.span, right.span)
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
              span: AST2.mergeSpans(left.span, right.span)
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
              span: AST2.mergeSpans(left.span, right.span)
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
              span: AST2.mergeSpans(notToken.span, operand.span)
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
          if (this.check("DOUBLE_LBRACKET")) {
            return this.parseReference();
          }
          if (this.check("SEMANTIC_OPEN")) {
            return this.parseSemanticMarker();
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
          return { kind: "InlineText", text: "", span: token?.span || AST2.createSpan(1, 0, 0, 1, 0, 0) };
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
            span: AST2.mergeSpans(start.span, body.span)
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
            span: AST2.mergeSpans(start.span, end?.span || this.previous().span)
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
            } else if (this.check("SEMANTIC_OPEN")) {
              parts.push(this.parseSemanticMarker());
            } else {
              this.advance();
            }
          }
          const end = this.expect("TEMPLATE_END");
          return {
            kind: "TemplateLiteral",
            parts,
            span: AST2.mergeSpans(start.span, end?.span || this.previous().span)
          };
        }
        parseReference() {
          const start = this.advance();
          let skill = null;
          let section = null;
          if (this.check("LOWER_IDENT")) {
            const ident = this.advance().value;
            if (ident.startsWith("#")) {
              section = ident.slice(1);
            } else {
              skill = ident;
            }
          }
          if (skill && this.check("LOWER_IDENT")) {
            const ident = this.advance().value;
            if (ident.startsWith("#")) {
              section = ident.slice(1);
            }
          }
          const end = this.expect("DOUBLE_RBRACKET");
          const span = AST2.mergeSpans(start.span, end?.span || this.previous().span);
          if (section !== null) {
            return { kind: "SectionReference", skill, section, span };
          }
          return { kind: "SkillReference", skill: skill || "", span };
        }
        parseSemanticMarker() {
          const start = this.advance();
          let content = "";
          const interpolations = [];
          while (!this.check("SEMANTIC_CLOSE") && !this.isAtEnd()) {
            if (this.check("SEMANTIC_CONTENT")) {
              content += this.advance().value;
            } else if (this.check("DOLLAR_IDENT")) {
              const varToken = this.advance();
              content += varToken.value;
              interpolations.push({
                kind: "VariableReference",
                name: varToken.value.slice(1),
                span: varToken.span
              });
            } else {
              content += this.advance().value;
            }
          }
          const end = this.expect("SEMANTIC_CLOSE");
          return {
            kind: "SemanticMarker",
            content,
            interpolations,
            span: AST2.mergeSpans(start.span, end?.span || this.previous().span)
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
                span: AST2.mergeSpans(varToken.span, propToken.span)
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
              span: AST2.mergeSpans(varToken.span, end?.span || this.previous().span)
            };
          }
          return expr;
        }
        parseInlineText() {
          let text = "";
          const start = this.current();
          while (!this.isAtEnd() && !this.check("NEWLINE") && !this.check("DOUBLE_LBRACKET") && !this.check("SEMANTIC_OPEN") && !this.check("DOLLAR_IDENT") && !this.check("TYPE_IDENT")) {
            if (text)
              text += " ";
            text += this.advance().value;
          }
          return {
            kind: "InlineText",
            text: text.trim(),
            span: AST2.mergeSpans(start.span, this.previous().span)
          };
        }
        // ==========================================================================
        // Control Flow
        // ==========================================================================
        parseForEach() {
          const start = this.advance();
          this.expect("EACH");
          const pattern = this.parsePattern();
          this.expect("IN");
          const collection = this.parseExpression();
          this.expect("COLON");
          this.skipNewlines();
          this.loopDepth++;
          const body = this.parseIndentedBlocks();
          this.loopDepth--;
          return {
            kind: "ForEachStatement",
            pattern,
            collection,
            body,
            span: AST2.mergeSpans(start.span, body.length > 0 ? body[body.length - 1].span : collection.span)
          };
        }
        // v0.2: PARALLEL FOR EACH
        parseParallelForEach() {
          const start = this.advance();
          this.expect("FOR");
          this.expect("EACH");
          const pattern = this.parsePattern();
          this.expect("IN");
          const collection = this.parseExpression();
          this.expect("COLON");
          this.skipNewlines();
          this.loopDepth++;
          const body = this.parseIndentedBlocks();
          this.loopDepth--;
          return {
            kind: "ParallelForEachStatement",
            pattern,
            collection,
            body,
            mergeStrategy: "collect",
            // Default strategy
            span: AST2.mergeSpans(start.span, body.length > 0 ? body[body.length - 1].span : collection.span)
          };
        }
        parseWhile() {
          const start = this.advance();
          this.expect("LPAREN");
          const condition = this.parseCondition();
          this.expect("RPAREN");
          this.expect("COLON");
          this.skipNewlines();
          this.loopDepth++;
          const body = this.parseIndentedBlocks();
          this.loopDepth--;
          return {
            kind: "WhileStatement",
            condition,
            body,
            span: AST2.mergeSpans(start.span, body.length > 0 ? body[body.length - 1].span : condition.span)
          };
        }
        parseIf() {
          const start = this.advance();
          const condition = this.parseCondition();
          this.expect("THEN");
          this.expect("COLON");
          this.skipNewlines();
          const thenBody = this.parseIndentedBlocks();
          let elseBody = null;
          if (this.check("ELSE")) {
            this.advance();
            this.expect("COLON");
            this.skipNewlines();
            elseBody = this.parseIndentedBlocks();
          }
          return {
            kind: "IfStatement",
            condition,
            thenBody,
            elseBody,
            span: AST2.mergeSpans(start.span, elseBody?.length ? elseBody[elseBody.length - 1].span : thenBody.length ? thenBody[thenBody.length - 1].span : condition.span)
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
              span: AST2.mergeSpans(start.span, end?.span || this.previous().span)
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
              span: AST2.mergeSpans(left.span, right.span)
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
              span: AST2.mergeSpans(left.span, right.span)
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
          if (this.check("DOLLAR_IDENT") || this.check("TYPE_IDENT")) {
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
                span: AST2.mergeSpans(left.span, right.span)
              };
            }
            return {
              kind: "SemanticCondition",
              text: "$" + left.name,
              negated,
              span: left.span
            };
          }
          let text = "";
          const start = this.current();
          while (!this.isAtEnd() && !this.check("RPAREN") && !this.check("AND") && !this.check("OR") && !this.check("THEN") && !this.check("COLON")) {
            if (text)
              text += " ";
            text += this.advance().value;
          }
          return {
            kind: "SemanticCondition",
            text: text.trim(),
            negated,
            span: AST2.mergeSpans(start.span, this.previous().span)
          };
        }
        parseIndentedBlocks() {
          const blocks = [];
          if (this.check("INDENT")) {
            this.advance();
          }
          while (!this.check("DEDENT") && !this.isAtEnd() && !this.check("HEADING")) {
            this.skipNewlines();
            if (this.check("DEDENT") || this.isAtEnd() || this.check("HEADING"))
              break;
            const block = this.parseBlock();
            if (block) {
              blocks.push(block);
            }
          }
          if (this.check("DEDENT")) {
            this.advance();
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
            if (this.check("DOUBLE_LBRACKET")) {
              content.push(this.parseReference());
            } else if (this.check("SEMANTIC_OPEN")) {
              content.push(this.parseSemanticMarker());
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
            span: AST2.mergeSpans(start.span, this.previous().span)
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
            span: AST2.mergeSpans(start.span, end?.span || this.previous().span)
          };
        }
        parseHorizontalRule() {
          const token = this.advance();
          return { kind: "HorizontalRule", span: token.span };
        }
        parseDelegation() {
          const verbToken = this.advance();
          const verb = verbToken.value;
          const target = this.parseReference();
          const parameters = [];
          if (this.check("WITH")) {
            this.advance();
            this.expect("COLON");
            this.skipNewlines();
            while (this.check("LIST_MARKER") && !this.isAtEnd()) {
              this.advance();
              const param = this.parseVariableDeclaration(true);
              parameters.push(param);
              this.skipNewlines();
              if (!this.check("LIST_MARKER") || this.check("HEADING")) {
                break;
              }
            }
          }
          const span = AST2.mergeSpans(verbToken.span, this.previous().span);
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
            span: AST2.createSpan(1, 0, 0, 1, 0, 0)
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
      exports.Parser = Parser2;
      function parse3(source) {
        return new Parser2(source).parse();
      }
    }
  });

  // ../packages/core/dist/compiler/compiler.js
  var require_compiler = __commonJS({
    "../packages/core/dist/compiler/compiler.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Compiler = void 0;
      exports.compile = compile2;
      exports.createRegistry = createRegistry;
      exports.buildFullDependencyGraph = buildFullDependencyGraph;
      var parser_1 = require_parser();
      var BUILTIN_PRIMITIVES2 = /* @__PURE__ */ new Set(["String", "Number", "Boolean"]);
      var Compiler2 = class {
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
            uses: [],
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
          const ast = (0, parser_1.parse)(source);
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
            this.metadata.uses = [...ast.frontmatter.uses];
            for (const use of ast.frontmatter.uses) {
              this.declaredDeps.add(use);
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
            case "ParallelForEachStatement":
              this.extractFromControlFlow(block);
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
            type: decl.typeAnnotation?.name || null,
            hasDefault: decl.value !== null,
            isRequired: decl.isRequired || false,
            span: decl.span
          };
          this.metadata.variables.push(varInfo);
          this.definedVariables.add(decl.name);
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
            if (content.kind === "SkillReference") {
              this.extractSkillReference(content);
            } else if (content.kind === "SectionReference") {
              this.extractSectionReference(content);
            } else if (content.kind === "SemanticMarker") {
              this.sourceMap.push({
                source: content.span,
                type: "semantic",
                name: content.content
              });
            }
          }
        }
        extractFromDelegation(deleg) {
          if (deleg.target.kind === "SkillReference") {
            this.extractSkillReference(deleg.target);
          } else {
            this.extractSectionReference(deleg.target);
          }
          for (const param of deleg.parameters) {
            this.extractVariableDeclaration(param);
          }
        }
        extractParameters(blocks) {
          for (const block of blocks) {
            if (block.kind === "VariableDeclaration") {
              this.metadata.parameters.push({
                name: block.name,
                type: block.typeAnnotation?.name || null,
                hasDefault: block.value !== null,
                isRequired: !block.value,
                span: block.span
              });
            }
          }
        }
        extractFromExpression(expr) {
          switch (expr.kind) {
            case "SkillReference":
              this.extractSkillReference(expr);
              break;
            case "SectionReference":
              this.extractSectionReference(expr);
              break;
            case "SemanticMarker":
              this.sourceMap.push({
                source: expr.span,
                type: "semantic",
                name: expr.content
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
        extractSkillReference(ref) {
          this.metadata.references.push({
            kind: "skill",
            target: ref.skill,
            skill: ref.skill,
            span: ref.span
          });
          this.sourceMap.push({
            source: ref.span,
            type: "reference",
            name: ref.skill
          });
        }
        extractSectionReference(ref) {
          this.metadata.references.push({
            kind: "section",
            target: ref.skill ? `${ref.skill}#${ref.section}` : `#${ref.section}`,
            skill: ref.skill || void 0,
            section: ref.section,
            span: ref.span
          });
          this.sourceMap.push({
            source: ref.span,
            type: "reference",
            name: ref.skill ? `${ref.skill}#${ref.section}` : `#${ref.section}`
          });
        }
        // ==========================================================================
        // Dependency Graph
        // ==========================================================================
        buildDependencyGraph(ast) {
          const nodes = /* @__PURE__ */ new Set();
          const edges = [];
          if (ast.frontmatter) {
            for (const use of ast.frontmatter.uses) {
              nodes.add(use);
              edges.push({ target: use, type: "uses" });
            }
          }
          for (const ref of this.metadata.references) {
            if (ref.kind === "skill" && ref.skill) {
              nodes.add(ref.skill);
              edges.push({ target: ref.skill, type: "reference", span: ref.span });
            } else if (ref.kind === "section" && ref.skill) {
              nodes.add(ref.skill);
              edges.push({ target: ref.skill, type: "reference", span: ref.span });
            }
          }
          this.dependencies.nodes = Array.from(nodes);
          this.dependencies.edges = edges;
        }
        // ==========================================================================
        // Validation
        // ==========================================================================
        validateTypes(ast) {
          for (const varInfo of this.metadata.variables) {
            if (varInfo.type && !this.definedTypes.has(varInfo.type)) {
              if (BUILTIN_PRIMITIVES2.has(varInfo.type)) {
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
            } else if (block.kind === "ForEachStatement" || block.kind === "ParallelForEachStatement") {
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
            }
          }
        }
        checkExpressionScope(expr, usedBeforeDefined) {
          if (expr.kind === "VariableReference") {
            if (!this.definedVariables.has(expr.name)) {
              usedBeforeDefined.add(expr.name);
            }
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
            if (ref.kind === "skill" && ref.skill) {
              if (!this.declaredDeps.has(ref.skill)) {
                this.diagnostics.push({
                  severity: "warning",
                  code: "W001",
                  message: `Skill '${ref.skill}' is referenced but not declared in 'uses:'`,
                  span: ref.span
                });
              }
            } else if (ref.kind === "section" && ref.skill) {
              if (!this.declaredDeps.has(ref.skill)) {
                this.diagnostics.push({
                  severity: "warning",
                  code: "W001",
                  message: `Skill '${ref.skill}' is referenced but not declared in 'uses:'`,
                  span: ref.span
                });
              }
            }
          }
          for (const ref of this.metadata.references) {
            if (ref.kind === "section" && !ref.skill && ref.section) {
              const sectionExists = this.metadata.sections.some((s) => s.anchor === ref.section);
              if (!sectionExists) {
                this.diagnostics.push({
                  severity: "error",
                  code: "E010",
                  message: `Section '#${ref.section}' does not exist in this document`,
                  span: ref.span
                });
              }
            }
          }
          if (this.registry) {
            for (const ref of this.metadata.references) {
              if (ref.kind === "skill" && ref.skill) {
                const skill = this.registry.get(ref.skill);
                if (!skill) {
                  this.diagnostics.push({
                    severity: "error",
                    code: "E009",
                    message: `Skill '${ref.skill}' is not found in registry`,
                    span: ref.span
                  });
                }
              }
            }
          }
        }
        validateContracts(ast) {
          const delegations = [];
          this.findDelegations(ast.sections, delegations);
          for (const deleg of delegations) {
            if (deleg.target.kind === "SkillReference" && deleg.target.skill) {
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
            } else if (block.kind === "ForEachStatement" || block.kind === "ParallelForEachStatement") {
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
          const skillName = deleg.target.skill;
          let skillParams = [];
          if (skillName === this.metadata.name) {
            skillParams = this.metadata.parameters;
          } else if (this.registry) {
            const skill = this.registry.get(skillName);
            if (skill) {
              const skillCompileResult = compile2(skill.source, { validateReferences: false, validateContracts: false });
              skillParams = skillCompileResult.metadata.parameters;
            }
          }
          const providedParams = new Set(deleg.parameters.map((p) => p.name));
          const requiredParams = skillParams.filter((p) => p.isRequired);
          for (const req of requiredParams) {
            if (!providedParams.has(req.name)) {
              this.diagnostics.push({
                severity: "error",
                code: "E011",
                message: `Required parameter '${req.name}' is missing for skill '${skillName}'`,
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
                  message: `Parameter '${param.name}' is not defined for skill '${skillName}'`,
                  span: param.span
                });
              }
            }
          }
        }
      };
      exports.Compiler = Compiler2;
      function compile2(source, options, registry) {
        return new Compiler2(options, registry).compile(source);
      }
      function createRegistry(skills) {
        const cache = /* @__PURE__ */ new Map();
        return {
          get(name) {
            if (cache.has(name)) {
              return cache.get(name);
            }
            const source = skills[name];
            if (!source)
              return void 0;
            const ast = (0, parser_1.parse)(source);
            const content = { name, source, ast };
            cache.set(name, content);
            return content;
          },
          getSection(skillName, sectionName) {
            const skill = this.get(skillName);
            if (!skill)
              return void 0;
            const section = skill.ast.sections.find((s) => s.anchor === sectionName);
            if (!section)
              return void 0;
            return `[Section: ${section.title}]`;
          },
          list() {
            return Object.keys(skills);
          }
        };
      }
      function buildFullDependencyGraph(registry) {
        const graph = /* @__PURE__ */ new Map();
        const skillNames = registry.list();
        for (const name of skillNames) {
          const skill = registry.get(name);
          if (skill) {
            const result = compile2(skill.source, { validateReferences: false });
            graph.set(name, result.dependencies.nodes);
          }
        }
        const cycles = [];
        const visited = /* @__PURE__ */ new Set();
        const recStack = /* @__PURE__ */ new Set();
        const path = [];
        function dfs(node) {
          visited.add(node);
          recStack.add(node);
          path.push(node);
          const deps = graph.get(node) || [];
          for (const dep of deps) {
            if (!visited.has(dep)) {
              dfs(dep);
            } else if (recStack.has(dep)) {
              const cycleStart = path.indexOf(dep);
              cycles.push([...path.slice(cycleStart), dep]);
            }
          }
          path.pop();
          recStack.delete(node);
        }
        for (const name of skillNames) {
          if (!visited.has(name)) {
            dfs(name);
          }
        }
        return { graph, cycles };
      }
    }
  });

  // ../packages/core/dist/index.js
  var require_dist = __commonJS({
    "../packages/core/dist/index.js"(exports) {
      "use strict";
      var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      } : function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      });
      var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      } : function(o, v) {
        o["default"] = v;
      });
      var __importStar = exports && exports.__importStar || /* @__PURE__ */ function() {
        var ownKeys = function(o) {
          ownKeys = Object.getOwnPropertyNames || function(o2) {
            var ar = [];
            for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
            return ar;
          };
          return ownKeys(o);
        };
        return function(mod) {
          if (mod && mod.__esModule) return mod;
          var result = {};
          if (mod != null) {
            for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
          }
          __setModuleDefault(result, mod);
          return result;
        };
      }();
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.buildFullDependencyGraph = exports.createRegistry = exports.Compiler = exports.compile = exports.AST = exports.Lexer = exports.tokenize = exports.parse = void 0;
      var parser_1 = require_parser();
      Object.defineProperty(exports, "parse", { enumerable: true, get: function() {
        return parser_1.parse;
      } });
      var lexer_1 = require_lexer();
      Object.defineProperty(exports, "tokenize", { enumerable: true, get: function() {
        return lexer_1.tokenize;
      } });
      Object.defineProperty(exports, "Lexer", { enumerable: true, get: function() {
        return lexer_1.Lexer;
      } });
      exports.AST = __importStar(require_ast());
      var compiler_1 = require_compiler();
      Object.defineProperty(exports, "compile", { enumerable: true, get: function() {
        return compiler_1.compile;
      } });
      Object.defineProperty(exports, "Compiler", { enumerable: true, get: function() {
        return compiler_1.Compiler;
      } });
      Object.defineProperty(exports, "createRegistry", { enumerable: true, get: function() {
        return compiler_1.createRegistry;
      } });
      Object.defineProperty(exports, "buildFullDependencyGraph", { enumerable: true, get: function() {
        return compiler_1.buildFullDependencyGraph;
      } });
    }
  });

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

  // ../packages/core/src/parser/lexer.ts
  var Lexer = class {
    constructor(source) {
      __publicField(this, "source");
      __publicField(this, "pos", 0);
      __publicField(this, "line", 1);
      __publicField(this, "column", 0);
      __publicField(this, "tokens", []);
      __publicField(this, "indentStack", [0]);
      this.source = source;
    }
    tokenize() {
      while (!this.isAtEnd()) {
        this.scanToken();
      }
      while (this.indentStack.length > 1) {
        this.indentStack.pop();
        this.addToken("DEDENT", "");
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
        this.handleIndent();
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
        this.scanHeading();
        return;
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
      if (this.lookAhead("{~~")) {
        this.consumeChars(3);
        this.addToken("SEMANTIC_OPEN", "{~~");
        this.scanSemanticContent();
        return;
      }
      if (this.lookAhead("[[")) {
        this.consumeChars(2);
        this.addToken("DOUBLE_LBRACKET", "[[");
        return;
      }
      if (this.lookAhead("]]")) {
        this.consumeChars(2);
        this.addToken("DOUBLE_RBRACKET", "]]");
        return;
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
      if (char === "#") {
        this.scanHashIdent();
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
    handleIndent() {
      let indent = 0;
      while (this.peek() === " ") {
        indent++;
        this.advance();
      }
      while (this.peek() === "	") {
        indent += 2;
        this.advance();
      }
      if (this.peek() === "\n" || this.isAtEnd()) {
        return;
      }
      const current = this.indentStack[this.indentStack.length - 1];
      if (indent > current) {
        this.indentStack.push(indent);
        this.addToken("INDENT", " ".repeat(indent - current));
      } else if (indent < current) {
        while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent) {
          this.indentStack.pop();
          this.addToken("DEDENT", "");
        }
      }
    }
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
      if (!this.isAtEnd()) this.consumeNewline();
      let content = "";
      while (!this.isAtEnd()) {
        if (this.column === 0 && this.lookAhead("```")) {
          if (content) this.addToken("CODE_BLOCK_CONTENT", content);
          this.consumeChars(3);
          this.addToken("CODE_BLOCK_END", "```");
          if (!this.isAtEnd() && this.peek() === "\n") this.consumeNewline();
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
    scanSemanticContent() {
      let content = "";
      while (!this.isAtEnd() && this.peek() !== "}" && this.peek() !== "\n") {
        content += this.advance();
      }
      if (content) this.addToken("SEMANTIC_CONTENT", content);
      if (this.peek() === "}") {
        this.advance();
        this.addToken("SEMANTIC_CLOSE", "}");
      }
    }
    scanDollarIdent() {
      this.advance();
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
    scanHashIdent() {
      this.advance();
      let ident = "";
      while (this.isAlphaNumeric(this.peek()) || this.peek() === "-") {
        ident += this.advance();
      }
      this.addToken("LOWER_IDENT", "#" + ident);
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
        } else if (this.lookAhead("{~~")) {
          if (part) {
            this.addToken("TEMPLATE_PART", part);
            part = "";
          }
          this.consumeChars(3);
          this.addToken("SEMANTIC_OPEN", "{~~");
          this.scanSemanticContent();
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
        "EACH": "EACH",
        "IN": "IN",
        "WHILE": "WHILE",
        "IF": "IF",
        "THEN": "THEN",
        "ELSE": "ELSE",
        "AND": "AND",
        "OR": "OR",
        "NOT": "NOT",
        "WITH": "WITH",
        "PARALLEL": "PARALLEL",
        "BREAK": "BREAK",
        "CONTINUE": "CONTINUE",
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
    addToken(type, value) {
      const len = value.length;
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
    // v0.2: Track if we're inside a loop
    constructor(source) {
      this.source = source;
      __publicField(this, "tokens", []);
      __publicField(this, "pos", 0);
      __publicField(this, "errors", []);
      __publicField(this, "frontmatterContent", "");
      __publicField(this, "loopDepth", 0);
    }
    parse() {
      this.tokens = tokenize(this.source);
      this.pos = 0;
      this.errors = [];
      this.loopDepth = 0;
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
      return {
        kind: "Frontmatter",
        name: parsed.name || "",
        description: parsed.description || "",
        uses: parsed.uses || [],
        imports: this.parseImports(parsed.imports),
        raw: parsed,
        span: mergeSpans(start.span, end.span)
      };
    }
    parseYaml(content) {
      const result = {};
      const lines = content.split("\n");
      let currentKey = "";
      let inArray = false;
      let inImports = false;
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
          } else {
            result[currentKey] = [];
            inArray = true;
            inImports = currentKey === "imports";
          }
          continue;
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
      if (this.check("TYPE_IDENT")) {
        const lookahead = this.peek(1);
        if (lookahead?.type === "COLON") {
          const afterColon = this.peek(2);
          if (afterColon?.type !== "TYPE_IDENT") {
            return this.parseTypeDefinition();
          }
        }
      }
      if (this.check("LIST_MARKER")) {
        return this.parseListItem();
      }
      if (this.check("DOLLAR_IDENT") || this.check("TYPE_IDENT")) {
        return this.parseVariableOrType();
      }
      if (this.check("PARALLEL")) {
        return this.parseParallelForEach();
      }
      if (this.check("FOR")) {
        return this.parseForEach();
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
      if (this.check("CODE_BLOCK_START")) {
        return this.parseCodeBlock();
      }
      if (this.check("HORIZONTAL_RULE")) {
        return this.parseHorizontalRule();
      }
      if (this.check("BLOCKQUOTE")) {
        return this.parseBlockquote();
      }
      if (this.check("LOWER_IDENT") || this.check("UPPER_IDENT")) {
        const verb = this.current().value.toLowerCase();
        if (verb === "execute" || verb === "call" || verb === "run" || verb === "invoke" || verb === "delegate" || verb === "use") {
          const lookahead = this.peek(1);
          if (lookahead?.type === "DOUBLE_LBRACKET") {
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
    parseListItem() {
      this.advance();
      if (this.check("DOLLAR_IDENT") || this.check("TYPE_IDENT")) {
        return this.parseVariableDeclaration();
      }
      if (this.check("PARALLEL")) {
        return this.parseParallelForEach();
      }
      if (this.check("FOR")) {
        return this.parseForEach();
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
      return this.parseParagraph();
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
      if (this.check("DOUBLE_LBRACKET")) {
        return this.parseReference();
      }
      if (this.check("SEMANTIC_OPEN")) {
        return this.parseSemanticMarker();
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
        } else if (this.check("SEMANTIC_OPEN")) {
          parts.push(this.parseSemanticMarker());
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
    parseReference() {
      const start = this.advance();
      let skill = null;
      let section = null;
      if (this.check("LOWER_IDENT")) {
        const ident = this.advance().value;
        if (ident.startsWith("#")) {
          section = ident.slice(1);
        } else {
          skill = ident;
        }
      }
      if (skill && this.check("LOWER_IDENT")) {
        const ident = this.advance().value;
        if (ident.startsWith("#")) {
          section = ident.slice(1);
        }
      }
      const end = this.expect("DOUBLE_RBRACKET");
      const span = mergeSpans(start.span, end?.span || this.previous().span);
      if (section !== null) {
        return { kind: "SectionReference", skill, section, span };
      }
      return { kind: "SkillReference", skill: skill || "", span };
    }
    parseSemanticMarker() {
      const start = this.advance();
      let content = "";
      const interpolations = [];
      while (!this.check("SEMANTIC_CLOSE") && !this.isAtEnd()) {
        if (this.check("SEMANTIC_CONTENT")) {
          content += this.advance().value;
        } else if (this.check("DOLLAR_IDENT")) {
          const varToken = this.advance();
          content += varToken.value;
          interpolations.push({
            kind: "VariableReference",
            name: varToken.value.slice(1),
            span: varToken.span
          });
        } else {
          content += this.advance().value;
        }
      }
      const end = this.expect("SEMANTIC_CLOSE");
      return {
        kind: "SemanticMarker",
        content,
        interpolations,
        span: mergeSpans(start.span, end?.span || this.previous().span)
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
      while (!this.isAtEnd() && !this.check("NEWLINE") && !this.check("DOUBLE_LBRACKET") && !this.check("SEMANTIC_OPEN") && !this.check("DOLLAR_IDENT") && !this.check("TYPE_IDENT")) {
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
    parseForEach() {
      const start = this.advance();
      this.expect("EACH");
      const pattern = this.parsePattern();
      this.expect("IN");
      const collection = this.parseExpression();
      this.expect("COLON");
      this.skipNewlines();
      this.loopDepth++;
      const body = this.parseIndentedBlocks();
      this.loopDepth--;
      return {
        kind: "ForEachStatement",
        pattern,
        collection,
        body,
        span: mergeSpans(start.span, body.length > 0 ? body[body.length - 1].span : collection.span)
      };
    }
    // v0.2: PARALLEL FOR EACH
    parseParallelForEach() {
      const start = this.advance();
      this.expect("FOR");
      this.expect("EACH");
      const pattern = this.parsePattern();
      this.expect("IN");
      const collection = this.parseExpression();
      this.expect("COLON");
      this.skipNewlines();
      this.loopDepth++;
      const body = this.parseIndentedBlocks();
      this.loopDepth--;
      return {
        kind: "ParallelForEachStatement",
        pattern,
        collection,
        body,
        mergeStrategy: "collect",
        // Default strategy
        span: mergeSpans(start.span, body.length > 0 ? body[body.length - 1].span : collection.span)
      };
    }
    parseWhile() {
      const start = this.advance();
      this.expect("LPAREN");
      const condition = this.parseCondition();
      this.expect("RPAREN");
      this.expect("COLON");
      this.skipNewlines();
      this.loopDepth++;
      const body = this.parseIndentedBlocks();
      this.loopDepth--;
      return {
        kind: "WhileStatement",
        condition,
        body,
        span: mergeSpans(start.span, body.length > 0 ? body[body.length - 1].span : condition.span)
      };
    }
    parseIf() {
      const start = this.advance();
      const condition = this.parseCondition();
      this.expect("THEN");
      this.expect("COLON");
      this.skipNewlines();
      const thenBody = this.parseIndentedBlocks();
      let elseBody = null;
      if (this.check("ELSE")) {
        this.advance();
        this.expect("COLON");
        this.skipNewlines();
        elseBody = this.parseIndentedBlocks();
      }
      return {
        kind: "IfStatement",
        condition,
        thenBody,
        elseBody,
        span: mergeSpans(
          start.span,
          elseBody?.length ? elseBody[elseBody.length - 1].span : thenBody.length ? thenBody[thenBody.length - 1].span : condition.span
        )
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
      if (this.check("DOLLAR_IDENT") || this.check("TYPE_IDENT")) {
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
        return {
          kind: "SemanticCondition",
          text: "$" + left.name,
          negated,
          span: left.span
        };
      }
      let text = "";
      const start = this.current();
      while (!this.isAtEnd() && !this.check("RPAREN") && !this.check("AND") && !this.check("OR") && !this.check("THEN") && !this.check("COLON")) {
        if (text) text += " ";
        text += this.advance().value;
      }
      return {
        kind: "SemanticCondition",
        text: text.trim(),
        negated,
        span: mergeSpans(start.span, this.previous().span)
      };
    }
    parseIndentedBlocks() {
      const blocks = [];
      if (this.check("INDENT")) {
        this.advance();
      }
      while (!this.check("DEDENT") && !this.isAtEnd() && !this.check("HEADING")) {
        this.skipNewlines();
        if (this.check("DEDENT") || this.isAtEnd() || this.check("HEADING")) break;
        const block = this.parseBlock();
        if (block) {
          blocks.push(block);
        }
      }
      if (this.check("DEDENT")) {
        this.advance();
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
        if (this.check("DOUBLE_LBRACKET")) {
          content.push(this.parseReference());
        } else if (this.check("SEMANTIC_OPEN")) {
          content.push(this.parseSemanticMarker());
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
      const target = this.parseReference();
      const parameters = [];
      if (this.check("WITH")) {
        this.advance();
        this.expect("COLON");
        this.skipNewlines();
        while (this.check("LIST_MARKER") && !this.isAtEnd()) {
          this.advance();
          const param = this.parseVariableDeclaration(true);
          parameters.push(param);
          this.skipNewlines();
          if (!this.check("LIST_MARKER") || this.check("HEADING")) {
            break;
          }
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

  // ../packages/core/src/compiler/compiler.ts
  var BUILTIN_PRIMITIVES = /* @__PURE__ */ new Set(["String", "Number", "Boolean"]);
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
        uses: [],
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
        this.metadata.uses = [...ast.frontmatter.uses];
        for (const use of ast.frontmatter.uses) {
          this.declaredDeps.add(use);
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
        case "ParallelForEachStatement":
          this.extractFromControlFlow(block);
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
        type: decl.typeAnnotation?.name || null,
        hasDefault: decl.value !== null,
        isRequired: decl.isRequired || false,
        span: decl.span
      };
      this.metadata.variables.push(varInfo);
      this.definedVariables.add(decl.name);
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
        if (content.kind === "SkillReference") {
          this.extractSkillReference(content);
        } else if (content.kind === "SectionReference") {
          this.extractSectionReference(content);
        } else if (content.kind === "SemanticMarker") {
          this.sourceMap.push({
            source: content.span,
            type: "semantic",
            name: content.content
          });
        }
      }
    }
    extractFromDelegation(deleg) {
      if (deleg.target.kind === "SkillReference") {
        this.extractSkillReference(deleg.target);
      } else {
        this.extractSectionReference(deleg.target);
      }
      for (const param of deleg.parameters) {
        this.extractVariableDeclaration(param);
      }
    }
    extractParameters(blocks) {
      for (const block of blocks) {
        if (block.kind === "VariableDeclaration") {
          this.metadata.parameters.push({
            name: block.name,
            type: block.typeAnnotation?.name || null,
            hasDefault: block.value !== null,
            isRequired: !block.value,
            span: block.span
          });
        }
      }
    }
    extractFromExpression(expr) {
      switch (expr.kind) {
        case "SkillReference":
          this.extractSkillReference(expr);
          break;
        case "SectionReference":
          this.extractSectionReference(expr);
          break;
        case "SemanticMarker":
          this.sourceMap.push({
            source: expr.span,
            type: "semantic",
            name: expr.content
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
    extractSkillReference(ref) {
      this.metadata.references.push({
        kind: "skill",
        target: ref.skill,
        skill: ref.skill,
        span: ref.span
      });
      this.sourceMap.push({
        source: ref.span,
        type: "reference",
        name: ref.skill
      });
    }
    extractSectionReference(ref) {
      this.metadata.references.push({
        kind: "section",
        target: ref.skill ? `${ref.skill}#${ref.section}` : `#${ref.section}`,
        skill: ref.skill || void 0,
        section: ref.section,
        span: ref.span
      });
      this.sourceMap.push({
        source: ref.span,
        type: "reference",
        name: ref.skill ? `${ref.skill}#${ref.section}` : `#${ref.section}`
      });
    }
    // ==========================================================================
    // Dependency Graph
    // ==========================================================================
    buildDependencyGraph(ast) {
      const nodes = /* @__PURE__ */ new Set();
      const edges = [];
      if (ast.frontmatter) {
        for (const use of ast.frontmatter.uses) {
          nodes.add(use);
          edges.push({ target: use, type: "uses" });
        }
      }
      for (const ref of this.metadata.references) {
        if (ref.kind === "skill" && ref.skill) {
          nodes.add(ref.skill);
          edges.push({ target: ref.skill, type: "reference", span: ref.span });
        } else if (ref.kind === "section" && ref.skill) {
          nodes.add(ref.skill);
          edges.push({ target: ref.skill, type: "reference", span: ref.span });
        }
      }
      this.dependencies.nodes = Array.from(nodes);
      this.dependencies.edges = edges;
    }
    // ==========================================================================
    // Validation
    // ==========================================================================
    validateTypes(ast) {
      for (const varInfo of this.metadata.variables) {
        if (varInfo.type && !this.definedTypes.has(varInfo.type)) {
          if (BUILTIN_PRIMITIVES.has(varInfo.type)) {
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
        } else if (block.kind === "ForEachStatement" || block.kind === "ParallelForEachStatement") {
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
        }
      }
    }
    checkExpressionScope(expr, usedBeforeDefined) {
      if (expr.kind === "VariableReference") {
        if (!this.definedVariables.has(expr.name)) {
          usedBeforeDefined.add(expr.name);
        }
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
        if (ref.kind === "skill" && ref.skill) {
          if (!this.declaredDeps.has(ref.skill)) {
            this.diagnostics.push({
              severity: "warning",
              code: "W001",
              message: `Skill '${ref.skill}' is referenced but not declared in 'uses:'`,
              span: ref.span
            });
          }
        } else if (ref.kind === "section" && ref.skill) {
          if (!this.declaredDeps.has(ref.skill)) {
            this.diagnostics.push({
              severity: "warning",
              code: "W001",
              message: `Skill '${ref.skill}' is referenced but not declared in 'uses:'`,
              span: ref.span
            });
          }
        }
      }
      for (const ref of this.metadata.references) {
        if (ref.kind === "section" && !ref.skill && ref.section) {
          const sectionExists = this.metadata.sections.some((s) => s.anchor === ref.section);
          if (!sectionExists) {
            this.diagnostics.push({
              severity: "error",
              code: "E010",
              message: `Section '#${ref.section}' does not exist in this document`,
              span: ref.span
            });
          }
        }
      }
      if (this.registry) {
        for (const ref of this.metadata.references) {
          if (ref.kind === "skill" && ref.skill) {
            const skill = this.registry.get(ref.skill);
            if (!skill) {
              this.diagnostics.push({
                severity: "error",
                code: "E009",
                message: `Skill '${ref.skill}' is not found in registry`,
                span: ref.span
              });
            }
          }
        }
      }
    }
    validateContracts(ast) {
      const delegations = [];
      this.findDelegations(ast.sections, delegations);
      for (const deleg of delegations) {
        if (deleg.target.kind === "SkillReference" && deleg.target.skill) {
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
        } else if (block.kind === "ForEachStatement" || block.kind === "ParallelForEachStatement") {
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
      const skillName = deleg.target.skill;
      let skillParams = [];
      if (skillName === this.metadata.name) {
        skillParams = this.metadata.parameters;
      } else if (this.registry) {
        const skill = this.registry.get(skillName);
        if (skill) {
          const skillCompileResult = compile(skill.source, { validateReferences: false, validateContracts: false });
          skillParams = skillCompileResult.metadata.parameters;
        }
      }
      const providedParams = new Set(deleg.parameters.map((p) => p.name));
      const requiredParams = skillParams.filter((p) => p.isRequired);
      for (const req of requiredParams) {
        if (!providedParams.has(req.name)) {
          this.diagnostics.push({
            severity: "error",
            code: "E011",
            message: `Required parameter '${req.name}' is missing for skill '${skillName}'`,
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
              message: `Parameter '${param.name}' is not defined for skill '${skillName}'`,
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
  var import_core = __toESM(require_dist());
  var ZenLanguageServer = class {
    constructor() {
      __publicField(this, "documents", /* @__PURE__ */ new Map());
      __publicField(this, "skillRegistry", /* @__PURE__ */ new Map());
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
      const ast = (0, import_core.parse)(content);
      const types = /* @__PURE__ */ new Map();
      const variables = /* @__PURE__ */ new Map();
      const references = [];
      const semanticMarkers = [];
      for (const section of ast.sections) {
        this.analyzeBlocks(section.content, types, variables, references, semanticMarkers);
      }
      if (ast.frontmatter?.name) {
        const state = {
          uri,
          content,
          ast,
          types,
          variables,
          references,
          semanticMarkers
        };
        this.skillRegistry.set(ast.frontmatter.name, state);
      }
      return {
        uri,
        content,
        ast,
        types,
        variables,
        references,
        semanticMarkers
      };
    }
    analyzeBlocks(blocks, types, variables, references, semanticMarkers) {
      for (const block of blocks) {
        switch (block.kind) {
          case "TypeDefinition":
            types.set(block.name, {
              name: block.name,
              definition: this.typeExprToString(block.typeExpr),
              span: block.span
            });
            break;
          case "VariableDeclaration":
            variables.set(block.name, {
              name: block.name,
              typeName: block.typeAnnotation?.name,
              span: block.span,
              isLambda: block.isLambda
            });
            if (block.value) {
              this.analyzeExpression(block.value, references, semanticMarkers);
            }
            break;
          case "ForEachStatement":
            if (block.pattern.kind === "SimplePattern") {
              variables.set(block.pattern.name, {
                name: block.pattern.name,
                span: block.pattern.span,
                isLambda: false
              });
            } else {
              for (const name of block.pattern.names) {
                variables.set(name, {
                  name,
                  span: block.pattern.span,
                  isLambda: false
                });
              }
            }
            this.analyzeExpression(block.collection, references, semanticMarkers);
            this.analyzeBlocks(block.body, types, variables, references, semanticMarkers);
            break;
          case "WhileStatement":
            this.analyzeCondition(block.condition, references, semanticMarkers);
            this.analyzeBlocks(block.body, types, variables, references, semanticMarkers);
            break;
          case "IfStatement":
            this.analyzeCondition(block.condition, references, semanticMarkers);
            this.analyzeBlocks(block.thenBody, types, variables, references, semanticMarkers);
            if (block.elseBody) {
              this.analyzeBlocks(block.elseBody, types, variables, references, semanticMarkers);
            }
            break;
          case "Paragraph":
            for (const item of block.content) {
              if (item.kind === "SkillReference") {
                references.push({ skill: item.skill, section: null, span: item.span });
              } else if (item.kind === "SectionReference") {
                references.push({ skill: item.skill, section: item.section, span: item.span });
              } else if (item.kind === "SemanticMarker") {
                semanticMarkers.push({ content: item.content, span: item.span });
              }
            }
            break;
        }
      }
    }
    analyzeExpression(expr, references, semanticMarkers) {
      switch (expr.kind) {
        case "SkillReference":
          references.push({ skill: expr.skill, section: null, span: expr.span });
          break;
        case "SectionReference":
          references.push({ skill: expr.skill, section: expr.section, span: expr.span });
          break;
        case "SemanticMarker":
          semanticMarkers.push({ content: expr.content, span: expr.span });
          break;
        case "ArrayLiteral":
          for (const el of expr.elements) {
            this.analyzeExpression(el, references, semanticMarkers);
          }
          break;
        case "TemplateLiteral":
          for (const part of expr.parts) {
            if (typeof part !== "string") {
              this.analyzeExpression(part, references, semanticMarkers);
            }
          }
          break;
        case "BinaryExpression":
          this.analyzeExpression(expr.left, references, semanticMarkers);
          this.analyzeExpression(expr.right, references, semanticMarkers);
          break;
        case "LambdaExpression":
          this.analyzeExpression(expr.body, references, semanticMarkers);
          break;
        case "FunctionCall":
          this.analyzeExpression(expr.callee, references, semanticMarkers);
          for (const arg of expr.args) {
            this.analyzeExpression(arg, references, semanticMarkers);
          }
          break;
      }
    }
    analyzeCondition(cond, references, semanticMarkers) {
      switch (cond.kind) {
        case "DeterministicCondition":
          this.analyzeExpression(cond.left, references, semanticMarkers);
          this.analyzeExpression(cond.right, references, semanticMarkers);
          break;
        case "CompoundCondition":
          this.analyzeCondition(cond.left, references, semanticMarkers);
          this.analyzeCondition(cond.right, references, semanticMarkers);
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
        if (ref.skill && !this.skillRegistry.has(ref.skill)) {
          diagnostics.push({
            range: this.spanToRange(ref.span),
            severity: 3 /* Information */,
            message: `Skill '${ref.skill}' not found in workspace`,
            source: "zen"
          });
        }
      }
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
        if (this.positionInSpan(position, ref.span) && ref.skill) {
          const targetState = this.skillRegistry.get(ref.skill);
          if (targetState) {
            if (ref.section) {
              const section = targetState.ast.sections.find((s) => s.anchor === ref.section);
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
          if (info.typeName) {
            const type = state.types.get(info.typeName);
            contents += `: $${info.typeName}`;
            if (type) {
              contents += `

${type.definition}`;
            }
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
          const refStr = ref.skill ? ref.section ? `${ref.skill}#${ref.section}` : ref.skill : `#${ref.section}`;
          let contents = `**Skill Reference** [[${refStr}]]`;
          if (ref.skill) {
            const targetState = this.skillRegistry.get(ref.skill);
            if (targetState?.ast.frontmatter) {
              contents += `

${targetState.ast.frontmatter.description}`;
            }
          }
          return {
            contents,
            range: this.spanToRange(ref.span)
          };
        }
      }
      return null;
    }
    // ==========================================================================
    // Completion
    // ==========================================================================
    getCompletions(uri, position) {
      const state = this.documents.get(uri);
      if (!state) return [];
      const lineContent = state.content.split("\n")[position.line] || "";
      const beforeCursor = lineContent.substring(0, position.character);
      if (beforeCursor.endsWith("[[")) {
        return this.getSkillCompletions();
      }
      const skillMatch = beforeCursor.match(/\[\[([a-z0-9-]*)$/);
      if (skillMatch) {
        const prefix = skillMatch[1];
        return this.getSkillCompletions().filter(
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
      if (beforeCursor.endsWith("{~~")) {
        return this.getSemanticCompletions();
      }
      if (/^\s*$/.test(beforeCursor)) {
        return this.getKeywordCompletions();
      }
      return [];
    }
    getSkillCompletions() {
      const items = [];
      for (const [name, state] of this.skillRegistry) {
        items.push({
          label: name,
          kind: 9 /* Module */,
          detail: state.ast.frontmatter?.description,
          insertText: name + "]]"
        });
      }
      return items;
    }
    getVariableCompletions(state) {
      const items = [];
      for (const [name, info] of state.variables) {
        items.push({
          label: name,
          kind: info.isLambda ? 3 /* Function */ : 6 /* Variable */,
          detail: info.typeName ? `$${info.typeName}` : void 0
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
        { label: "appropriate location", kind: 15 /* Snippet */, insertText: "appropriate location}" },
        { label: "relevant context", kind: 15 /* Snippet */, insertText: "relevant context}" },
        { label: "best approach for", kind: 15 /* Snippet */, insertText: "best approach for }" },
        { label: "determine based on", kind: 15 /* Snippet */, insertText: "determine based on }" }
      ];
    }
    getKeywordCompletions() {
      return [
        { label: "FOR EACH", kind: 14 /* Keyword */, insertText: "FOR EACH $item IN $items:\n  - " },
        { label: "WHILE", kind: 14 /* Keyword */, insertText: "WHILE ($condition):\n  - " },
        { label: "IF", kind: 14 /* Keyword */, insertText: "IF $condition THEN:\n  - " },
        { label: "ELSE", kind: 14 /* Keyword */, insertText: "ELSE:\n  - " }
      ];
    }
    // ==========================================================================
    // Document Symbols
    // ==========================================================================
    getDocumentSymbols(uri) {
      const state = this.documents.get(uri);
      if (!state) return [];
      const symbols = [];
      for (const section of state.ast.sections) {
        const children = [];
        for (const block of section.content) {
          if (block.kind === "TypeDefinition") {
            children.push({
              name: `$${block.name}`,
              kind: 5 /* Class */,
              range: this.spanToRange(block.span),
              selectionRange: this.spanToRange(block.span)
            });
          } else if (block.kind === "VariableDeclaration") {
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
  self.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "parse":
        handleParse(message.id, message.source);
        break;
      case "validate":
        handleValidate(message.id, message.source);
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
