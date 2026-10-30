"""Keep user-facing help links connected to a directly served guide."""
from html.parser import HTMLParser
from urllib.parse import urlsplit

import pytest

from src.app import app


class PageLinks(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.ids = set()
        self.links = []
        self.styles = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get('id'):
            self.ids.add(values['id'])
        if tag == 'a' and values.get('href'):
            self.links.append(values['href'])
        if tag == 'link' and values.get('rel') == 'stylesheet':
            self.styles.append(values['href'])


@pytest.mark.parametrize('path', ['/research/guide', '/research/guide/'])
def test_guide_and_workspace_help_links_resolve(path):
    with app.test_client() as client:
        response = client.get(path)
        assert response.status_code == 200
        assert response.mimetype == 'text/html'
        assert response.headers['Cache-Control'] == 'no-store'
        guide = PageLinks(response.get_data(as_text=True))
        workspace = PageLinks(client.get('/research').get_data(as_text=True))
        destinations = [urlsplit(link) for link in workspace.links]
        help_links = [link for link in destinations if link.path.rstrip('/') == '/research/guide']
        assert help_links, 'The workspace must expose its explanatory guide.'
        assert all(not link.fragment or link.fragment in guide.ids for link in help_links)
        assert all(link[1:] in guide.ids for link in guide.links if link.startswith('#'))
        version = client.get('/api/research/version').get_json()['version']
        stylesheet = f'/research-assets/{version}/research.css'
        assert stylesheet in guide.styles
        assert client.get(stylesheet).status_code == 200
