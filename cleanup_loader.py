# -*- coding: utf-8 -*-
"""Utility to clean up stray 'Loading??' tokens in the renderer bundle."""

from __future__ import annotations

from pathlib import Path


RENDERER_PATH = Path("renderer/renderer_umd.js")


def main() -> None:
  if not RENDERER_PATH.exists():
    raise SystemExit(f"Renderer bundle missing: {RENDERER_PATH}")

  original = RENDERER_PATH.read_text(encoding="utf-8", errors="replace")
  replacements = {
      "Loading??true": "loading:true",
      "Loading??false": "loading:false",
      "Loading??": "loading:",
      "Loading?": "Loading...",
  }
  fixed = original
  for needle, replacement in replacements.items():
    fixed = fixed.replace(needle, replacement)

  if fixed != original:
    RENDERER_PATH.write_text(fixed, encoding="utf-8")


if __name__ == "__main__":
  main()
