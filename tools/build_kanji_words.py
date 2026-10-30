# Usage: python3 -I tools/build_kanji_words.py [--dry]
# Rebuilds the example words of each KANJI row in data.js. Each kanji gets up to 6 words that contain it:
# up to 3 from VOCAB's top 1000 (BCCWJ rank), then the words already there, then the other VOCAB words, then
# JMdict entries (shorter written forms first, since they tend to be the everyday ones). JMdict is read from the
# jamdict_data package's jamdict.db (EDRDG, CC BY-SA 4.0), which must be installed.
import json
import os
import sqlite3
import sys
import collections
import glob

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TOP, PER, MAX = 1000, 3, 6


def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ン' else c for c in s)


def reading_kind(reading, on, kun):
    """'on' or 'kun': which of the kanji's readings the word's reading seems to use (a rough match on the stems)."""
    rd = hira(reading)
    for stem in hira(on).replace('・', ' ').split():
        if stem.strip('-') and stem.strip('-') in rd:
            return 'on'
    return 'kun'


def load_kanji(lines):
    i = lines.index('const KANJI = [')
    end = next(j for j in range(i, len(lines)) if lines[j].startswith('].map('))
    return i, end, [json.loads(l.strip().rstrip(',')) for l in lines[i + 1:end] if l.startswith('  ["')]


def load_vocab(lines):
    rows = []
    for l in lines:
        if l.startswith('  ["') or l.startswith('["'):
            r = json.loads(l.strip().rstrip(','))
            if len(r) >= 6 and isinstance(r[4], list):
                rows.append(r)
    return rows


def jmdict(joyo):
    path = glob.glob(os.path.expanduser('~/.local/lib/python3*/site-packages/jamdict_data/jamdict.db'))[0]
    db = sqlite3.connect(path)
    entries = collections.defaultdict(set)  # kanji -> {(idseq, written form)}
    for idseq, text in db.execute('select idseq, text from Kanji'):
        for ch in set(text) & joyo:
            entries[ch].add((idseq, text))
    kana = {}
    for idseq, text in db.execute('select idseq, text from Kana order by ID'):
        kana.setdefault(idseq, text)
    sense = {}
    for sid, idseq in db.execute('select ID, idseq from Sense order by ID'):
        sense.setdefault(idseq, sid)
    gloss = {}
    for sid, lang, text in db.execute("select sid, lang, text from SenseGloss where lang='eng' order by rowid"):
        gloss.setdefault(sid, text)
    return entries, kana, sense, gloss


def main():
    path = os.path.join(ROOT, 'data.js')
    lines = open(path, encoding='utf-8').read().split('\n')
    i, end, rows = load_kanji(lines)
    vocab = load_vocab(lines[:i])
    joyo = {r[0] for r in rows}
    entries, kana, sense, gloss = jmdict(joyo)
    by = collections.defaultdict(list)  # kanji -> VOCAB words containing it
    for v in vocab:
        for ch in set(v[0]) & joyo:
            by[ch].append(v)
    out, stats = [], collections.Counter()
    for r in rows:
        ch, curated = r[0], r[5]
        mine = sorted(by[ch], key=lambda v: (v[5] == 0 or v[5] > TOP, v[5]))  # ranked top 1000 first, then by rank
        top = [v for v in mine if 0 < v[5] <= TOP][:PER]
        jm = sorted([(idseq, t) for idseq, t in entries[ch] if t != ch and len(t) <= 6 and idseq in kana and idseq in sense and sense[idseq] in gloss],
                    key=lambda e: (len(e[1]), len(gloss[sense[e[0]]]) > 30, e[0]))
        # Candidates in priority order: top 1000, the words already there, other VOCAB, then JMdict.
        pool = [[v[0], v[1], v[2]] for v in top] + curated + [[v[0], v[1], v[2]] for v in mine] \
            + [[t, kana[idseq], gloss[sense[idseq]]] for idseq, t in jm]
        words, seen, kinds = [], set(), set()
        def add(w):
            if w[0] not in seen and len(words) < MAX:
                seen.add(w[0]); words.append(w); kinds.add(reading_kind(w[1], r[2], r[3]))
        # First take a word for each reading kind (on and kun) the kanji has, then fill in priority order.
        pool = [w for w in pool if w[0] != ch]  # the kanji on its own is not an example word
        for w in pool:
            if reading_kind(w[1], r[2], r[3]) not in kinds: add(w)
        for w in pool: add(w)
        stats[min(len(words), 6)] += 1
        stats['top%d' % min(sum(1 for w in words if w[0] in {v[0] for v in top}), 3)] += 1
        out.append('  ' + json.dumps(r[:5] + [words], ensure_ascii=False, separators=(',', ':')) + ',')
    print('words per kanji (count of kanji):', {k: v for k, v in stats.items() if isinstance(k, int)})
    print('top-1000 words per kanji:', {k: v for k, v in stats.items() if isinstance(k, str)})
    if '--dry' not in sys.argv:
        lines[i + 1:end] = out
        open(path, 'w', encoding='utf-8').write('\n'.join(lines))
        print('wrote', path)


if __name__ == '__main__':
    main()
