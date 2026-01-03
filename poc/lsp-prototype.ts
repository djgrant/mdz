/**
 * LSP Prototype for Zen
 * 
 * Demonstrates tooling viability:
 * - Reference extraction
 * - Go-to-definition
 * - Autocomplete candidates
 */

interface Position {
  line: number;
  character: number;
}

interface Location {
  file: string;
  position: Position;
}

interface Reference {
  type: 'skill' | 'section' | 'variable' | 'type';
  name: string;
  location: Location;
}

interface Definition {
  type: 'skill' | 'section' | 'variable' | 'type';
  name: string;
  location: Location;
  content?: string;
}

interface ZenDocument {
  uri: string;
  content: string;
  references: Reference[];
  definitions: Definition[];
}

export function parseDocument(uri: string, content: string): ZenDocument {
  const doc: ZenDocument = {
    uri,
    content,
    references: [],
    definitions: []
  };

  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Find [[skill]] or [[skill#section]] references
    const skillRefs = line.matchAll(/\[\[([^\]#]+)(?:#([^\]]+))?\]\]/g);
    for (const match of skillRefs) {
      doc.references.push({
        type: match[2] ? 'section' : 'skill',
        name: match[2] || match[1],
        location: { file: uri, position: { line: i, character: match.index! } }
      });
    }

    // Find $variable references
    const varRefs = line.matchAll(/\$(\w+)/g);
    for (const match of varRefs) {
      // Check if it's a definition (has = after) or reference
      const isDefinition = line.match(new RegExp(`\\$${match[1]}\\s*(:|=)`));
      if (isDefinition) {
        doc.definitions.push({
          type: 'variable',
          name: match[1],
          location: { file: uri, position: { line: i, character: match.index! } }
        });
      } else {
        doc.references.push({
          type: 'variable',
          name: match[1],
          location: { file: uri, position: { line: i, character: match.index! } }
        });
      }
    }

    // Find type definitions: $TypeName = ...
    const typeDef = line.match(/^\$([A-Z]\w*)\s*=/);
    if (typeDef) {
      doc.definitions.push({
        type: 'type',
        name: typeDef[1],
        location: { file: uri, position: { line: i, character: 0 } },
        content: line.split('=')[1]?.trim()
      });
    }

    // Find section definitions: ## Section Name or ### Section Name
    const sectionDef = line.match(/^(#{1,6})\s+(.+)/);
    if (sectionDef) {
      doc.definitions.push({
        type: 'section',
        name: sectionDef[2].toLowerCase().replace(/\s+/g, '-'),
        location: { file: uri, position: { line: i, character: 0 } },
        content: sectionDef[2]
      });
    }
  }

  return doc;
}

export function goToDefinition(
  doc: ZenDocument, 
  position: Position,
  allDocs: ZenDocument[] = []
): Definition | null {
  // Find what's at the position
  const line = doc.content.split('\n')[position.line];
  
  // Check for [[reference]] at position
  const refMatch = line.match(/\[\[([^\]]+)\]\]/);
  if (refMatch && position.character >= refMatch.index! && 
      position.character <= refMatch.index! + refMatch[0].length) {
    const [skill, section] = refMatch[1].split('#');
    
    // If section reference within same doc
    if (section || skill.startsWith('#')) {
      const sectionName = section || skill.slice(1);
      return doc.definitions.find(d => 
        d.type === 'section' && 
        d.name === sectionName.toLowerCase().replace(/\s+/g, '-')
      ) || null;
    }
    
    // External skill reference
    const targetDoc = allDocs.find(d => d.uri.includes(skill));
    if (targetDoc) {
      return {
        type: 'skill',
        name: skill,
        location: { file: targetDoc.uri, position: { line: 0, character: 0 } }
      };
    }
  }

  // Check for $variable at position
  const varMatch = line.match(/\$(\w+)/);
  if (varMatch && position.character >= varMatch.index! && 
      position.character <= varMatch.index! + varMatch[0].length) {
    return doc.definitions.find(d => 
      d.type === 'variable' && d.name === varMatch[1]
    ) || null;
  }

  return null;
}

export function getCompletions(
  doc: ZenDocument,
  position: Position,
  allDocs: ZenDocument[] = []
): string[] {
  const line = doc.content.split('\n')[position.line];
  const beforeCursor = line.slice(0, position.character);
  
  // After [[ - suggest skills and sections
  if (beforeCursor.endsWith('[[')) {
    const skills = allDocs.map(d => {
      const match = d.uri.match(/([^/]+)\.md$/);
      return match ? match[1] : null;
    }).filter(Boolean) as string[];
    
    const sections = doc.definitions
      .filter(d => d.type === 'section')
      .map(d => '#' + d.name);
    
    return [...skills, ...sections];
  }
  
  // After $ - suggest variables and types
  if (beforeCursor.endsWith('$')) {
    const vars = doc.definitions
      .filter(d => d.type === 'variable' || d.type === 'type')
      .map(d => d.name);
    return vars;
  }
  
  return [];
}

// Test the LSP prototype
const testDoc = `---
name: simplify
uses:
  - orchestrate-map-reduce
---

## Types

$EssenceCriteria = what must be preserved
$ValidationResult = progress | regression | plateau

## Input

- $target: what to simplify
- $essence: $EssenceCriteria

## Workflow

1. Analyze $target
2. Execute [[orchestrate-map-reduce]] with validator: [[#validate-essence]]
3. Return $result

## Validate Essence

Check if $result satisfies $essence.
`;

const doc = parseDocument('simplify.md', testDoc);

console.log('=== LSP Prototype Test ===\n');

console.log('Definitions found:');
doc.definitions.forEach(d => 
  console.log(`  ${d.type}: ${d.name} (line ${d.location.position.line})`)
);

console.log('\nReferences found:');
doc.references.forEach(r => 
  console.log(`  ${r.type}: ${r.name} (line ${r.location.position.line})`)
);

// Test go-to-definition
console.log('\nGo-to-definition tests:');
const gotoResult = goToDefinition(doc, { line: 18, character: 12 }); // [[#validate-essence]]
console.log('  [[#validate-essence]] ->', gotoResult?.name, `(line ${gotoResult?.location.position.line})`);

// Test completions
console.log('\nCompletion tests:');
console.log('  After [[ :', getCompletions(doc, { line: 0, character: 2 }));
console.log('  After $ :', getCompletions(doc, { line: 0, character: 1 }));
