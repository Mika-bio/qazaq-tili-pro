#!/usr/bin/env python3
"""Build single-file qazaq-tili-pro-chrome.html for Chrome file:// (no ES modules)."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qazaq-tili-pro-chrome.html'

ORDER = [
    ROOT / 'js' / 'data' / 'topics.js',
    ROOT / 'js' / 'data' / 'questions.js',
    ROOT / 'js' / 'auth.js',
    ROOT / 'js' / 'progress.js',
    ROOT / 'js' / 'teacher.js',
    ROOT / 'js' / 'app.js',
]

def strip_module(src: str) -> str:
    text = re.sub(
        r"^\s*import\s+[\s\S]*?from\s+['\"][^'\"]+['\"]\s*;?\s*$",
        '',
        src,
        flags=re.M,
    )
    text = re.sub(r"^\s*import\s+['\"][^'\"]+['\"]\s*;?\s*$", '', text, flags=re.M)
    text = re.sub(r'^export\s+async\s+function\s+', 'async function ', text, flags=re.M)
    text = re.sub(r'^export\s+function\s+', 'function ', text, flags=re.M)
    text = re.sub(r'^export\s+const\s+', 'const ', text, flags=re.M)
    text = re.sub(r'^export\s+\{[^}]+\}\s*;?\s*$', '', text, flags=re.M)
    return text

def main():
    css = (ROOT / 'css' / 'styles.css').read_text(encoding='utf-8')
    parts = []
    for p in ORDER:
        parts.append(f'\n/* ==== {p.name} ==== */\n' + strip_module(p.read_text(encoding='utf-8')))
    js = '\n'.join(parts)
    if re.search(r'^\s*import\s+', js, re.M) or re.search(r'^\s*export\s+', js, re.M):
        raise SystemExit('Module keywords remain — fix strip_module')
    html = f'''<!DOCTYPE html>
<html lang="kk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="description" content="ҚАЗАҚ ТІЛІ PRO — Абылай хан атындағы №140 қазақ орта мектебі" />
  <meta name="theme-color" content="#0d9488" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="ҚТ PRO" />
  <title>ҚАЗАҚ ТІЛІ PRO</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='30' fill='%230d9488'/%3E%3Ctext x='32' y='42' text-anchor='middle' font-size='32' fill='%23c9a227' font-family='sans-serif' font-weight='bold'%3EҚ%3C/text%3E%3C/svg%3E" />
  <style>
{css}
  </style>
</head>
<body>
  <div id="app">
    <p style="padding:2rem;text-align:center;font-family:sans-serif;color:#0f766e">ҚАЗАҚ ТІЛІ PRO жүктелуде…</p>
  </div>
  <script>
/* ҚАЗАҚ ТІЛІ PRO — single-file build for Chrome file:// */
{js}
  </script>
</body>
</html>
'''
    OUT.write_text(html, encoding='utf-8')
    print(f'Wrote {OUT} ({OUT.stat().st_size} bytes)')

if __name__ == '__main__':
    main()
