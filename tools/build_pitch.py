# Usage: python3 -I tools/build_pitch.py accents.txt  -- adds pitch accent for vocab words missing from pitch.js.
# accents.txt is Kanjium's data/source_files/raw/accents.txt (word, reading, downsteps; CC BY-SA 4.0).
# Entries already in pitch.js are kept as they are; MANUAL always wins. Counters (～本) are skipped, and words with
# no entry (most loanwords, phrases like 役に立つ) are left out rather than guessed. Prints the words it couldn't match.
import collections
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# Values copied from accents.txt. Kana-written words are listed there under a kanji spelling (こと = 事, ひげ = 髭);
# a する verb or お-word takes its noun's accent when that noun is flat or the verb adds nothing (けが 2 -> けがする 2).
# Some entries give an accent per part of speech, e.g. 多分 (名)0,(副)1; these keep the one for the sense taught here.
MANUAL = {'こと': [['こと', [2]]], 'ため': [['ため', [2]]], 'わけ': [['わけ', [1]]], 'こう': [['こう', [0, 1]]],
          'そう': [['そう', [0, 1]]], 'やめる': [['やめる', [0]]], 'いっぱい': [['いっぱい', [0]]], 'ごみ': [['ごみ', [2]]],
          'すり': [['すり', [1]]], 'とうとう': [['とうとう', [1]]], 'ぶどう': [['ぶどう', [0]]], 'ひげ': [['ひげ', [0]]],
          'けんかする': [['けんかする', [0]]], 'けがする': [['けがする', [2]]], 'チェックする': [['チェックする', [1]]],
          'お見舞い': [['おみまい', [0]]],
          '多分': [['たぶん', [1]]], '大事': [['だいじ', [0, 3]]], '大体': [['だいたい', [0]]], '結構': [['けっこう', [1]]],
          '遠く': [['とおく', [3, 0]]], '都合': [['つごう', [0]]]}


def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)


byword = collections.defaultdict(list)
byread = collections.defaultdict(list)
for line in open(sys.argv[1], encoding='utf-8'):
    p = line.rstrip('\n').split('\t')
    if len(p) < 3:
        continue
    w, r, a = p[0], p[1] or p[0], p[2]
    byword[w].append((hira(r), a))
    byread[hira(r)].append((w, a))

ppath = os.path.join(ROOT, 'pitch.js')
ptext = open(ppath, encoding='utf-8').read()
head = ptext[:ptext.index('const PITCH = {')]
res = {k: v for k, v in re.findall(r'^("v:[^"]+"):(\[.*\]),?$', ptext, re.M)}
res = {json.loads(k): json.loads(v) for k, v in res.items()}

s = open(os.path.join(ROOT, 'data.js'), encoding='utf-8').read()
block = s[s.index('const VOCAB'):s.index('const KANJI')]
rows = [json.loads(l.strip().rstrip(',')) for l in block.split('\n') if l.startswith('  ["')]
added, miss = 0, []
for row in rows:
    jp, kana = row[0], row[1]
    key = 'v:' + jp
    if jp in MANUAL:
        res[key] = MANUAL[jp]
        added += 1
        continue
    if jp.startswith('～') or key in res:
        continue
    out = []
    for k in kana.split('・'):
        hk, got = hira(k), None
        for rr, a in byword.get(jp, []):
            if rr == hk:
                got = a
                break
        if got is None and jp == kana:
            c = [a for w, a in byread.get(hk, []) if hira(w) == hk or w == k]
            if c:
                got = c[0]
        if got is None:
            c = byread.get(hk, [])
            if c and len(set(a for w, a in c)) == 1:
                got = c[0][1]
        if got is not None:
            out.append([k, list(dict.fromkeys(int(x) for x in re.findall(r'\d+', got)))])
    if out:
        res[key] = out
        added += 1
    else:
        miss.append((jp, kana))

body = ',\n'.join(json.dumps(k, ensure_ascii=False) + ':' + json.dumps(v, ensure_ascii=False, separators=(',', ':'))
                  for k, v in sorted(res.items()))
open(ppath, 'w', encoding='utf-8').write(head + 'const PITCH = {\n' + body + '\n};\n')
print('added', added, 'total', len(res))
print('missing', miss)
