# -*- coding: utf-8 -*-
from pathlib import Path
text = Path('renderer/renderer_umd.js').read_text(encoding='utf-8', errors='replace')
start = text.index('Hand #')
print(text[start:start+30].encode('unicode_escape'))
