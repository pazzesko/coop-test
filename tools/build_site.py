"""Stage public files in a content-versioned directory to avoid mixed caches."""

import argparse
import hashlib
from pathlib import Path
import shutil


def build(output):
    root = Path(__file__).resolve().parent.parent
    sources = [root / 'style.css', *sorted((root / 'src').glob('*.js'))]
    digest = hashlib.sha256()
    for source in sources:
        digest.update(source.relative_to(root).as_posix().encode())
        digest.update(b'\0')
        digest.update(source.read_bytes())
    version = digest.hexdigest()[:12]
    assets = output / 'assets' / version
    (assets / 'src').mkdir(parents=True, exist_ok=True)
    shutil.copy2(root / 'style.css', assets / 'style.css')
    for source in sources[1:]:
        shutil.copy2(source, assets / 'src' / source.name)
    html = (root / 'index.html').read_text()
    html = html.replace('./style.css', f'./assets/{version}/style.css')
    html = html.replace('./src/main.js', f'./assets/{version}/src/main.js')
    (output / 'index.html').write_text(html)
    print(f'Staged {output} with asset version {version}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('_site'))
    build(parser.parse_args().output)
