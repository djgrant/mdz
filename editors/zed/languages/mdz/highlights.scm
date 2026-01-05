; Inherit markdown highlighting
(atx_heading) @markup.heading
(setext_heading) @markup.heading

(fenced_code_block) @markup.raw.block
(code_span) @markup.raw.inline

(emphasis) @markup.italic
(strong_emphasis) @markup.bold

(link) @markup.link
(image) @markup.link

(block_quote) @comment

; MDZ-specific patterns would require custom grammar
; For now, we inherit standard markdown patterns
; Future: create tree-sitter-mdz grammar for full support
;
; Semantic marker syntax (v0.4):
;   /content/     - inline semantic marker
;   $/name/       - inferred variable
;   $var: /desc/  - semantic type annotation
