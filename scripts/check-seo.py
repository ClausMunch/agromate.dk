#!/usr/bin/env python3
"""Check raw static metadata and crawler resources without executing JavaScript."""
import json
import re
import struct
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
ORIGIN = 'https://agromate.dk'

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.meta = {}
        self.links = []
        self.ids = set()
        self.structured = []
        self.json_buffer = None
        self.title = ''
        self.in_title = False
        self.feed(source)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'meta':
            key = attrs.get('property') or attrs.get('name')
            if key:
                assert key not in self.meta, f'Duplicate meta tag: {key}'
                self.meta[key] = attrs.get('content', '')
        if tag in ('a', 'link'):
            self.links.append(attrs)
        if tag == 'title':
            self.in_title = True
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.json_buffer = ''

    def handle_data(self, text):
        if self.json_buffer is not None:
            self.json_buffer += text
        if self.in_title:
            self.title += text

    def handle_endtag(self, tag):
        if tag == 'script' and self.json_buffer is not None:
            self.structured.append(json.loads(self.json_buffer))
            self.json_buffer = None
        if tag == 'title':
            self.in_title = False

pages = {name: Page((PUBLIC / name).read_text()) for name in ('index.html', 'about.html')}
image_path = None
for name, page in pages.items():
    expected = ORIGIN + ('/' if name == 'index.html' else '/about.html')
    canonical = [link['href'] for link in page.links if link.get('rel') == 'canonical']
    assert canonical == [expected], f'{name}: canonical URL'
    assert 20 <= len(page.title) <= 70, f'{name}: meaningful search title'
    for key in ('description', 'robots', 'og:type', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:type', 'og:image:width', 'og:image:height', 'og:image:alt', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt'):
        assert page.meta.get(key), f'{name}: missing {key}'
    assert page.meta['og:url'] == expected
    assert page.meta['og:title'] == page.title == page.meta['twitter:title']
    assert page.meta['description'] == page.meta['og:description'] == page.meta['twitter:description']
    assert 'noindex' not in page.meta['robots'] and 'nofollow' not in page.meta['robots']
    assert page.meta['twitter:card'] == 'summary_large_image'
    image = urlsplit(page.meta['og:image'])
    assert image.scheme == 'https' and image.netloc == 'agromate.dk'
    assert page.meta['twitter:image'] == image.geturl()
    image_path = image.path
    png = (PUBLIC / image.path.lstrip('/')).read_bytes()
    assert png[:8] == b'\x89PNG\r\n\x1a\n' and len(png) < 5_000_000
    assert struct.unpack('>II', png[16:24]) == (1200, 630)
    assert page.meta['og:image:width'] == '1200' and page.meta['og:image:height'] == '630'
    assert page.meta['og:image:type'] == 'image/png'
    assert len(page.structured) == 1
    graph = page.structured[0]
    assert graph['@context'] == 'https://schema.org'
    for entity in graph['@graph']:
        assert entity.get('@type') and entity.get('@id', '').startswith(ORIGIN)
        assert not any(key in entity for key in ('aggregateRating', 'review')), 'Do not invent ratings'
    for link in page.links:
        href = link.get('href', '')
        url = urlsplit(urljoin(expected, href))
        if url.scheme not in ('', 'https') or url.netloc not in ('', 'agromate.dk') or not url.path:
            continue
        target = url.path.lstrip('/') or 'index.html'
        assert (PUBLIC / target).is_file(), f'{name}: missing linked file {href}'
        if url.fragment and target in pages:
            assert url.fragment in pages[target].ids, f'{name}: missing anchor {href}'

entities = pages['index.html'].structured[0]['@graph']
game = next(item for item in entities if 'VideoGame' in item['@type'])
assert game['playMode'] == 'https://schema.org/SinglePlayer'
assert game['isAccessibleForFree'] is True and game['offers']['price'] == '0'
assert game['softwareHelp'] == ORIGIN + '/about.html#how-to-play'
assert {'about-agromate', 'contact'} <= pages['index.html'].ids
assert {'how-to-play', 'controls', 'crops', 'questions'} <= pages['about.html'].ids

robots_source = (PUBLIC / 'robots.txt').read_text()
robots = RobotFileParser()
robots.parse(robots_source.splitlines())
assert robots.site_maps() == [ORIGIN + '/sitemap.xml']
for agent in ('Googlebot', 'bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'Twitterbot', 'facebookexternalhit'):
    for route in ('/', '/about.html', image_path):
        assert robots.can_fetch(agent, ORIGIN + route), f'Crawler blocked: {agent} {route}'
sitemap = ET.parse(PUBLIC / 'sitemap.xml')
locations = [item.text for item in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
assert set(locations) == {ORIGIN + '/', ORIGIN + '/about.html'}
summary = (PUBLIC / 'llms.txt').read_text()
assert summary.startswith('# Agromate') and ORIGIN + '/about.html' in summary
for name in ('index.html', 'about.html', 'llms.txt'):
    assert 'agromate@codepoint.dev' not in (PUBLIC / name).read_text(), 'Do not expose contact email to crawlers'
print('PASS: raw HTML social metadata, canonical URLs, 1200×630 PNG, structured data, local links/anchors, robots, sitemap, factual AI summary, and contact obfuscation.')
