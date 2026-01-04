# Dependency Graph Extraction - COMPLETED

## Goal/Problem

The vision calls for:
- Dependency graph construction from `uses:` declarations and `[[references]]`
- Cycle detection
- Missing dependency flagging
- Visualization (for playground later)

This enables understanding complex agent systems as a graph.

## Scope

- `src/compiler/compiler.ts` - integrated into compiler
- `tests/compiler.test.ts` - graph tests

## Results

**COMPLETED** - Dependency graph extraction is fully implemented in the v0.3 compiler.

### Features implemented:

1. **Dependency extraction from frontmatter:**
   - `uses:` array → nodes + "uses" edges
   - `imports:` array → nodes + "imports" edges

2. **Dependency extraction from content:**
   - `[[skill]]` references → nodes + "reference" edges with span
   - `[[skill#section]]` references → nodes + "reference" edges with span
   - Deduplication of nodes

3. **Graph structure:**
   ```typescript
   interface DependencyGraph {
     nodes: string[];           // All dependency skill names
     edges: DependencyEdge[];   // Typed edges with source location
     cycles: string[][];        // Detected cycles
   }
   
   interface DependencyEdge {
     target: string;
     type: 'uses' | 'imports' | 'reference';
     span?: AST.Span;
   }
   ```

4. **Cycle detection:**
   - `buildFullDependencyGraph(registry)` function
   - DFS-based cycle detection across entire skill graph
   - Returns `{ graph: Map<string, string[]>, cycles: string[][] }`

5. **Missing dependency flagging:**
   - W001 warning: skill referenced but not in uses:/imports:
   - E009 error: skill not found in registry

### Tests:
- "builds graph from uses:" ✓
- "builds graph from inline references" ✓
- "deduplicates dependencies" ✓
- "detects cycles in multi-skill graph" ✓
- "no cycles in acyclic graph" ✓

## Evaluation

Hypothesis confirmed:
1. ✅ Cycle detection catches issues before runtime
2. ✅ Graph data ready for playground visualization
3. ✅ Supports future features (impact analysis)
4. ✅ Straightforward implementation using existing AST

Ready for playground integration to visualize as Mermaid/DOT.
