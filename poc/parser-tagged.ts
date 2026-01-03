/**
 * Tagged Hybrid Parser for Direction B (Markdoc-style) Syntax
 * 
 * Tests parseability of:
 * - YAML frontmatter
 * - {% tag %} blocks
 * - {% var name /%} inline tags
 * - {% for %}, {% if %}, {% while %} control flow
 */

interface TaggedParseResult {
  frontmatter: Record<string, unknown>;
  tags: Array<{ name: string; attributes: Record<string, string>; line: number; isBlock: boolean }>;
  controlFlow: Array<{ type: string; condition: string; line: number }>;
  variables: string[];
  errors: string[];
}

export function parseTaggedSyntax(source: string): TaggedParseResult {
  const result: TaggedParseResult = {
    frontmatter: {},
    tags: [],
    controlFlow: [],
    variables: [],
    errors: []
  };

  const lines = source.split('\n');
  let inFrontmatter = false;
  let frontmatterContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Frontmatter detection
    if (line === '---' && i === 0) {
      inFrontmatter = true;
      continue;
    }
    if (line === '---' && inFrontmatter) {
      inFrontmatter = false;
      frontmatterContent.split('\n').forEach(fmLine => {
        const match = fmLine.match(/^(\w+):\s*(.+)$/);
        if (match) {
          result.frontmatter[match[1]] = match[2];
        }
      });
      continue;
    }
    if (inFrontmatter) {
      frontmatterContent += line + '\n';
      continue;
    }

    // Block tags: {% tagname %}...{% /tagname %}
    const blockOpenMatch = line.match(/\{%\s*(\w+)\s*([^%]*)\s*%\}/);
    if (blockOpenMatch && !blockOpenMatch[0].includes('/%}')) {
      const attrs = parseAttributes(blockOpenMatch[2]);
      result.tags.push({
        name: blockOpenMatch[1],
        attributes: attrs,
        line: lineNum,
        isBlock: true
      });

      // Check for control flow
      if (['for', 'if', 'while'].includes(blockOpenMatch[1])) {
        result.controlFlow.push({
          type: blockOpenMatch[1].toUpperCase(),
          condition: blockOpenMatch[2].trim(),
          line: lineNum
        });
      }
    }

    // Self-closing tags: {% tag /%}
    const selfClosingMatches = line.matchAll(/\{%\s*(\w+)\s*([^%]*)\s*\/%\}/g);
    for (const match of selfClosingMatches) {
      const attrs = parseAttributes(match[2]);
      result.tags.push({
        name: match[1],
        attributes: attrs,
        line: lineNum,
        isBlock: false
      });

      // Track variable references
      if (match[1] === 'var') {
        const varName = match[2].trim().split(' ')[0];
        result.variables.push(varName);
      }
    }

    // Closing tags: {% /tagname %}
    const closeMatch = line.match(/\{%\s*\/(\w+)\s*%\}/);
    if (closeMatch) {
      // Could track tag matching here for validation
    }
  }

  return result;
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const matches = attrString.matchAll(/(\w+)=(?:"([^"]*)"|{([^}]*)}|(\S+))/g);
  for (const match of matches) {
    attrs[match[1]] = match[2] || match[3] || match[4] || '';
  }
  return attrs;
}

// Test the parser
const testSource = `---
name: test-skill
description: A test skill
---

{% types %}
Task = any task
Strategy = "accumulate" | "independent"
{% /types %}

{% inputs %}
transforms: (Task, Strategy)[]
validator: Task
{% /inputs %}

# Workflow

1. Write to {% var current /%}

{% for ($task, $strategy) in $transforms %}
2. Delegate task
{% /for %}

{% while condition="not done and i < 5" %}
3. Continue working
{% /while %}

{% if condition="strategy == 'accumulate'" %}
4. Validate incrementally
{% else %}
4. Validate at end
{% /if %}
`;

const result = parseTaggedSyntax(testSource);
console.log('=== Tagged Syntax Parser Test ===\n');
console.log('Frontmatter:', result.frontmatter);
console.log('\nTags found:', result.tags.length);
result.tags.forEach(t => console.log(`  - ${t.name} (line ${t.line}, block: ${t.isBlock})`));
console.log('\nControl Flow:', result.controlFlow);
console.log('\nVariables referenced:', result.variables);
console.log('\nErrors:', result.errors);
