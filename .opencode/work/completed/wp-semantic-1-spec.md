---
size: sm
category: language
parent: wp-p1-semantic-marker-syntax
---

# Update Spec for Semantic Marker Syntax

## Goal/Problem

Update the formal grammar and language specification for the new semantic marker syntax.

## Scope

- `spec/grammar.md`
- `spec/language-spec.md`

## Approach

### grammar.md changes

1. Update Operators section:
   - Remove `semantic_open = "{~~"` and `semantic_close = '}'`
   - Add `semantic_delim = '/'`

2. Update Semantic Markers section:
   ```ebnf
   semantic_marker   = '/' semantic_content '/' ;
   semantic_content  = { semantic_char | var_reference } ;
   semantic_char     = ? any char except '/' and '$' and newline ? ;
   
   inferred_var      = '$' '/' inferred_name '/' ;
   inferred_name     = { letter | digit | whitespace } ;
   ```

3. Update Variable Declarations for semantic types:
   ```ebnf
   semantic_type_annotation = colon '/' description '/' ;
   ```

4. Update examples throughout

### language-spec.md changes

1. Add/update Semantic Markers section explaining:
   - `/thing/` for inline semantic content
   - `$/name/` for inferred variables
   - `$var: /description/` for declared semantic types

2. Update all examples using old `{~~}` syntax

## Hypothesis

The grammar changes are straightforward substitutions. Main risk is ensuring all examples and references are updated consistently.

## Results

### grammar.md changes (v0.4 → v0.5)

1. **Operators section**: Replaced `semantic_open = "{~~"` and `semantic_close = '}'` with `semantic_delim = '/'`

2. **Template literals**: Updated to reference semantic_marker instead of `{~~` syntax

3. **Semantic Markers section**: Added complete grammar for:
   - `semantic_marker = semantic_delim semantic_content semantic_delim`
   - `inferred_var = dollar semantic_marker`
   - `semantic_type_annotation = colon semantic_marker`

4. **Variable declarations**: Extended `type_annotation` to include `semantic_type_annotation`

5. **Disambiguation rules**: Updated Rule 3 for `/` delimiter with examples

6. **Error productions**: Updated `error_unclosed_semantic` for new syntax

7. **Examples**: Updated workflow example from `{~~appropriate location}` to `/appropriate location/`

### language-spec.md changes (v0.4 → v0.5)

1. **Semantic Markers section**: Complete rewrite with:
   - Basic `/content/` syntax
   - Variable interpolation examples
   - New "Inferred Variables" subsection for `$/name/`
   - New "Semantic Type Annotations" subsection for `: /description/`

2. **Updated examples throughout**:
   - Semantic Variable Transformation example
   - Lambda expressions example
   - IF with semantic conditions
   - Input section invalid defaults
   - Runtime semantics

3. **LSP Features**: Updated autocomplete trigger from `{~~` to `/`

4. **Highlighting**: Added inferred variables (`$/name/`)

5. **Grouping and Braces**: Reorganized - curly braces now only for template interpolation, added new "Forward Slashes" section

6. **Grammar Summary tokens**: Added `SEMANTIC`, `INFERRED_VAR`, `SEMANTIC_TYPE`

7. **Design Decisions**: Updated "Why /.../ for Semantics?" rationale

8. **Terminology**: Added inferred variable and semantic type annotation terms

## Evaluation

All grammar changes are consistent:
- Old `{~~content}` → New `/content/`
- New inferred variables `$/name/` documented
- New semantic type annotations `: /description/` documented
- Version bumped to 0.5 in both files
- All examples updated to use new syntax
