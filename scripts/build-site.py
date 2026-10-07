"""Build only public ClassSnag site files; never expose the repository root."""
import re
import shutil
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
subprocess.run([sys.executable, str(root / 'scripts/package.py')], check=True)
output = root / 'dist/site/classsnag'
output.mkdir(parents=True, exist_ok=True)
for name in ('index.html', 'guide.html', 'site.css'):
    shutil.copy2(root / 'site' / name, output / name)
(output / 'assets').mkdir(exist_ok=True)
for size in (16, 32, 48, 128):
    shutil.copy2(root / f'assets/icon-{size}.png', output / f'assets/icon-{size}.png')
for name in ('popup.png', 'monitor.png'):
    shutil.copy2(root / 'store/assets' / name, output / 'assets' / name)
privacy = (root / 'store/privacy.html').read_text()
privacy = re.sub(r'<style>.*?</style>', '<link rel="stylesheet" href="./site.css">', privacy, flags=re.S)
privacy = privacy.replace('<body>', '<body><header><a class="brand" href="./"><img src="./assets/icon-48.png" width="36" height="36" alt="">classsnag</a><nav aria-label="Main navigation"><a href="./guide.html">Get started ↗</a><a href="https://github.com/digitalhen/ClassSnag/issues">Support ↗</a></nav></header><main class="prose">')
privacy = privacy.replace('</body>', '</main><footer><a href="./">CLASSSNAG</a><span>Independent of VirtuaGym, YMCA, and your gym.</span></footer></body>')
(output / 'privacy.html').write_text(privacy)
(output / 'downloads').mkdir(exist_ok=True)
shutil.copy2(root / 'dist/classsnag-1.1.0.zip', output / 'downloads/classsnag-1.1.0.zip')
print(output)
