from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[2]

@pytest.mark.parametrize('name', ['app.mjs', 'catalog.mjs', 'notebook.mjs', 'batch.mjs', 'batch-meta.mjs', 'workbook.mjs', 'visualization.mjs', 'research.css'])
def test_vercel_cdn_assets_match_flask_assets(name):
    """Local Flask and Vercel CDN must serve the same client application."""
    assert (ROOT / 'src/static/research' / name).read_bytes() == (ROOT / 'public/static/research' / name).read_bytes()
