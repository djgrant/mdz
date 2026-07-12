#!/usr/bin/env python3
"""Assemble mdz-analysis-phase-2.html from template.html + sections/*.html.

Prose lives in sections/ as one fragment per h2 section, ordered by filename
prefix. Figures reference assets/*.png and are inlined as base64 so the
report is a single self-contained file. Edit a fragment, re-run this script.
"""
import base64
import pathlib
import re

HERE = pathlib.Path(__file__).parent

body = "\n\n".join(
    f.read_text().strip() for f in sorted((HERE / "sections").glob("*.html"))
)


def inline_asset(m: re.Match) -> str:
    data = base64.b64encode((HERE / m.group(1)).read_bytes()).decode()
    return f'src="data:image/png;base64,{data}"'


body = re.sub(r'src="(assets/[^"]+\.png)"', inline_asset, body)
html = (HERE / "template.html").read_text().replace("{{BODY}}", body)

out = HERE / "mdz-analysis-phase-2.html"
out.write_text(html)
print(f"wrote {out} {len(html)} bytes")
