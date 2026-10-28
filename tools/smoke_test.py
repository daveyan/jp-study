#!/usr/bin/env python3
"""Smoke test: drives the app in headless Chromium, the way CLAUDE.md's checklist describes.

Usage: python3 tools/smoke_test.py   (needs `pip install playwright` and `playwright install chromium`)

Serves the repo under /jp-study/ (a subpath, as on GitHub Pages) and checks that:
  - the app loads with no console or page errors
  - Learn new opens a reading feed, which can be read to the end
  - the feed's progress is saved to localStorage and survives a reload unchanged
  - a vocab feed opens, and tapping a word in a sentence opens the lookup sheet
  - the Kanji tab lists its kanji, the Vocab tab has an N3 chip, and a grammar lesson page opens
  - the brand returns to Today from there
Exits non-zero on the first failed check.
"""
import functools
import http.server
import json
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PREFIX = '/jp-study'
KEY = 'jp-study.progress.v1'
MAX_PRESSES = 600  # a 10-sentence feed needs about 20 presses; this is a safety cap


class Handler(http.server.SimpleHTTPRequestHandler):
    """Serves the repo folder under PREFIX, so every path is tested as a subpath."""

    def translate_path(self, path):
        path = path[len(PREFIX):] if path.startswith(PREFIX) else path
        return super().translate_path(path)

    def log_message(self, *args):
        pass


def check(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg)
    if not cond:
        sys.exit(1)


def serve():
    handler = functools.partial(Handler, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}{PREFIX}/index.html'


def saved(page):
    raw = page.evaluate(f'localStorage.getItem("{KEY}")')
    return json.loads(raw) if raw else None


def read_to_end(page):
    """Press Space until the feed's end screen appears. Returns the number of presses."""
    for n in range(1, MAX_PRESSES + 1):
        if page.locator('.panel.done').count():
            return n
        page.keyboard.press('Space')
        page.wait_for_timeout(20)
    return -1


def main():
    srv, url = serve()
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))

        page.goto(url)
        page.wait_for_selector('.hero')
        check(True, 'Today tab renders from a subpath')

        learn = page.locator('[data-act="learn"][data-arg="vocab"]').first
        check(learn.is_enabled(), 'Learn new is enabled on a fresh profile')
        learn.click()
        page.wait_for_selector('.sess-head')
        presses = read_to_end(page)
        check(presses > 0, f'Learn new feed is read to its end screen ({presses} presses)')
        page.get_by_text('sentences read').wait_for()

        state = saved(page)
        check(state is not None and len(state.get('log', [])) > 0, 'reading writes to the activity log')
        check(bool(state and state.get('cards')), 'reading new words creates review cards')
        before = json.dumps(state, sort_keys=True)

        page.reload()
        page.wait_for_selector('.hero')
        check(json.dumps(saved(page), sort_keys=True) == before, 'progress survives a reload unchanged')

        page.locator('[data-act="tab"][data-arg="vocab"]').click()
        page.locator('[data-act="readVocab"]').first.click()
        page.wait_for_selector('.sess-head')
        page.locator('.lk').first.click()
        page.wait_for_selector('#lk-sheet .lk-sheet-in')
        check(True, 'tapping a word in a feed sentence opens the lookup sheet')
        page.keyboard.press('Escape')
        page.locator('[data-act="readExit"]').first.click()

        page.locator('[data-act="tab"][data-arg="kanji"]').click()
        page.wait_for_selector('.kgrid')
        check(page.locator('.kgrid > *').count() > 200, 'the Kanji tab lists the N5 and N4 kanji')

        page.locator('[data-act="tab"][data-arg="vocab"]').click()
        check(page.locator('[data-act="vlv"][data-arg="N3"]').count() == 1, 'the Vocab tab has an N3 filter chip')

        page.locator('[data-act="tab"][data-arg="grammar"]').click()
        page.locator('[data-act="gopen"]').first.click()
        page.wait_for_timeout(100)
        check(page.locator('.lesson-page, .lesson, h1').count() > 0, 'a grammar lesson page opens')

        page.locator('.brand').click()
        page.wait_for_selector('.hero')
        check(True, 'the brand returns to Today from a lesson page')

        check(not errors, 'no console or page errors' + (': ' + '; '.join(errors[:5]) if errors else ''))
        browser.close()
    srv.shutdown()
    print('all checks passed')


if __name__ == '__main__':
    main()
