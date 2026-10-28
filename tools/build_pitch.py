# Usage: python3 -I tools/build_pitch.py  -- adds pitch accent for vocab words missing from pitch.js.
# Reads tools/kanjium/accents.txt (Kanjium's accent data, CC BY-SA 4.0; see the README there), or a path given as
# the first argument. Entries already in pitch.js are kept as they are; MANUAL and WIKTIONARY always win. Counters (～本) are skipped, and words with
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
# Guesses, not from a dictionary: none of Kanjium, Wiktionary or the pages checked give an accent for these.
# Check them against a dictionary when one is to hand.
GUESSED = {'じゃあ': [['じゃあ', [1]]], 'それで': [['それで', [1]]], 'それに': [['それに', [0]]],
           'お金持ち': [['おかねもち', [3]]], 'もうすぐ': [['もうすぐ', [0]]]}
MANUAL = {'こと': [['こと', [2]]], 'ため': [['ため', [2]]], 'わけ': [['わけ', [1]]], 'こう': [['こう', [0, 1]]],
          'そう': [['そう', [0, 1]]], 'やめる': [['やめる', [0]]], 'いっぱい': [['いっぱい', [0]]], 'ごみ': [['ごみ', [2]]],
          'すり': [['すり', [1]]], 'とうとう': [['とうとう', [1]]], 'ぶどう': [['ぶどう', [0]]], 'ひげ': [['ひげ', [0]]],
          'けんかする': [['けんかする', [0]]], 'けがする': [['けがする', [2]]], 'チェックする': [['チェックする', [1]]],
          'お見舞い': [['おみまい', [0]]],
          '多分': [['たぶん', [1]]], '大事': [['だいじ', [0, 3]]], '大体': [['だいたい', [0]]], '結構': [['けっこう', [1]]],
          '遠く': [['とおく', [3, 0]]], '都合': [['つごう', [0]]]}

# Words Kanjium lacks, from English Wiktionary's {{ja-pron}} accents (CC BY-SA 4.0), with the dictionaries it cites
# (NHK, DJR = Daijirin, SMK = Shin Meikai; none listed = uncited). For words with several etymologies, the value is
# the one for the sense taught here. びっくりする takes the accent of びっくり, as けがする does in MANUAL.
# Left out: じゃあ, それで, それに (pages give no accent) and お金持ち, もうすぐ (no page).
# 役に立つ is two accent phrases, やく 2 + particle に + たつ 1, so its reading splits them with a space and its
# downstep is a list with one number per phrase.
WIKTIONARY = {'グラム': [['グラム', [1, 0]]],  # gram (unit): acc=1 SMK8,DJR4,NHK; acc2=0 SMK8,DJS2
              'ワイシャツ': [['ワイシャツ', [0]]],  # DJR,NHK,SMK5
              'アメリカ': [['アメリカ', [0]]],  # NHK,SMK7
              'アフリカ': [['アフリカ', [0]]],  # SMK5
              'そして': [['そして', [0]]],  # NHK
              'それから': [['それから', [0]]],  # DJR
              'それでは': [['それでは', [3]]],  # DJR,NHK16,SMK8
              'いいえ': [['いいえ', [3]]],  # DJR,SMK2
              'さっき': [['さっき', [1]]],
              'びっくりする': [['びっくりする', [3]]],  # びっくり: DJR
              'ご主人': [['ごしゅじん', [2]]],
              '会議室': [['かいぎしつ', [3]]],  # NHK16
              'ごらんになる': [['ごらんになる', [5]]],  # page ご覧になる
              'できるだけ': [['できるだけ', [0]]],  # page 出来るだけ: NHK
              '役に立つ': [['やくに たつ', [[2, 1]]]]}  # acc=やく+に+たつ 2+p+1
MANUAL.update(WIKTIONARY)
MANUAL.update(GUESSED)


def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)


byword = collections.defaultdict(list)
byread = collections.defaultdict(list)
for line in open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'tools', 'kanjium', 'accents.txt'),
                 encoding='utf-8'):
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
