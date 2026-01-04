# Spec Alignment Pass

## Goal/Problem

grammar.md is v0.2, language-spec.md is v0.3. They need alignment. Additionally:
- Macro vs control flow distinction needs clarification
- Deterministic compilation constraints need documentation

## Scope

- `spec/grammar.md`
- `spec/language-spec.md`

## Approach

1. Audit differences between the two spec files
2. Update grammar.md to v0.3
3. Add section clarifying macro (`{{IF}}`) vs runtime control flow (`IF THEN`)
4. Document what's deterministic vs semantic

## Hypothesis

Aligned specs reduce confusion for contributors and users trying to understand the language.

## Results

### Differences Found

1. **Version mismatch**: grammar.md v0.2, language-spec.md v0.3
2. **Grammar claimed alignment with v0.2** but language-spec was v0.3
3. **"Source = Output" principle** documented in language-spec but missing from grammar
4. **Macro system** mentioned in VISION.md but not clear in grammar
5. **Validation focus** not reflected in grammar.md

### Changes Made to grammar.md

1. **Updated version** to v0.3, aligned with language-spec.md v0.3
2. **Added core principle statement** at top: "The source document is the execution format"
3. **Added "Control Flow vs Macros" section** with table:
   - Runtime IF (`IF $x THEN:`) - resolved by LLM at runtime
   - Build-time IF (`{{IF (x)}}`) - resolved by tooling at build time
   - Note that macros are specified but not yet implemented
4. **Added "What Tooling Validates" section** with error codes table
5. **Added "What Tooling Does NOT Do" section** explicitly stating:
   - No type expansion
   - No reference inlining
   - No semantic transformation
   - Source IS the output
6. **Updated version history** to show v0.3 changes

### No Changes to language-spec.md

The language-spec.md v0.3 was already comprehensive. Grammar.md was brought into alignment with it.

## Evaluation

The specs are now aligned. Key clarifications:
- Macros (`{{IF}}`) are conceptually specified but not implemented
- Runtime control flow (`IF THEN`) is implemented and LLM-executed
- Grammar now explicitly documents the validation-only philosophy
- Both files now at v0.3 with consistent messaging

The aligned specs should reduce confusion for anyone reading the grammar after the language spec.
