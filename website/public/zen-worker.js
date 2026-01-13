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
      exports.isLink = isLink;
      exports.isAnchor = isAnchor;
      exports.resolveLinkPath = resolveLinkPath;
      exports.getLinkKind = getLinkKind2;
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
      function isLink(node) {
        return node.kind === "Link";
      }
      function isAnchor(node) {
        return node.kind === "Anchor";
      }
      function resolveLinkPath(link) {
        return link.path.join("/") + ".mdz";
      }
      function getLinkKind2(link) {
        const folder = link.path[0];
        if (folder === "agent" || folder === "agents")
          return "agent";
        if (folder === "skill" || folder === "skills")
          return "skill";
        if (folder === "tool" || folder === "tools")
          return "tool";
        return "unknown";
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
          if (char === "/") {
            const result = this.tryScanSemanticMarker();
            if (result)
              return;
          }
          if (char === "~" && this.peekAt(1) === "/") {
            const result = this.tryScanLink();
            if (result)
              return;
          }
          if (char === "#" && this.column > 0) {
            const result = this.tryScanAnchor();
            if (result)
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
            this.consumeNewlineRaw();
          let content = "";
          while (!this.isAtEnd()) {
            if (this.column === 0 && this.lookAhead("```")) {
              if (content)
                this.addToken("CODE_BLOCK_CONTENT", content);
              this.consumeChars(3);
              this.addToken("CODE_BLOCK_END", "```");
              if (!this.isAtEnd() && this.peek() === "\n")
                this.consumeNewlineRaw();
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
        /**
         * Peeks ahead to check if current position starts a semantic marker.
         * Assumes current position is at '/'.
         *
         * Disambiguation heuristic:
         * - If content between slashes contains a space, it's a semantic marker
         * - Otherwise it's likely a path (e.g., /path/to/file) and we don't tokenize it
         *
         * @param stopChar - Additional character to stop lookahead at (for templates, use '`')
         */
        tryPeekSemanticMarker(stopChar) {
          let lookahead = 1;
          let hasSpace = false;
          while (this.pos + lookahead < this.source.length) {
            const c = this.source[this.pos + lookahead];
            if (c === "/") {
              return hasSpace;
            }
            if (c === "\n" || stopChar && c === stopChar) {
              return false;
            }
            if (c === " ") {
              hasSpace = true;
            }
            lookahead++;
          }
          return false;
        }
        /**
         * Scans and tokenizes a semantic marker: /content with spaces/
         * Assumes current position is at '/' and that tryPeekSemanticMarker returned true.
         */
        scanSemanticMarkerContent() {
          this.advance();
          let content = "";
          while (!this.isAtEnd() && this.peek() !== "/") {
            content += this.advance();
          }
          if (this.peek() === "/") {
            this.advance();
          }
          this.addToken("SEMANTIC_MARKER", "/" + content + "/");
        }
        /**
         * Tries to scan a semantic marker: /content with spaces/
         * Returns true if a semantic marker was found and tokenized.
         */
        tryScanSemanticMarker() {
          if (this.tryPeekSemanticMarker()) {
            this.scanSemanticMarkerContent();
            return true;
          }
          return false;
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
            if (!segment)
              break;
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
          this.addToken("LINK", value);
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
          this.addToken("ANCHOR", name);
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
            } else if (this.lookAhead("{~~")) {
              if (part) {
                this.addToken("TEMPLATE_PART", part);
                part = "";
              }
              this.consumeChars(3);
              this.addToken("SEMANTIC_OPEN", "{~~");
              this.scanSemanticContent();
            } else if (this.peek() === "/" && this.tryPeekSemanticMarker("`")) {
              if (part) {
                this.addToken("TEMPLATE_PART", part);
                part = "";
              }
              this.scanSemanticMarkerContent();
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
            "DO": "DO",
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
            "DELEGATE": "DELEGATE",
            "TO": "TO",
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
          const { skills, agents, tools, uses } = this.parseUsesField(parsed);
          return {
            kind: "Frontmatter",
            name: parsed.name || "",
            description: parsed.description || "",
            skills,
            agents,
            tools,
            uses,
            imports: this.parseImports(parsed.imports),
            raw: parsed,
            span: AST2.mergeSpans(start.span, end.span)
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
              if (typeof entry !== "string")
                continue;
              if (entry.startsWith("~")) {
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
            } else if (this.check("SEMANTIC_MARKER")) {
              const semanticToken = this.advance();
              const description = semanticToken.value.slice(1, -1);
              typeAnnotation = {
                kind: "SemanticType",
                description,
                span: semanticToken.span
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
          if (this.check("DELEGATE")) {
            return this.parseDelegateStatement();
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
          if (this.check("LINK")) {
            return this.parseLink();
          }
          if (this.check("ANCHOR")) {
            return this.parseAnchor();
          }
          if (this.check("SEMANTIC_OPEN") || this.check("SEMANTIC_MARKER")) {
            return this.parseSemanticMarker();
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
            } else if (this.check("SEMANTIC_OPEN") || this.check("SEMANTIC_MARKER")) {
              parts.push(this.parseSemanticMarker());
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
            span: AST2.mergeSpans(start.span, end?.span || this.previous().span)
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
        parseSemanticMarker() {
          if (this.check("SEMANTIC_MARKER")) {
            const token = this.advance();
            const content2 = token.value.slice(1, -1);
            const interpolations2 = [];
            const varMatches = content2.matchAll(/\$([a-zA-Z][a-zA-Z0-9_-]*)/g);
            for (const match of varMatches) {
              interpolations2.push({
                kind: "VariableReference",
                name: match[1],
                span: token.span
                // Approximate span
              });
            }
            return {
              kind: "SemanticMarker",
              content: content2,
              interpolations: interpolations2,
              span: token.span
            };
          }
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
          while (!this.isAtEnd() && !this.check("NEWLINE") && // v0.8: link-based references
          !this.check("LINK") && !this.check("ANCHOR") && !this.check("SEMANTIC_OPEN") && !this.check("SEMANTIC_MARKER") && !this.check("INFERRED_VAR") && !this.check("DOLLAR_IDENT") && !this.check("TYPE_IDENT")) {
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
          const condition = this.parseCondition();
          this.expect("DO");
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
          const elseIf = [];
          let elseBody = null;
          while (this.check("ELSE")) {
            const elseStart = this.current();
            this.advance();
            if (this.check("IF")) {
              this.advance();
              const elseIfCondition = this.parseCondition();
              this.expect("THEN");
              this.expect("COLON");
              this.skipNewlines();
              const elseIfBody = this.parseIndentedBlocks();
              elseIf.push({
                condition: elseIfCondition,
                body: elseIfBody,
                span: AST2.mergeSpans(elseStart.span, elseIfBody.length > 0 ? elseIfBody[elseIfBody.length - 1].span : elseIfCondition.span)
              });
            } else {
              this.expect("COLON");
              this.skipNewlines();
              elseBody = this.parseIndentedBlocks();
              break;
            }
          }
          let endSpan = condition.span;
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
            span: AST2.mergeSpans(start.span, endSpan)
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
        // v0.8: DELEGATE statement for agent delegation
        // Syntax: DELEGATE /task/ TO ~/agent/x [WITH #template]
        parseDelegateStatement() {
          const start = this.advance();
          const task = this.parseSemanticMarker();
          this.expect("TO");
          const target = this.parseLink();
          let withAnchor;
          if (this.check("WITH")) {
            this.advance();
            withAnchor = this.parseAnchor();
          }
          let parameters;
          if (this.check("COLON")) {
            parameters = this.parseParameterBlock();
          }
          return {
            kind: "DelegateStatement",
            task,
            target,
            withAnchor,
            parameters,
            span: AST2.mergeSpans(start.span, this.previous().span)
          };
        }
        // v0.8: USE statement for skill activation
        // Syntax: USE ~/skill/x TO /task/
        parseUseStatement() {
          const start = this.advance();
          const link = this.parseLink();
          this.expect("TO");
          const task = this.parseSemanticMarker();
          let parameters;
          if (this.check("COLON")) {
            parameters = this.parseParameterBlock();
          }
          return {
            kind: "UseStatement",
            link,
            task,
            parameters,
            span: AST2.mergeSpans(start.span, this.previous().span)
          };
        }
        // v0.8: EXECUTE statement for tool invocation
        // Syntax: EXECUTE ~/tool/x TO /action/
        parseExecuteStatement() {
          const start = this.advance();
          const link = this.parseLink();
          this.expect("TO");
          const task = this.parseSemanticMarker();
          return {
            kind: "ExecuteStatement",
            link,
            task,
            span: AST2.mergeSpans(start.span, this.previous().span)
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
            span: AST2.mergeSpans(start.span, anchor.span)
          };
        }
        // v0.8: Parse parameter block
        parseParameterBlock() {
          const start = this.advance();
          this.skipNewlines();
          const parameters = [];
          const hasIndent = this.check("INDENT");
          if (hasIndent) {
            this.advance();
          }
          while (this.check("LIST_MARKER") && !this.isAtEnd()) {
            this.advance();
            const param = this.parseVariableDeclaration(true);
            parameters.push(param);
            this.skipNewlines();
            if (!this.check("LIST_MARKER") || this.check("HEADING")) {
              break;
            }
          }
          if (hasIndent && this.check("DEDENT")) {
            this.advance();
          }
          return {
            kind: "ParameterBlock",
            parameters,
            span: AST2.mergeSpans(start.span, this.previous().span)
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
          while (!this.isAtEnd() && !this.check("RPAREN") && !this.check("AND") && !this.check("OR") && !this.check("THEN") && !this.check("DO") && !this.check("COLON")) {
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
            if (this.check("LINK")) {
              content.push(this.parseLink());
            } else if (this.check("ANCHOR")) {
              content.push(this.parseAnchor());
            } else if (this.check("SEMANTIC_OPEN") || this.check("SEMANTIC_MARKER")) {
              content.push(this.parseSemanticMarker());
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
            this.expect("COLON");
            this.skipNewlines();
            const hasIndent = this.check("INDENT");
            if (hasIndent) {
              this.advance();
            }
            while (this.check("LIST_MARKER") && !this.isAtEnd()) {
              this.advance();
              const param = this.parseVariableDeclaration(true);
              parameters.push(param);
              this.skipNewlines();
              if (!this.check("LIST_MARKER") || this.check("HEADING")) {
                break;
              }
            }
            if (hasIndent && this.check("DEDENT")) {
              this.advance();
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
      exports.Compiler = void 0;
      exports.compile = compile2;
      exports.createRegistry = createRegistry;
      exports.buildFullDependencyGraph = buildFullDependencyGraph;
      var parser_1 = require_parser();
      var AST2 = __importStar(require_ast());
      var BUILTIN_PRIMITIVES2 = /* @__PURE__ */ new Set(["String", "Number", "Boolean"]);
      var Compiler2 = class {
        // v0.7: Track declared tools from uses:
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
          this.validateDelegateStatements(ast);
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
            case "DelegateStatement":
              this.extractFromDelegateStatement(block);
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
            type: this.getTypeAnnotationName(decl.typeAnnotation),
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
            if (content.kind === "Link") {
              this.extractLinkReference(content);
            } else if (content.kind === "Anchor") {
              this.extractAnchorReference(content);
            } else if (content.kind === "SemanticMarker") {
              this.sourceMap.push({
                source: content.span,
                type: "semantic",
                name: content.content
              });
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
        extractFromDelegateStatement(deleg) {
          this.extractLinkReference(deleg.target);
          this.sourceMap.push({
            source: deleg.task.span,
            type: "semantic",
            name: deleg.task.content
          });
          if (deleg.withAnchor) {
            this.extractAnchorReference(deleg.withAnchor);
          }
          if (deleg.parameters) {
            for (const param of deleg.parameters.parameters) {
              this.extractVariableDeclaration(param);
            }
          }
          this.sourceMap.push({
            source: deleg.span,
            type: "control-flow",
            name: "DelegateStatement"
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
            }
          }
        }
        getTypeAnnotationName(typeAnnotation) {
          if (!typeAnnotation)
            return null;
          if (typeAnnotation.kind === "TypeReference") {
            return typeAnnotation.name;
          }
          return typeAnnotation.description;
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
            case "SemanticMarker":
              this.sourceMap.push({
                source: expr.span,
                type: "semantic",
                name: expr.content
              });
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
          const kind = AST2.getLinkKind(link);
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
                } else if (content.kind === "SemanticMarker") {
                  for (const interpolation of content.interpolations) {
                    if (!this.definedVariables.has(interpolation.name)) {
                      usedBeforeDefined.add(interpolation.name);
                    }
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
            }
          }
        }
        checkExpressionScope(expr, usedBeforeDefined) {
          if (expr.kind === "VariableReference") {
            if (!this.definedVariables.has(expr.name)) {
              usedBeforeDefined.add(expr.name);
            }
          } else if (expr.kind === "InferredVariable") {
          } else if (expr.kind === "SemanticMarker") {
            for (const interpolation of expr.interpolations) {
              if (!this.definedVariables.has(interpolation.name)) {
                usedBeforeDefined.add(interpolation.name);
              }
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
            } else if (block.kind === "ForEachStatement" || block.kind === "ParallelForEachStatement") {
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
          const linkKind = AST2.getLinkKind(deleg.target);
          if (linkKind !== "agent") {
            this.diagnostics.push({
              severity: "warning",
              code: "W003",
              message: `DELEGATE target '${deleg.target.raw}' should be an agent (~/agent/...)`,
              span: deleg.target.span
            });
          }
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
          if (deleg.target.kind !== "Link") {
            return;
          }
          const targetPath = deleg.target.path.join("/");
          let skillParams = [];
          if (targetPath === this.metadata.name) {
            skillParams = this.metadata.parameters;
          } else if (this.registry) {
            const skill = this.registry.get(targetPath);
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
      if (char === "/") {
        const result = this.tryScanSemanticMarker();
        if (result) return;
      }
      if (char === "~" && this.peekAt(1) === "/") {
        const result = this.tryScanLink();
        if (result) return;
      }
      if (char === "#" && this.column > 0) {
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
    /**
     * Peeks ahead to check if current position starts a semantic marker.
     * Assumes current position is at '/'.
     * 
     * Disambiguation heuristic:
     * - If content between slashes contains a space, it's a semantic marker
     * - Otherwise it's likely a path (e.g., /path/to/file) and we don't tokenize it
     * 
     * @param stopChar - Additional character to stop lookahead at (for templates, use '`')
     */
    tryPeekSemanticMarker(stopChar) {
      let lookahead = 1;
      let hasSpace = false;
      while (this.pos + lookahead < this.source.length) {
        const c = this.source[this.pos + lookahead];
        if (c === "/") {
          return hasSpace;
        }
        if (c === "\n" || stopChar && c === stopChar) {
          return false;
        }
        if (c === " ") {
          hasSpace = true;
        }
        lookahead++;
      }
      return false;
    }
    /**
     * Scans and tokenizes a semantic marker: /content with spaces/
     * Assumes current position is at '/' and that tryPeekSemanticMarker returned true.
     */
    scanSemanticMarkerContent() {
      this.advance();
      let content = "";
      while (!this.isAtEnd() && this.peek() !== "/") {
        content += this.advance();
      }
      if (this.peek() === "/") {
        this.advance();
      }
      this.addToken("SEMANTIC_MARKER", "/" + content + "/");
    }
    /**
     * Tries to scan a semantic marker: /content with spaces/
     * Returns true if a semantic marker was found and tokenized.
     */
    tryScanSemanticMarker() {
      if (this.tryPeekSemanticMarker()) {
        this.scanSemanticMarkerContent();
        return true;
      }
      return false;
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
      this.addToken("LINK", value);
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
      this.addToken("ANCHOR", name);
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
        } else if (this.lookAhead("{~~")) {
          if (part) {
            this.addToken("TEMPLATE_PART", part);
            part = "";
          }
          this.consumeChars(3);
          this.addToken("SEMANTIC_OPEN", "{~~");
          this.scanSemanticContent();
        } else if (this.peek() === "/" && this.tryPeekSemanticMarker("`")) {
          if (part) {
            this.addToken("TEMPLATE_PART", part);
            part = "";
          }
          this.scanSemanticMarkerContent();
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
        "DO": "DO",
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
        "DELEGATE": "DELEGATE",
        "TO": "TO",
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
      const { skills, agents, tools, uses } = this.parseUsesField(parsed);
      return {
        kind: "Frontmatter",
        name: parsed.name || "",
        description: parsed.description || "",
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
          if (entry.startsWith("~")) {
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
        } else if (this.check("SEMANTIC_MARKER")) {
          const semanticToken = this.advance();
          const description = semanticToken.value.slice(1, -1);
          typeAnnotation = {
            kind: "SemanticType",
            description,
            span: semanticToken.span
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
      if (this.check("DELEGATE")) {
        return this.parseDelegateStatement();
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
      if (this.check("LINK")) {
        return this.parseLink();
      }
      if (this.check("ANCHOR")) {
        return this.parseAnchor();
      }
      if (this.check("SEMANTIC_OPEN") || this.check("SEMANTIC_MARKER")) {
        return this.parseSemanticMarker();
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
        } else if (this.check("SEMANTIC_OPEN") || this.check("SEMANTIC_MARKER")) {
          parts.push(this.parseSemanticMarker());
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
    parseSemanticMarker() {
      if (this.check("SEMANTIC_MARKER")) {
        const token = this.advance();
        const content2 = token.value.slice(1, -1);
        const interpolations2 = [];
        const varMatches = content2.matchAll(/\$([a-zA-Z][a-zA-Z0-9_-]*)/g);
        for (const match of varMatches) {
          interpolations2.push({
            kind: "VariableReference",
            name: match[1],
            span: token.span
            // Approximate span
          });
        }
        return {
          kind: "SemanticMarker",
          content: content2,
          interpolations: interpolations2,
          span: token.span
        };
      }
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
      !this.check("LINK") && !this.check("ANCHOR") && !this.check("SEMANTIC_OPEN") && !this.check("SEMANTIC_MARKER") && !this.check("INFERRED_VAR") && !this.check("DOLLAR_IDENT") && !this.check("TYPE_IDENT")) {
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
      const condition = this.parseCondition();
      this.expect("DO");
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
      const elseIf = [];
      let elseBody = null;
      while (this.check("ELSE")) {
        const elseStart = this.current();
        this.advance();
        if (this.check("IF")) {
          this.advance();
          const elseIfCondition = this.parseCondition();
          this.expect("THEN");
          this.expect("COLON");
          this.skipNewlines();
          const elseIfBody = this.parseIndentedBlocks();
          elseIf.push({
            condition: elseIfCondition,
            body: elseIfBody,
            span: mergeSpans(
              elseStart.span,
              elseIfBody.length > 0 ? elseIfBody[elseIfBody.length - 1].span : elseIfCondition.span
            )
          });
        } else {
          this.expect("COLON");
          this.skipNewlines();
          elseBody = this.parseIndentedBlocks();
          break;
        }
      }
      let endSpan = condition.span;
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
    // v0.8: DELEGATE statement for agent delegation
    // Syntax: DELEGATE /task/ TO ~/agent/x [WITH #template]
    parseDelegateStatement() {
      const start = this.advance();
      const task = this.parseSemanticMarker();
      this.expect("TO");
      const target = this.parseLink();
      let withAnchor;
      if (this.check("WITH")) {
        this.advance();
        withAnchor = this.parseAnchor();
      }
      let parameters;
      if (this.check("COLON")) {
        parameters = this.parseParameterBlock();
      }
      return {
        kind: "DelegateStatement",
        task,
        target,
        withAnchor,
        parameters,
        span: mergeSpans(start.span, this.previous().span)
      };
    }
    // v0.8: USE statement for skill activation
    // Syntax: USE ~/skill/x TO /task/
    parseUseStatement() {
      const start = this.advance();
      const link = this.parseLink();
      this.expect("TO");
      const task = this.parseSemanticMarker();
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
    // Syntax: EXECUTE ~/tool/x TO /action/
    parseExecuteStatement() {
      const start = this.advance();
      const link = this.parseLink();
      this.expect("TO");
      const task = this.parseSemanticMarker();
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
      const hasIndent = this.check("INDENT");
      if (hasIndent) {
        this.advance();
      }
      while (this.check("LIST_MARKER") && !this.isAtEnd()) {
        this.advance();
        const param = this.parseVariableDeclaration(true);
        parameters.push(param);
        this.skipNewlines();
        if (!this.check("LIST_MARKER") || this.check("HEADING")) {
          break;
        }
      }
      if (hasIndent && this.check("DEDENT")) {
        this.advance();
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
      while (!this.isAtEnd() && !this.check("RPAREN") && !this.check("AND") && !this.check("OR") && !this.check("THEN") && !this.check("DO") && !this.check("COLON")) {
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
        if (this.check("LINK")) {
          content.push(this.parseLink());
        } else if (this.check("ANCHOR")) {
          content.push(this.parseAnchor());
        } else if (this.check("SEMANTIC_OPEN") || this.check("SEMANTIC_MARKER")) {
          content.push(this.parseSemanticMarker());
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
        this.expect("COLON");
        this.skipNewlines();
        const hasIndent = this.check("INDENT");
        if (hasIndent) {
          this.advance();
        }
        while (this.check("LIST_MARKER") && !this.isAtEnd()) {
          this.advance();
          const param = this.parseVariableDeclaration(true);
          parameters.push(param);
          this.skipNewlines();
          if (!this.check("LIST_MARKER") || this.check("HEADING")) {
            break;
          }
        }
        if (hasIndent && this.check("DEDENT")) {
          this.advance();
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
    // v0.7: Track declared tools from uses:
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
        case "DelegateStatement":
          this.extractFromDelegateStatement(block);
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
        type: this.getTypeAnnotationName(decl.typeAnnotation),
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
        if (content.kind === "Link") {
          this.extractLinkReference(content);
        } else if (content.kind === "Anchor") {
          this.extractAnchorReference(content);
        } else if (content.kind === "SemanticMarker") {
          this.sourceMap.push({
            source: content.span,
            type: "semantic",
            name: content.content
          });
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
    extractFromDelegateStatement(deleg) {
      this.extractLinkReference(deleg.target);
      this.sourceMap.push({
        source: deleg.task.span,
        type: "semantic",
        name: deleg.task.content
      });
      if (deleg.withAnchor) {
        this.extractAnchorReference(deleg.withAnchor);
      }
      if (deleg.parameters) {
        for (const param of deleg.parameters.parameters) {
          this.extractVariableDeclaration(param);
        }
      }
      this.sourceMap.push({
        source: deleg.span,
        type: "control-flow",
        name: "DelegateStatement"
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
    extractFromExpression(expr) {
      switch (expr.kind) {
        // v0.8: Link and Anchor references replace old sigil-based syntax
        case "Link":
          this.extractLinkReference(expr);
          break;
        case "Anchor":
          this.extractAnchorReference(expr);
          break;
        case "SemanticMarker":
          this.sourceMap.push({
            source: expr.span,
            type: "semantic",
            name: expr.content
          });
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
            } else if (content.kind === "SemanticMarker") {
              for (const interpolation of content.interpolations) {
                if (!this.definedVariables.has(interpolation.name)) {
                  usedBeforeDefined.add(interpolation.name);
                }
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
        }
      }
    }
    checkExpressionScope(expr, usedBeforeDefined) {
      if (expr.kind === "VariableReference") {
        if (!this.definedVariables.has(expr.name)) {
          usedBeforeDefined.add(expr.name);
        }
      } else if (expr.kind === "InferredVariable") {
      } else if (expr.kind === "SemanticMarker") {
        for (const interpolation of expr.interpolations) {
          if (!this.definedVariables.has(interpolation.name)) {
            usedBeforeDefined.add(interpolation.name);
          }
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
        } else if (block.kind === "ForEachStatement" || block.kind === "ParallelForEachStatement") {
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
      if (deleg.target.kind !== "Link") {
        return;
      }
      const targetPath = deleg.target.path.join("/");
      let skillParams = [];
      if (targetPath === this.metadata.name) {
        skillParams = this.metadata.parameters;
      } else if (this.registry) {
        const skill = this.registry.get(targetPath);
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
              typeName: block.typeAnnotation?.kind === "TypeReference" ? block.typeAnnotation.name : block.typeAnnotation?.kind === "SemanticType" ? block.typeAnnotation.description : void 0,
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
              if (import_core.AST.isLink(item)) {
                references.push({
                  kind: "link",
                  path: item.path,
                  anchor: item.anchor ?? void 0,
                  target: item.raw,
                  span: item.span
                });
              } else if (import_core.AST.isAnchor(item)) {
                references.push({
                  kind: "anchor",
                  anchor: item.name,
                  target: `#${item.name}`,
                  span: item.span
                });
              } else if (item.kind === "SemanticMarker") {
                semanticMarkers.push({ content: item.content, span: item.span });
              }
            }
            break;
        }
      }
    }
    analyzeExpression(expr, references, semanticMarkers) {
      if (import_core.AST.isLink(expr)) {
        references.push({
          kind: "link",
          path: expr.path,
          anchor: expr.anchor ?? void 0,
          target: expr.raw,
          span: expr.span
        });
        return;
      }
      if (import_core.AST.isAnchor(expr)) {
        references.push({
          kind: "anchor",
          anchor: expr.name,
          target: `#${expr.name}`,
          span: expr.span
        });
        return;
      }
      switch (expr.kind) {
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
    // v0.8: Path completion for ~/path/to/file
    getPathCompletions(partial) {
      const items = [];
      for (const [key, docState] of this.skillRegistry) {
        if (key.startsWith(partial)) {
          const kind = this.inferLinkKind(key.split("/"));
          items.push({
            label: "~/" + key,
            kind: 17 /* File */,
            detail: kind,
            insertText: key.substring(partial.length)
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
        { label: "appropriate location", kind: 15 /* Snippet */, insertText: "appropriate location/" },
        { label: "relevant context", kind: 15 /* Snippet */, insertText: "relevant context/" },
        { label: "best approach for", kind: 15 /* Snippet */, insertText: "best approach for /" },
        { label: "determine based on", kind: 15 /* Snippet */, insertText: "determine based on /" }
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
  function handleValidateProject(id, files) {
    try {
      const fileResults = {};
      const allNodes = /* @__PURE__ */ new Map();
      const allEdges = [];
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
