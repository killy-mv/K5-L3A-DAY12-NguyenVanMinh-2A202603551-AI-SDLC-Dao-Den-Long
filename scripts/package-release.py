#!/usr/bin/env python3
"""Zip exact playable static build + portable Node.js leaderboard server."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parents[1]
out=root/'release'/'dao-den-long-v1.0.0-web.zip'
paths=[root/'release'/'README-START.txt',root/'LICENSE',
       root/'scripts'/'run.mjs',root/'scripts'/'web-server.mjs',
       root/'scripts'/'leaderboard.mjs']
paths.extend(sorted((root/'web'/'dist').rglob('*')))
with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=9) as z:
    for p in paths:
        if p.is_file():
            relative=p.relative_to(root)
            if relative.parts[:2]==('release','README-START.txt'):
                relative=Path('README-START.txt')
            z.write(p,relative.as_posix())
print(out, out.stat().st_size, 'bytes')
