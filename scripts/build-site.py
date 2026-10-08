"""Build only public ClassSnag site files; never expose the repository root."""
import re
import json
from html import escape
from xml.etree import ElementTree as ET
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
# Keep canonical URLs, social previews and the sitemap driven by one page catalog.
base = 'https://apps.cleartextlabs.com/classsnag/'
pages = json.loads((root / 'site/seo.json').read_text())
share_image = base + 'assets/social-preview.png'
shutil.copy2(root / 'store/assets/screenshot-1280x800.png', output / 'assets/social-preview.png')
manifest = json.loads((root / 'manifest.json').read_text())
for filename, page in pages.items():
    target = output / filename
    html = target.read_text()
    html = re.sub(r'<title>.*?</title>', '', html, flags=re.S)
    html = re.sub(r'<meta name="description"[^>]*>', '', html)
    html = re.sub(r'<link rel="icon"[^>]*>', '', html)
    url = base + page['path']
    metadata = [
        '<title>' + escape(page['title']) + '</title>',
        '<link rel="icon" type="image/png" sizes="48x48" href="' + base + 'assets/icon-48.png">',
        '<link rel="canonical" href="' + url + '">',
        '<link rel="sitemap" type="application/xml" href="' + base + 'sitemap.xml">',
        '<meta name="robots" content="index, follow, max-image-preview:large">',
    ]
    tags = {
        'description': page['description'],
        'og:type': 'website', 'og:site_name': 'ClassSnag', 'og:locale': 'en_US',
        'og:title': page['title'], 'og:description': page['description'],
        'og:url': url, 'og:image': share_image, 'og:image:type': 'image/png',
        'og:image:width': '1280', 'og:image:height': '800',
        'og:image:alt': 'ClassSnag Chrome extension with Auto Refresh and Auto Book controls',
        'twitter:card': 'summary_large_image', 'twitter:title': page['title'],
        'twitter:description': page['description'], 'twitter:image': share_image,
        'twitter:image:alt': 'ClassSnag Chrome extension settings',
    }
    for key, value in tags.items():
        attribute = 'property' if key.startswith('og:') else 'name'
        metadata.append(f'<meta {attribute}="{key}" content="{escape(value, quote=True)}">')
    graph = [{
        '@type': 'WebPage', '@id': url + '#webpage', 'url': url,
        'name': page['title'], 'description': page['description'], 'inLanguage': 'en',
        'about': {'@id': base + '#software'},
    }]
    if filename == 'index.html':
        graph.append({
            '@type': 'SoftwareApplication', '@id': base + '#software',
            'name': 'ClassSnag', 'url': base, 'description': page['description'],
            'applicationCategory': 'BrowserApplication',
            'operatingSystem': 'Windows, macOS, Linux',
            'softwareRequirements': 'Google Chrome 116 or newer; an existing VirtuaGym gym account',
            'softwareVersion': manifest['version'],
            'downloadUrl': base + 'downloads/classsnag-' + manifest['version'] + '.zip',
            'installUrl': 'https://chromewebstore.google.com/detail/classsnag/mimfkfiafbomfpkookjnfokpdkakclnm',
            'image': share_image, 'screenshot': base + 'assets/monitor.png',
            'publisher': {'@type': 'Organization', 'name': 'Cleartext Labs', 'url': 'https://cleartextlabs.com'},
            'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD', 'url': 'https://chromewebstore.google.com/detail/classsnag/mimfkfiafbomfpkookjnfokpdkakclnm'},
            'featureList': ['VirtuaGym class availability monitoring', 'Configurable automatic refresh', 'Optional automatic booking requests', 'Confirmed reservation notifications'],
        })
    else:
        graph.append({'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'ClassSnag', 'item': base},
            {'@type': 'ListItem', 'position': 2, 'name': 'Setup guide' if filename == 'guide.html' else 'Privacy policy', 'item': url},
        ]})
    metadata.append('<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False).replace('<', r'<') + '</script>')
    target.write_text(html.replace('</head>', '\n'.join(metadata) + '\n</head>'))
ET.register_namespace('', 'http://www.sitemaps.org/schemas/sitemap/0.9')
sitemap = ET.Element('{http://www.sitemaps.org/schemas/sitemap/0.9}urlset')
for page in pages.values():
    entry = ET.SubElement(sitemap, 'url')
    ET.SubElement(entry, 'loc').text = base + page['path']
ET.ElementTree(sitemap).write(output / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
print(output)
