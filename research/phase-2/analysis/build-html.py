#!/usr/bin/env python3
"""Assemble mdz-analysis-phase-2.html from template.html + sections/*.html.

Prose lives in sections/ as one fragment per h2 section, ordered by filename
prefix. Figures reference assets/*.png. Edit a fragment, re-run this script.
"""
import pathlib

HERE = pathlib.Path(__file__).parent

body = "\n\n".join(
    f.read_text().strip() for f in sorted((HERE / "sections").glob("*.html"))
)
html = (HERE / "template.html").read_text().replace("{{BODY}}", body)

out = HERE / "mdz-analysis-phase-2.html"
out.write_text(html)
print(f"wrote {out} {len(html)} bytes")
