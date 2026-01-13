# Update MDZ Specification for DELEGATE Keyword

## Goal/Problem

Update the formal grammar (grammar.md) and language specification (language-spec.md) to include:
1. DELEGATE keyword syntax
2. `agents:` frontmatter field for declaring available subagents
3. Migration from `uses:` to `skills:` (fix existing inconsistency)

## Scope

- `spec/grammar.md`
- `spec/language-spec.md`

## Approach

### grammar.md Changes

1. Add DELEGATE to keywords section:
```ebnf
DELEGATE        = "DELEGATE" ;
TO              = "TO" ;
```

2. Update frontmatter schema:
```ebnf
frontmatter_fields = name_field description_field [ skills_field ] [ agents_field ] [ tools_field ] ;
```

3. Add delegate_stmt production:
```ebnf
delegate_stmt     = DELEGATE TO agent_ref colon newline with_params
                  | DELEGATE expression TO agent_ref ;

agent_ref         = dollar_ident | string_literal ;
```

### language-spec.md Changes

1. Add new section "## Agents" explaining subagent declarations
2. Add new section "## Delegation" explaining DELEGATE syntax
3. Update frontmatter examples
4. Add examples showing DELEGATE usage
5. Update terminology section with new terms

## Hypothesis

Clear specification enables consistent implementation across parser, compiler, and tooling.

## Results

### grammar.md (v0.5 -> v0.6)

1. **Keywords**: Added `DELEGATE` and `TO` keywords
2. **Frontmatter Schema**: 
   - Added `skills_field`, `agents_field`, `tools_field` productions
   - Added `uses_field` as deprecated alias for backward compatibility
3. **Control Flow**: Added `delegate_stmt` to `control_flow` alternatives
4. **New Productions**:
   - `delegate_stmt` with full form (WITH params) and inline form
   - `agent_ref` for agent references (`$ident` or string literal)
   - `dollar_ident` helper production
5. **New Section**: "Agent Delegation (v0.6)" explaining the distinction from skill composition
6. **Disambiguation Rule 8**: DELEGATE vs Execute clarification
7. **Error Productions**: Added `error_delegate_unknown_agent`
8. **Validation Table**: Added E013 for undeclared agent references
9. **Example**: Updated complete skill example with `skills:`, `agents:`, `tools:` and DELEGATE usage

### language-spec.md (v0.3 -> v0.6)

1. **Frontmatter Schema**: Updated to show `skills:`, `agents:`, `tools:` fields with deprecation note for `uses:`
2. **New Section "## Agents (v0.6)"**: 
   - Declaring agents in frontmatter
   - Agent vs Skill comparison table
   - Agent capabilities discussion
3. **New Section "## Delegation with DELEGATE (v0.6)"**:
   - Full form with parameters syntax
   - Inline form syntax
   - DELEGATE vs Execute comparison table
   - Complete workflow example
   - Agent reference requirements
4. **Composition Section**: Renamed "Skill Delegation" to "Skill Composition", added cross-reference
5. **Validation Section**: 
   - Updated "What Tooling Checks" with agent reference validation
   - Added E013 error code
6. **Tooling Requirements**: 
   - Parser: Added agents, DELEGATE to extraction list
   - Validator: Added agent reference checking
   - LSP: Added agent-related features
   - Highlighting: Added DELEGATE and TO keywords
7. **Grammar Summary**: Added DELEGATE and AGENT_REF tokens
8. **Terminology**: 
   - Keywords: Added "Agent delegation" and "Delegation target"
   - Document Structure: Updated frontmatter fields
   - Composition: Added agent-related terms
9. **Design Decisions**: Added "Why DELEGATE?" and "Why skills/agents/tools?" sections
10. **Version History**: Added v0.6 entry

## Evaluation

Specification changes are complete and internally consistent. Both documents are now at v0.6 with aligned content. Key design decisions:

- **Backward compatibility**: `uses:` still works as alias for `skills:`
- **Clear distinction**: Skill composition (`Execute [[skill]]`) vs agent delegation (`DELEGATE TO $agent`)
- **Source = Output**: DELEGATE syntax is what the LLM sees, no transformation
- **Validation**: E013 error for undeclared agents maintains validation-first approach
