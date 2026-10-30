"""A release URL must bind the page, modules, and worker to identical bytes."""

from pathlib import Path
from urllib.parse import urljoin
from unittest.mock import patch

import pytest

from src.app import app
from src.routes import research_routes


@pytest.fixture
def client():
    app.config.update(TESTING=True)
    with app.test_client() as client:
        yield client


@pytest.fixture
def release_files(tmp_path, monkeypatch):
    directory = tmp_path / 'research'
    directory.mkdir()
    files = {
        'app.mjs': b"import './catalog.mjs'; new Worker(new URL('./csv-worker.mjs', import.meta.url), {type:'module'});",
        'catalog.mjs': b'export const release = 1;',
        'csv-worker.mjs': b"import './csv-stream.mjs';",
        'csv-stream.mjs': b"import './catalog.mjs';",
        'research.css': b'body { color: black; }',
    }
    for name, data in files.items():
        (directory / name).write_bytes(data)
    template = tmp_path / 'research.html'
    template.write_text('research template revision one', encoding='utf-8')
    monkeypatch.setattr(research_routes, '_RESEARCH_ASSETS', directory)
    monkeypatch.setattr(research_routes, '_RESEARCH_TEMPLATE', template)
    return directory, template, files


def test_page_and_discovery_expose_the_same_uncached_release(client, release_files):
    response = client.get('/api/research/version')
    version = response.get_json()['version']
    assert len(version) == 64 and all(c in '0123456789abcdef' for c in version)
    assert response.headers['Cache-Control'] == 'no-store'
    assert client.get('/api/research/version').get_json()['version'] == version
    with patch.object(research_routes, 'render_template', return_value='<p>research</p>') as render:
        for url in ('/research', '/research/'):
            page = client.get(url)
            assert page.status_code == 200
            assert page.headers['Cache-Control'] == 'no-store'
            assert page.headers['X-Research-Version'] == version
            assert page.mimetype == 'text/html'
            render.assert_called_with('research.html', research_version=version)


def test_actual_workspace_loads_its_release_css_and_entry_module(client):
    response = client.get('/research')
    version = response.headers['X-Research-Version']
    markup = response.get_data(as_text=True)
    assert f'data-research-version="{version}"' in markup
    assert f'/research-assets/{version}/app.mjs' in markup
    assert f'/research-assets/{version}/research.css' in markup
    assert 'src="/static/research/app.mjs"' not in markup
    assert 'href="/static/research/research.css"' not in markup


def test_relative_entry_worker_and_leaf_imports_share_one_release(client, release_files):
    _, _, files = release_files
    version = client.get('/api/research/version').get_json()['version']
    entry = f'/research-assets/{version}/app.mjs'
    worker = urljoin(entry, './csv-worker.mjs')
    stream = urljoin(worker, './csv-stream.mjs')
    leaf = urljoin(stream, './catalog.mjs')
    for url in (entry, worker, stream, leaf, urljoin(entry, './research.css')):
        response = client.get(url)
        assert response.status_code == 200
        assert response.data == files[Path(url).name]
        assert response.headers['X-Research-Version'] == version
        assert response.headers['Cache-Control'] == 'public, max-age=31536000, immutable'
        assert response.headers['X-Content-Type-Options'] == 'nosniff'
        assert response.mimetype == ('text/css' if url.endswith('.css') else 'text/javascript')
        conditional = client.get(url, headers={'If-None-Match': response.headers['ETag']})
        assert conditional.status_code == 304 and conditional.data == b''
        assert conditional.headers['Cache-Control'] == 'public, max-age=31536000, immutable'


@pytest.mark.parametrize('changed', ['catalog.mjs', 'csv-worker.mjs', 'csv-stream.mjs', 'research.css', 'research.html'])
def test_any_leaf_or_template_change_invalidates_the_entire_graph(client, release_files, changed):
    directory, template, _ = release_files
    old = client.get('/api/research/version').get_json()['version']
    path = template if changed == 'research.html' else directory / changed
    path.write_bytes(path.read_bytes() + b'\nchanged')
    new = client.get('/api/research/version').get_json()['version']
    assert new != old
    old_asset = client.get(f'/research-assets/{old}/app.mjs')
    assert old_asset.status_code == 404
    assert old_asset.headers['Cache-Control'] == 'no-store'
    assert old_asset.get_json()['status'] == 'release_unavailable'
    assert client.get(f'/research-assets/{new}/app.mjs').status_code == 200


def test_adding_a_client_module_changes_the_release(client, release_files):
    directory, _, _ = release_files
    old = client.get('/api/research/version').get_json()['version']
    (directory / 'csv-client.mjs').write_text("export const client = 'new';", encoding='utf-8')
    new = client.get('/api/research/version').get_json()['version']
    assert new != old
    assert client.get(f'/research-assets/{new}/csv-client.mjs').data == b"export const client = 'new';"
    (directory / 'csv-client.mjs').unlink()
    assert client.get('/api/research/version').get_json()['version'] == old


def test_unknown_release_and_unlisted_or_traversing_paths_are_not_served(client, release_files):
    directory, _, _ = release_files
    (directory / 'private.txt').write_text('not public', encoding='utf-8')
    (directory / 'nested').mkdir()
    (directory / 'nested' / 'private.mjs').write_text('not public', encoding='utf-8')
    version = client.get('/api/research/version').get_json()['version']
    for path in (
        f'/research-assets/{"0" * 64}/app.mjs',
        '/research-assets/invalid/app.mjs',
        f'/research-assets/{version}/private.txt',
        f'/research-assets/{version}/absent.mjs',
        f'/research-assets/{version}/nested/private.mjs',
        f'/research-assets/{version}/../catalog.mjs',
        f'/research-assets/{version}/%2e%2e%2fconfig.py',
        f'/research-assets/{version}/%5cconfig.mjs',
    ):
        response = client.get(path)
        assert response.status_code == 404, path
        assert response.headers['Cache-Control'] == 'no-store', path
        assert b'not public' not in response.data


def test_non_asset_files_do_not_change_release_identity(client, release_files):
    directory, _, _ = release_files
    previous = client.get('/api/research/version').get_json()['version']
    (directory / 'notes.txt').write_text('not an asset', encoding='utf-8')
    assert client.get('/api/research/version').get_json()['version'] == previous
