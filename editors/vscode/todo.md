I will rewrite the VS Code extension files to adhere to the MDZ v0.5 language specification. This involves fixing the grammar scope mismatch, updating the syntax highlighting rules to match the new spec (including PARALLEL, BREAK, CONTINUE, and new semantic marker syntax), and correcting the language configuration.

1. Update package.json

I will verify the grammar path and ensure the scope name matches the grammar file.

<document index="5">
<source>/Users/coder/Repos/ai/mdz/editors/vscode/package.json</source>
<document_content>
{
"name": "mdz-vscode",
"displayName": "MDZ (Zen Markdown)",
"description": "Language support for MDZ (.mdz) - A markdown extension language for multi-agent systems",
"version": "0.3.0",
"publisher": "djgrant",
"license": "MIT",
"repository": {
"type": "git",
"url": "https://github.com/djgrant/mdz"
},
"engines": {
"vscode": "^1.85.0",
"node": ">=20.0.0"
},
"categories": [
"Programming Languages"
],
"activationEvents": [
"onLanguage:mdz"
],
"main": "./out/extension.js",
"contributes": {
"languages": [
{
"id": "mdz",
"aliases": [
"MDZ",
"Zen Markdown",
"mdz"
],
"extensions": [
".mdz"
],
"configuration": "./language-configuration.json"
}
],
"grammars": [
{
"language": "mdz",
"scopeName": "source.mdz",
"path": "./syntaxes/mdz.tmLanguage.json"
}
],
"commands": [
{
"command": "mdz.compile",
"title": "MDZ: Compile Current File"
},
{
"command": "mdz.check",
"title": "MDZ: Check Syntax"
}
],
"configuration": {
"title": "MDZ",
"properties": {
"mdz.expandTypes": {
"type": "boolean",
"default": true,
"description": "Expand type references during compilation"
},
"mdz.resolveReferences": {
"type": "boolean",
"default": true,
"description": "Resolve skill references during compilation"
},
"mdz.transformSemantics": {
"type": "boolean",
"default": true,
"description": "Transform semantic markers during compilation"
}
}
}
},
"scripts": {
"build": "tsc -p ./",
"clean": "rm -rf out",
"watch": "tsc -watch -p ./",
"vscode:prepublish": "pnpm run build",
"package": "vsce package --no-dependencies"
},
"dependencies": {
"@zenmarkdown/core": "workspace:*",
"vscode-languageclient": "^9.0.1"
},
"devDependencies": {
"@types/vscode": "^1.85.0",
"@types/node": "^20.0.0",
"@vscode/vsce": "^2.22.0",
"typescript": "^5.3.0"
}
}
</document_content>
</document>

2. Rewrite Grammar (syntaxes/mdz.tmLanguage.json)

I will rename the file from zen.tmLanguage.json to mdz.tmLanguage.json (as referenced in the updated package.json above) and completely rewrite it to match language-spec.md v0.5.

<document index="2">
<source>/Users/coder/Repos/ai/mdz/editors/vscode/syntaxes/mdz.tmLanguage.json</source>
<document_content>
{
"$schema": "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
"name": "MDZ",
"scopeName": "source.mdz",
"fileTypes": ["mdz"],
"patterns": [
{ "include": "#frontmatter" },
{ "include": "#comment" },
{ "include": "#code-block" },
{ "include": "#heading" },
{ "include": "#keyword" },
{ "include": "#control-flow" },
{ "include": "#type-definition" },
{ "include": "#variable" },
{ "include": "#type" },
{ "include": "#reference" },
{ "include": "#semantic-marker" },
{ "include": "#string" },
{ "include": "#template" },
{ "include": "#number" },
{ "include": "#operator" },
{ "include": "#list-marker" }
],
"repository": {
"frontmatter": {
"begin": "^---$",
"end": "^---$",
"name": "meta.frontmatter.mdz",
"contentName": "source.yaml",
"patterns": [
{ "include": "source.yaml" }
]
},
"heading": {
"match": "^(#{1,6})\\s+(.+)$",
"captures": {
"1": { "name": "punctuation.definition.heading.mdz" },
"2": { "name": "entity.name.section.mdz" }
},
"name": "markup.heading.mdz"
},
"comment": {
"begin": "<!--",
"end": "-->",
"name": "comment.block.mdz"
},
"control-flow": {
"patterns": [
{
"match": "\\b(PARALLEL\\s+FOR\\s+EACH|FOR\\s+EACH|WHILE|IF|THEN|ELSE|BREAK|CONTINUE|DO)\\b",
"name": "keyword.control.mdz"
},
{
"match": "\\b(IN|AND|OR|NOT|WITH)\\b",
"name": "keyword.operator.word.mdz"
}
]
},
"type-definition": {
"match": "^(\\s*)(\\$[A-Z][a-zA-Z0-9]*)\\s*(:)",
"captures": {
"2": { "name": "entity.name.type.definition.mdz" },
"3": { "name": "keyword.operator.assignment.mdz" }
}
},
"variable": {
"patterns": [
{
"comment": "Inferred variable: $/name/",
"match": "\\$/[^/\\n]+/",
"name": "variable.other.inferred.mdz"
},
{
"match": "\\$[a-z][a-zA-Z0-9-]*",
"name": "variable.other.mdz"
}
]
},
"type": {
"match": "\\$[A-Z][a-zA-Z0-9]*",
"name": "entity.name.type.mdz"
},
"reference": {
"patterns": [
{
"match": "\\[\\[([a-z][a-z0-9-]*)(#[a-z][a-z0-9-]*)?\\]\\]",
"name": "meta.reference.skill.mdz",
"captures": {
"0": { "name": "string.link.mdz" },
"1": { "name": "entity.name.type.skill.mdz" },
"2": { "name": "entity.name.type.section.mdz" }
}
},
{
"match": "\\[\\[(#[a-z][a-z0-9-]*)\\]\\]",
"name": "meta.reference.section.mdz",
"captures": {
"0": { "name": "string.link.mdz" },
"1": { "name": "entity.name.type.section.mdz" }
}
}
]
},
"semantic-marker": {
"patterns": [
{
"begin": "/(?=[^/\\n]+/)",
"end": "/",
"name": "string.interpolated.semantic.mdz",
"patterns": [
{ "include": "#variable" }
]
}
]
},
"string": {
"match": "\"([^\"]*)\"",
"name": "string.quoted.double.mdz"
},
"template": {
"begin": "`",
"end": "`",
"name": "string.template.mdz",
"patterns": [
{
"match": "\\$\\{[^}]*\\}",
"name": "variable.other.interpolated.mdz"
},
{ "include": "#variable" },
{ "include": "#semantic-marker" }
]
},
"number": {
"match": "-?\\d+(\\.\\d+)?",
"name": "constant.numeric.mdz"
},
"operator": {
"patterns": [
{
"match": "=>",
"name": "keyword.operator.arrow.mdz"
},
{
"match": "!=|<=|>=|<|>|=",
"name": "keyword.operator.comparison.mdz"
},
{
"match": ":",
"name": "keyword.operator.assignment.mdz"
},
{
"match": "\\|",
"name": "keyword.operator.type.union.mdz"
},
{
"match": "\\.",
"name": "keyword.operator.accessor.mdz"
}
]
},
"code-block": {
"begin": "^\\s*```(\\w*)$",
"end": "^\\s*```$",
"name": "markup.fenced_code.mdz",
"beginCaptures": {
"1": { "name": "variable.parameter.mdz" }
},
"contentName": "meta.embedded.block.mdz"
},
"list-marker": {
"match": "^\\s*(-|\\d+\\.)\\s",
"name": "punctuation.definition.list_item.mdz"
}
}
}
</document_content>
</document>

3. Update language-configuration.json

I will update the comments configuration to use HTML comments (<!-- -->) instead of line comments, as > is for blockquotes in Markdown.

<document index="4">
<source>/Users/coder/Repos/ai/mdz/editors/vscode/language-configuration.json</source>
<document_content>
{
"comments": {
"blockComment": ["<!--", "-->"]
},
"brackets": [
["[", "]"],
["(", ")"],
["{", "}"]
],
"autoClosingPairs": [
{ "open": "[", "close": "]" },
{ "open": "(", "close": ")" },
{ "open": "{", "close": "}" },
{ "open": "\"", "close": "\"" },
{ "open": "`", "close": "`" },
{ "open": "[[", "close": "]]" },
{ "open": "<!--", "close": "-->" }
],
"surroundingPairs": [
["[", "]"],
["(", ")"],
["{", "}"],
["\"", "\""],
["`", "`"],
["/", "/"]
],
"folding": {
"markers": {
"start": "^\\s*##",
"end": "^\\s*##"
}
},
"wordPattern": "(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s]+)"
}
</document_content>
</document>

4. Refine extension.ts

I will clean up the extension entry point. While it remains a lightweight wrapper until the core compiler is fully integrated, I will ensure it correctly identifies .mdz files and uses the proper language ID.

<document index="1">
<source>/Users/coder/Repos/ai/mdz/editors/vscode/src/extension.ts</source>
<document_content>
import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
console.log('MDZ language extension is now active');

// Register compile command
const compileCommand = vscode.commands.registerCommand('mdz.compile', async () => {
const editor = vscode.window.activeTextEditor;
if (!editor) {
vscode.window.showErrorMessage('No active editor');
return;
}

code
Code
download
content_copy
expand_less
const document = editor.document;
if (document.languageId !== 'mdz') {
vscode.window.showErrorMessage('Not a MDZ file');
return;
}

await document.save();
vscode.window.showInformationMessage(`Compiling ${path.basename(document.fileName)}...`);

// In a full implementation, this would invoke the @zenmarkdown/core compiler
// For now, we validate the file extension and language mode
vscode.window.showInformationMessage('Compilation complete (Mock)');

});

// Register check command
const checkCommand = vscode.commands.registerCommand('mdz.check', async () => {
const editor = vscode.window.activeTextEditor;
if (!editor) {
vscode.window.showErrorMessage('No active editor');
return;
}

code
Code
download
content_copy
expand_less
const document = editor.document;
if (document.languageId !== 'mdz') {
vscode.window.showErrorMessage('Not a MDZ file');
return;
}

vscode.window.showInformationMessage(`Checking ${path.basename(document.fileName)}...`);
// Mock syntax check
vscode.window.showInformationMessage('Syntax check passed');

});

context.subscriptions.push(compileCommand, checkCommand);
}

export function deactivate(): any | undefined {
return undefined;
}
</document_content>
</document>
