# Usage: python3 -I tools/tag_kanji_levels.py [--dry]
# Adds a JLPT level as the seventh field of each KANJI row in data.js (the row's words are kept as they are).
# The first 56 rows are N5 and the next 177 are N4, in the order the list was built. The rest use KANJIDIC2's
# pre-2010 JLPT levels from jamdict.db (EDRDG, CC BY-SA 4.0): old 4 and 3 become N3, old 2 becomes N2, old 1 and
# kanji with no level become N1. Those are approximations: the current N3 to N1 lists are not in the repo.
import glob
import json
import os
import sqlite3
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
N5, N4 = 56, 177
OLD = {'4': 'N3', '3': 'N3', '2': 'N2', '1': 'N1'}


def main():
    path = os.path.join(ROOT, 'data.js')
    lines = open(path, encoding='utf-8').read().split('\n')
    i = lines.index('const KANJI = [')
    db = sqlite3.connect(glob.glob(os.path.expanduser('~/.local/lib/python3*/site-packages/jamdict_data/jamdict.db'))[0])
    old = dict(db.execute('select literal, jlpt from character'))
    idx = [j for j in range(i + 1, len(lines)) if lines[j].startswith('  ["')]
    counts = {}
    for n, j in enumerate(idx):
        r = json.loads(lines[j].strip().rstrip(','))
        if n < N5:
            lv = 'N5'
        elif n < N5 + N4:
            lv = 'N4'
        else:
            lv = OLD.get(str(old.get(r[0])), 'N1')
        counts[lv] = counts.get(lv, 0) + 1
        lines[j] = '  ' + json.dumps(r[:6] + [lv], ensure_ascii=False, separators=(',', ':')) + ','
    print('levels:', counts)
    if '--dry' not in sys.argv:
        open(path, 'w', encoding='utf-8').write('\n'.join(lines))
        print('wrote', path)


if __name__ == '__main__':
    main()
