#!/usr/bin/env python3
"""Builds dist/index.html: one self-contained file (no build tools, no dependencies)."""
import pathlib
root = pathlib.Path(__file__).parent
src = root / "src"
tpl = (src / "app.template.html").read_text(encoding="utf-8")
html = tpl.replace("/*@@SCORING@@*/", (src / "scoring.js").read_text(encoding="utf-8")) \
          .replace("/*@@CRITERIA@@*/", (src / "criteria.js").read_text(encoding="utf-8"))
head, body = html.split('<div id="app"', 1)
page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="robots" content="noindex">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<style>:root{color-scheme:light}body{margin:0}[hidden]{display:none!important}</style>\n'
        + head + '</head>\n<body>\n<div id="app"' + body.replace('</script>\n', '</script>\n', 1))
page = page.rstrip() + '\n</body>\n</html>\n'
out = root / "dist" / "index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(page, encoding="utf-8")
print("wrote", out, len(page), "bytes")
