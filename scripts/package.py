"""Build an allowlisted Chrome Web Store ZIP, excluding development/user files."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'manifest.json').read_text())
files = [
    'manifest.json', 'background.js', 'content.js', 'jquery.min.js',
    'popup.html', 'popup.js', 'styles.css', 'monitor.html', 'monitor.js',
    'assets/icon-16.png', 'assets/icon-32.png', 'assets/icon-48.png',
    'assets/icon-128.png', 'assets/bell.wav', 'THIRD_PARTY_NOTICES.txt',
]
output = root / 'dist' / f"classsnag-{manifest['version']}.zip"
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in sorted(files):
        archive.write(root / name, name)
print(output)
