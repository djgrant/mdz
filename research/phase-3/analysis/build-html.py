#!/usr/bin/env python3
"""Assemble report.html from template.html + sections/*.html.

Prose lives in sections/ as one fragment per section, ordered by filename prefix.
Figures reference charts/*.png and are inlined as base64, and the runs explorer's
data is injected from the e*-scored.json files, so the report is a single
self-contained file. Edit a fragment, re-run this script.
"""
import base64
import json
import pathlib
import re

HERE = pathlib.Path(__file__).parent

body = "\n\n".join(
    f.read_text().strip() for f in sorted((HERE / "sections").glob("*.html"))
)


def inline_asset(m: re.Match) -> str:
    data = base64.b64encode((HERE / m.group(1)).read_bytes()).decode()
    return f'src="data:image/png;base64,{data}"'


body = re.sub(r'src="(charts/[^"]+\.png)"', inline_asset, body)

runs = {
    exp: json.loads((HERE / f"{exp}-scored.json").read_text())
    for exp in ("e1", "e2a", "e2b", "e3")
    if (HERE / f"{exp}-scored.json").exists()
}
body = body.replace("{{RUNS_JSON}}", json.dumps(runs))

html = (HERE / "template.html").read_text().replace("{{BODY}}", body)

out = HERE / "report.html"
out.write_text(html)
print(f"wrote {out} {len(html)} bytes")
