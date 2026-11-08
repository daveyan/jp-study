# Usage: python3 -I tools/tag_kanji_levels.py [--dry]
# Orders the KANJI rows in data.js and sets a JLPT level as the seventh field of each row (the row's words are kept).
# The levels come from JLPT Sensei's N5, N4 and N3 kanji lists (tools/kanji_sensei.json): the N5 kanji come first, then
# N4, then N3, each in Sensei's order, then the rest in their existing order. A kanji on more than one list keeps the
# lower level. Kanji on none of the three lists are N2 (old KANJIDIC2 levels 2, 3 and 4) or N1 (the rest); those are
# approximations, since the current N2 and N1 lists are not in the repo.
import glob
import json
import os
import sqlite3
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def sensei_levels():
    lists = json.load(open(os.path.join(ROOT, 'tools', 'kanji_sensei.json'), encoding='utf-8'))
    order, level = [], {}
    for lv in ['N5', 'N4', 'N3']:
        for ch in lists[lv]:
            if ch not in level:
                level[ch] = lv
                order.append(ch)
    return order, level


def main():
    path = os.path.join(ROOT, 'data.js')
    lines = open(path, encoding='utf-8').read().split('\n')
    i = lines.index('const KANJI = [')
    db = sqlite3.connect(glob.glob(os.path.expanduser('~/.local/lib/python3*/site-packages/jamdict_data/jamdict.db'))[0])
    old = dict(db.execute('select literal, jlpt from character'))
    idx = [j for j in range(i + 1, len(lines)) if lines[j].startswith('  ["')]
    rows = [json.loads(lines[j].strip().rstrip(',')) for j in idx]
    order, level = sensei_levels()
    by_ch = {r[0]: r for r in rows}
    assert len(by_ch) == len(rows), 'duplicate kanji rows'
    missing = [c for c in order if c not in by_ch]
    assert not missing, 'Sensei kanji with no KANJI row: ' + ''.join(missing)
    rest = [r for r in rows if r[0] not in level]
    counts = {}
    out = []
    for ch in order:
        out.append((by_ch[ch], level[ch]))
    for r in rest:
        lv = 'N1' if str(old.get(r[0])) in ('1', 'None') else 'N2'
        out.append((r, lv))
    for r, lv in out:
        counts[lv] = counts.get(lv, 0) + 1
    print('levels:', counts)
    new = [('  ' + json.dumps(r[:6] + [lv], ensure_ascii=False, separators=(',', ':')) + ',') for r, lv in out]
    if '--dry' not in sys.argv:
        lines[idx[0]:idx[-1] + 1] = new
        open(path, 'w', encoding='utf-8').write('\n'.join(lines))
        print('wrote', path)


if __name__ == '__main__':
    main()
