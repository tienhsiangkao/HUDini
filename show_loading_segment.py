# -*- coding: utf-8 -*-
from pathlib import Path
text = Path('renderer/renderer_umd.js').read_text(encoding='utf-8', errors='replace')
segment = text[text.index("panel('Player Stats')"):text.index("panel('Player Stats')")+80]
print(segment)
print(segment.encode('unicode_escape'))
