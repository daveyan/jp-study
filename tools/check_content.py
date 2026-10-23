#!/usr/bin/env python3
"""Check the markup in the app's example sentences.

Usage: python3 tools/check_content.py   (from the repo root)

Checks every vocab example (data.js) and grammar example (grammar-*.js):
  - {base|reading} and [highlight] markup is well formed and not nested wrongly
  - every kanji sits inside a ruby base, and readings are kana only
  - each vocab example highlights the word exactly once, in both its polite and casual versions
  - examples are [polite, translation] or [polite, translation, casual]
Prints a list of bases that appear with more than one reading, for a human to eyeball.
Exits non-zero if any error is found.
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KANJI = re.compile(r'[\u3400-\u4dbf\u4e00-\u9fff々]')
KANA = re.compile(r'^[\u3040-\u309f\u30a0-\u30ffー]+$')

errors = []
readings = defaultdict(set)


def parse(s, where):
    """Return (plain text, list of highlighted plain texts); record errors."""
    plain, highlights, cur = [], [], None
    i = 0
    while i < len(s):
        c = s[i]
        if c == '{':
            j = s.find('}', i)
            if j < 0:
                errors.append(f'{where}: unclosed {{ in {s}')
                return ''.join(plain), highlights
            body = s[i + 1:j]
            if body.count('|') != 1 or '{' in body or '[' in body or ']' in body:
                errors.append(f'{where}: bad ruby {{{body}}} in {s}')
            else:
                base, rd = body.split('|')
                if not KANJI.search(base):
                    errors.append(f'{where}: ruby base without kanji {{{body}}} in {s}')
                if not KANA.match(rd):
                    errors.append(f'{where}: reading is not kana {{{body}}} in {s}')
                readings[base].add(rd)
                plain.append(base)
                if cur is not None:
                    cur.append(base)
            i = j + 1
            continue
        if c == '[':
            if cur is not None:
                errors.append(f'{where}: nested [ in {s}')
            cur = []
        elif c == ']':
            if cur is None:
                errors.append(f'{where}: stray ] in {s}')
            else:
                highlights.append(''.join(cur))
                cur = None
        elif c in '}|':
            errors.append(f'{where}: stray {c} in {s}')
        else:
            if KANJI.match(c):
                errors.append(f'{where}: kanji {c} without a reading in {s}')
            plain.append(c)
            if cur is not None:
                cur.append(c)
        i += 1
    if cur is not None:
        errors.append(f'{where}: unclosed [ in {s}')
    return ''.join(plain), highlights


def stem(word):
    """Leading part of a word that every inflected form shares."""
    m = re.match(r'^(.*[\u4e00-\u9fff々])', word)
    if m:
        return m.group(1)
    return word[:-1] if len(word) >= 2 else word


# Irregular verbs whose conjugated forms don't start with the dictionary form's stem.
IRREGULAR = {'する': ['し', 'さ', 'せ'], 'ある': ['ない', 'なかっ', 'なく', 'なけれ']}


def check_vocab():
    text = (ROOT / 'data.js').read_text(encoding='utf-8')
    block = text[text.index('const VOCAB = ['):text.index('].map(r=>({id:\'v:\'')]
    n = 0
    seen_words = set()
    for line in block.splitlines():
        line = line.strip().rstrip(',')
        if not line.startswith('["'):
            continue
        row = json.loads(line)
        if len(row) != 6 or not isinstance(row[5], int):
            errors.append(f'vocab row should be [jp, kana, en, group, examples, rank]: {line[:60]}')
            continue
        jp, kana, en, tag, exs, _rank = row
        if jp in seen_words:
            errors.append(f'vocab {jp}: duplicate written form (ids must be unique)')
        seen_words.add(jp)
        # Counters and suffixes (～本) only need to appear inside the highlight; readings may list alternatives (じゅう・とお).
        # Single-kanji words (三, 千, 目) also often sit inside a compound (三千, 二つ目).
        affix = jp.startswith('～') or (len(jp) == 1 and bool(KANJI.match(jp)))
        forms = [jp.lstrip('～')] + kana.split('・')
        forms += IRREGULAR.get(jp, [])
        n += 1
        if len(exs) < 2:
            errors.append(f'vocab {jp}: only {len(exs)} example(s)')
        for ex in exs:
            if len(ex) not in (2, 3):
                errors.append(f'vocab {jp}: example should have 2 or 3 strings: {ex}')
                continue
            t = ex[1]
            for s in ex[::2]:
                plain, hl = parse(s, f'vocab {jp}')
                if len(hl) != 1:
                    errors.append(f'vocab {jp}: {len(hl)} highlights in {s}')
                elif not (any(f in hl[0] for f in forms) if affix else any(hl[0].startswith(stem(f)) for f in forms)):
                    errors.append(f'vocab {jp}: highlight "{hl[0]}" does not look like the word in {s}')
            if not t.strip():
                errors.append(f'vocab {jp}: empty translation for {ex[0]}')
    return n


def check_grammar():
    lessons = sentences = 0
    for path in sorted(ROOT.glob('grammar-*.js')):
        text = path.read_text(encoding='utf-8')
        for m in re.finditer(r"\{id:'([^']+)'.*?\bex:\[(.*?)\],\s*quiz:\[", text, re.S):
            lid, body = m.group(1), m.group(2)
            lessons += 1
            try:
                exs = json.loads('[' + body + ']')
            except ValueError as e:
                errors.append(f'{lid}: ex is not a list of double-quoted strings ({e})')
                continue
            for ex in exs:
                if len(ex) not in (2, 3):
                    errors.append(f'{lid}: example should have 2 or 3 strings: {ex}')
                    continue
                sentences += 1
                t = ex[1]
                for s in ex[::2]:
                    parse(s, lid)
                if not t.strip() or KANJI.search(t):
                    errors.append(f'{lid}: translation looks wrong: {t!r} for {ex[0]}')
    return lessons, sentences


nv = check_vocab()
nl, ns = check_grammar()
print(f'{nv} vocab words, {nl} grammar lessons, {ns} grammar sentences')
multi = {b: r for b, r in readings.items() if len(r) > 1}
if multi:
    print('Bases with more than one reading (check these are intended):')
    for b, r in sorted(multi.items()):
        print(f'  {b}: {", ".join(sorted(r))}')
if errors:
    print(f'\n{len(errors)} error(s):')
    for e in errors:
        print('  ' + e)
    sys.exit(1)
print('OK')
