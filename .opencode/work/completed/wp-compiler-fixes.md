The big issues to fix next

1) The lexer never emits code blocks or blockquotes

You have scanCodeBlock() and scanBlockquote(), but scanToken() never calls them.

So right now:

``` fences will be tokenized as three separate TEXT tokens (or operators), not as CODE_BLOCK_*

> lines won’t become BLOCKQUOTE

Fix: in scanToken(), add start-of-line checks, similar to frontmatter/hr/heading:

if this.column === 0 && this.lookAhead('```') → this.scanCodeBlock(); return;

if this.column === 0 && this.peek() === '>' → this.scanBlockquote(); return;

(And make sure these run before generic operator/text handling.)

2) Template interpolation tokenization is currently wrong

In scanTemplate() you treat ${...} as:

this.addToken('DOLLAR_IDENT', expr);


But:

DOLLAR_IDENT elsewhere means a token whose value includes the leading $ (like "$foo")

parseTemplateLiteral() assumes DOLLAR_IDENT is a variable and does slice(1)

here you’re stuffing arbitrary expression text into a DOLLAR_IDENT, so slice(1) will drop the first character of the expression ("user.name" becomes "ser.name")

Also: even if you fixed the slice, ${...} is not necessarily a variable; it can be an expression.

Options (pick one):

Restrict template interpolation to variables + inferred vars only
Then ${foo} should emit a proper DOLLAR_IDENT with value "$foo" (and reject anything else).

Support full expressions inside ${ ... }
Then you need a dedicated token type like TEMPLATE_EXPR and a tiny “expression mode” lexer inside template scanning, or you re-tokenize the expression substring with your main lexer and parse it as an expression.

Given your current parser, (1) is the fastest/cleanest.

3) MemberAccess / FunctionCall span calculations are off in chained cases

In parseVariableReference() you build up expr as you parse .prop and then optional (...).

But you merge spans using the original varToken.span each time:

span: AST.mergeSpans(varToken.span, propToken.span)


So for $a.b.c, the span for the final node will only cover $a….c based on the first token’s span, not the progressively grown expression span (and it’ll get worse if there’s nesting).

Fix: merge using expr.span (the current accumulated expression) instead of varToken.span.

Same for the FunctionCall span: merge expr.span with closing paren span, not varToken.span.

Medium issues / correctness gaps
4) PushStatement assumes the target is a plain variable

You do:

const target = this.parseVariableReference() as AST.VariableReference;


But parseVariableReference() can return MemberAccess or FunctionCall. If someone writes:

$obj.arr << 1 (member access) — should this be allowed?

$fn() << 1 (function call) — almost certainly should not

Even if you plan to validate later, the cast hides bugs and can cause downstream crashes.

Recommendation: parse into const targetExpr = this.parseVariableReference() and:

if targetExpr.kind !== 'VariableReference' && targetExpr.kind !== 'MemberAccess' (whatever you allow) → emit E019 and synthesize a safe dummy target.

5) The “type definition vs var decl” disambiguation is a bit fragile

You’re using “after colon is TYPE_IDENT” as the discriminator:

Type def: $Type: semantic words (no $OtherType immediately)

Var decl: $x: $Type = ... (colon followed by TYPE_IDENT)

That’s fine, but it means type defs like:

$User: $Person (alias type) would be parsed as a variable declaration, not a type def.

If that’s intentional, cool. If not, you’ll want a clearer grammar rule (e.g., type defs only allowed at top level, or require TYPE_IDENT immediately followed by : at line start, etc.).

6) Frontmatter YAML parsing: workable, but easy to break

I get why you’ve hand-rolled it, but it will misparse a bunch of valid YAML:

quoted strings with : inside

nested objects more than one level

arrays of objects beyond your imports special-case

inline arrays with spaces/quotes edge cases

If you want “good enough” for MDZ, that’s okay — just be aware this is the part that’ll generate the most “why won’t my config parse” reports.

Things that look solid

The AST shapes are consistent and future-friendly (good separation between Section vs Heading, link nodes, semantic markers, etc.).

parseSemanticText() slicing from source offsets is a nice way to preserve the raw span content.

blockDepth and loopDepth tracking is a good foundation for enforcing rules like DO placement, BREAK/CONTINUE legality, etc.

Link token encoding as JSON is pragmatic and makes the parser simple.

Quick “next pass” checklist (highest ROI)

Wire scanCodeBlock() and scanBlockquote() into scanToken().

Decide what ${...} means in templates and fix tokenization accordingly.

Fix span merging in parseVariableReference() (member + call).

Remove the unsafe cast in parsePushStatement() and validate target kind.

---

LSP wiring and the ZenLanguageServer class drifted out of sync. As written, packages/lsp/src/stdio.ts won’t typecheck/compile against packages/lsp/src/server.ts because it calls methods that either don’t exist or are private.

Here are the concrete problems and the cleanest fixes.

1) stdio.ts calls zenServer.setWorkspaceFolders(...) but no such method exists

In stdio.ts:

zenServer.setWorkspaceFolders(params.workspaceFolders.map(f => f.uri));


In server.ts, there’s no setWorkspaceFolders at all. Either delete this call, or add the method.

Minimal fix (delete)

If you don’t actually use workspace folders in the server, just remove that line and keep scanning.

Better fix (add + store)

Add to ZenLanguageServer:

private workspaceFolders: string[] = [];

setWorkspaceFolders(uris: string[]): void {
  this.workspaceFolders = uris;
}


(If you later want “open external links” or smarter registry keys, you’ll likely use this.)

2) stdio.ts calls zenServer.analyzeDocument(...) but analyzeDocument is private

In stdio.ts during scan:

zenServer.analyzeDocument(uri, content);


But in server.ts:

private analyzeDocument(uri: string, content: string): DocumentState


That’s a hard TS error.

Fix options
Option A (recommended): expose a dedicated “index” method

This avoids exposing your internal analysis pipeline directly.

In server.ts:

indexDocument(uri: string, content: string): void {
  const state = this.analyzeDocument(uri, content);
  this.documents.set(uri, state);
}


Then in stdio.ts, replace:

zenServer.analyzeDocument(uri, content);


with:

zenServer.indexDocument(uri, content);

Option B: make analyzeDocument public

Works, but it’s a leaky API. If you want it anyway:

analyzeDocument(uri: string, content: string): DocumentState


(remove private)

3) stdio.ts uses await scanDirectory(...) but scanDirectory uses fs.promises correctly — good — but you’re mixing “indexing” vs “open documents”

Right now your scan is intended to populate the skillRegistry so link resolution works across the workspace.

If you use Option A above (indexDocument), it will also populate documents (because the simplest version sets it). If you’d rather keep scanned docs only in the registry (and not in “open documents”), split the responsibilities:

In server.ts:

indexWorkspaceDocument(uri: string, content: string): void {
  const state = this.analyzeDocument(uri, content);
  const relativePath = uri.replace(/\.mdz$/, "");
  this.skillRegistry.set(relativePath, state);
}


Then openDocument/updateDocument can still set documents, while scan only fills skillRegistry.

This matches the intent of your comments (“Register as skill using its path (URI) as the key”).

4) One more mismatch: your registry key for links probably won’t match URIs

In server.ts you do:

const relativePath = uri.replace(/\.mdz$/, "");
this.skillRegistry.set(relativePath, state);


But uri is an LSP URI like:

file:///Users/.../foo.mdz

Your links resolve as:

~/skill/x → path segments ['skill','x'] → joined to skill/x

So you’ll look up:

this.skillRegistry.get("skill/x")


…but you stored:

"file:///Users/.../skill/x"


Those won’t match.

Fix: canonicalize workspace-relative keys when indexing

When scanning, compute a workspace-relative path (no extension, forward slashes). For example:

store skill/x rather than full file://...

You already imported URI in stdio.ts, so you can do something like:

determine rootPath for each workspace folder

for each file fullPath, compute relative path from root

strip .mdz

normalize \ to /

Then pass that key (or pass both uri and key) into the server index method.

Pragmatic approach: change the server to accept an explicit registry key:

indexWorkspaceDocument(uri: string, content: string, registryKey: string): void {
  const state = this.analyzeDocument(uri, content);
  this.skillRegistry.set(registryKey, state);
}


And in scanDirectory, compute registryKey from fullPath relative to root.

This is the difference between “it compiles” and “go-to-definition across files actually works.”

Quick patch summary (smallest set that unblocks build)

Add to ZenLanguageServer:

setWorkspaceFolders(...) (or remove the call)

a public indexDocument(...) (or make analyzeDocument public)

Fix registry keying so ~/... lookups match stored keys (otherwise cross-file links will always show “Not found in workspace” even when files exist).
